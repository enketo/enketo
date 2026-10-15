/* eslint-disable no-bitwise */
import referenceFixWebmDuration from 'fix-webm-duration';
import fixWebmDuration from '../../src/js/audio-recorder/webm-duration';

const UNKNOWN_SIZE = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

/**
 * Builds an EBML element with a 1-byte size.
 *
 * @param {Array<number>} id - The element ID bytes
 * @param {Array<number>} data - The element data bytes
 * @return {Array<number>} The element bytes
 */
const element = (id, data) => [...id, 0x80 | data.length, ...data];

const float64 = (value) => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value);

    return [...bytes];
};

const EBML_HEADER = element(
    [0x1a, 0x45, 0xdf, 0xa3],
    element(
        [0x42, 0x82],
        [...'webm'].map((c) => c.charCodeAt(0))
    )
);
const TIMECODE_SCALE = element([0x2a, 0xd7, 0xb1], [0x0f, 0x42, 0x40]); // 1000000
const MUXING_APP = element([0x4d, 0x80], [0x41, 0x42]);
const TRACKS = element(
    [0x16, 0x54, 0xae, 0x6b],
    element([0xae], [0xd7, 0x81, 0x01])
);
// Timecode and SimpleBlock children, with unknown size like MediaRecorder writes
const CLUSTER = [
    0x1f,
    0x43,
    0xb6,
    0x75,
    ...UNKNOWN_SIZE,
    0xe7,
    0x81,
    0x00,
    0xa3,
    0x84,
    1,
    2,
    3,
    4,
];

const info = (...children) =>
    element([0x15, 0x49, 0xa9, 0x66], children.flat());

const webm = (segmentChildren, segmentSize = UNKNOWN_SIZE) =>
    new Blob(
        [
            new Uint8Array([
                ...EBML_HEADER,
                0x18,
                0x53,
                0x80,
                0x67,
                ...segmentSize,
                ...segmentChildren.flat(),
            ]),
        ],
        { type: 'audio/webm' }
    );

const bytesOf = async (blob) => [...new Uint8Array(await blob.arrayBuffer())];

/**
 * Reads the Duration from a file built with the helpers above.
 *
 * @param {Array<number>} bytes - The file bytes
 * @return {number|undefined} The duration
 */
const findDuration = (bytes) => {
    for (let i = 0; i <= bytes.length - 11; i++) {
        if (
            bytes[i] === 0x44 &&
            bytes[i + 1] === 0x89 &&
            bytes[i + 2] === 0x88
        ) {
            return new DataView(
                new Uint8Array(bytes.slice(i + 3, i + 11)).buffer
            ).getFloat64(0);
        }
    }

    return undefined;
};

describe('fixWebmDuration', () => {
    it('adds the duration to the Info element of a Segment with unknown size', async () => {
        const blob = webm([info(TIMECODE_SCALE, MUXING_APP), TRACKS, CLUSTER]);
        const fixed = await fixWebmDuration(blob, 61500);
        const bytes = await bytesOf(fixed);

        expect(fixed.type).to.equal('audio/webm');
        expect(findDuration(bytes)).to.equal(61500);

        const infoStart = EBML_HEADER.length + 12;
        const infoContent = [...TIMECODE_SCALE, ...MUXING_APP];
        // Info is rewritten with an 8-byte size that includes the new Duration element
        expect(bytes.slice(infoStart, infoStart + 12)).to.deep.equal([
            0x15,
            0x49,
            0xa9,
            0x66,
            0x01,
            0,
            0,
            0,
            0,
            0,
            0,
            infoContent.length + 11,
        ]);
        // Segment size remains unknown
        expect(
            bytes.slice(EBML_HEADER.length + 4, EBML_HEADER.length + 12)
        ).to.deep.equal(UNKNOWN_SIZE);
        // Everything after Info is preserved
        expect(bytes.slice(-(TRACKS.length + CLUSTER.length))).to.deep.equal([
            ...TRACKS,
            ...CLUSTER,
        ]);
    });

    it('converts the duration according to the TimecodeScale', async () => {
        const halfScale = element([0x2a, 0xd7, 0xb1], [0x07, 0xa1, 0x20]); // 500000
        const fixed = await fixWebmDuration(
            webm([info(halfScale), CLUSTER]),
            1000
        );
        expect(findDuration(await bytesOf(fixed))).to.equal(2000);

        const fixedMs = await fixWebmDuration(
            webm([info(TIMECODE_SCALE), CLUSTER]),
            1000
        );
        expect(findDuration(await bytesOf(fixedMs))).to.equal(1000);
    });

    it('updates a known Segment size', async () => {
        const children = [info(TIMECODE_SCALE), TRACKS];
        const size = children.flat().length;
        const blob = webm(children, [0x01, 0, 0, 0, 0, 0, 0, size]);
        const bytes = await bytesOf(await fixWebmDuration(blob, 1000));

        const segmentSizeStart = EBML_HEADER.length + 4;
        // 7 more bytes for the Info size, 11 for the Duration element
        expect(
            bytes.slice(segmentSizeStart, segmentSizeStart + 8)
        ).to.deep.equal([0x01, 0, 0, 0, 0, 0, 0, size + 18]);
        expect(bytes.length - segmentSizeStart - 8).to.equal(size + 18);
    });

    it('overwrites an empty duration in place', async () => {
        const emptyDuration = element([0x44, 0x89], float64(0));
        const blob = webm([info(TIMECODE_SCALE, emptyDuration), CLUSTER]);
        const fixed = await fixWebmDuration(blob, 4200);
        const bytes = await bytesOf(fixed);

        expect(fixed.size).to.equal(blob.size);
        expect(findDuration(bytes)).to.equal(4200);
    });

    it('returns the same blob if it already has a duration', async () => {
        const duration = element([0x44, 0x89], float64(1234));
        const blob = webm([info(TIMECODE_SCALE, duration), CLUSTER]);

        expect(await fixWebmDuration(blob, 4200)).to.equal(blob);
    });

    it('returns the same blob if there is a SeekHead', async () => {
        const seekHead = element([0x11, 0x4d, 0x9b, 0x74], []);
        const blob = webm([seekHead, info(TIMECODE_SCALE), CLUSTER]);

        expect(await fixWebmDuration(blob, 4200)).to.equal(blob);
    });

    it('returns the same blob if it is not a WebM file', async () => {
        const blob = new Blob(['not a webm file'], { type: 'audio/webm' });

        expect(await fixWebmDuration(blob, 4200)).to.equal(blob);
    });

    it('returns the same blob if it is empty', async () => {
        const blob = new Blob([], { type: 'audio/webm' });

        expect(await fixWebmDuration(blob, 4200)).to.equal(blob);
    });

    /**
     * `fix-webm-duration` was used before. It parses and rewrites the whole file,
     * so it isn't suitable for long recordings, but it is the reference for the
     * expected output: both must produce the same elements with the same data.
     *
     * Only the encoding of container sizes may differ: this implementation keeps
     * the unknown Segment and Cluster sizes written by MediaRecorder, and uses
     * 8-byte Info sizes. `fix-webm-duration` rewrites them as known sizes.
     */
    describe('produces the same result as fix-webm-duration', () => {
        const SEGMENT = [0x18, 0x53, 0x80, 0x67].join();
        const CLUSTER_ID = [0x1f, 0x43, 0xb6, 0x75].join();

        const readVint = (bytes, offset) => {
            if (offset >= bytes.length || bytes[offset] === 0) {
                throw new Error(`Invalid EBML integer at ${offset}`);
            }
            let length = 1;
            while (!(bytes[offset] & (0x100 >> length))) length += 1;
            let value = bytes[offset] & (0xff >> length);
            for (let i = 1; i < length; i += 1) {
                value = value * 256 + bytes[offset + i];
            }

            return { value, length };
        };

        /**
         * Lists the EBML elements of a file as `id:data` entries, walking into
         * Segment and Cluster elements without taking their sizes into account.
         *
         * @param {Array<number>} bytes - The file bytes
         * @return {Array<string>} The elements
         */
        const elements = (bytes) => {
            const list = [];
            let offset = 0;
            while (offset < bytes.length) {
                const idLength = readVint(bytes, offset).length;
                const id = bytes.slice(offset, offset + idLength).join();
                const size = readVint(bytes, offset + idLength);
                const dataStart = offset + idLength + size.length;
                if (id === SEGMENT || id === CLUSTER_ID) {
                    list.push(id);
                    offset = dataStart;
                } else {
                    const dataEnd = dataStart + size.value;
                    if (dataEnd > bytes.length) {
                        throw new Error(`Element ${id} exceeds the file`);
                    }
                    list.push(
                        `${id}:${bytes.slice(dataStart, dataEnd).join()}`
                    );
                    offset = dataEnd;
                }
            }

            return list;
        };

        const expectSameResult = async (blob, durationMs) => {
            const actual = await fixWebmDuration(blob, durationMs);
            const expected = await referenceFixWebmDuration(blob, durationMs, {
                logger: false,
            });

            expect(actual).not.to.equal(blob);
            expect(elements(await bytesOf(actual))).to.deep.equal(
                elements(await bytesOf(expected))
            );
            expect(findDuration(await bytesOf(actual))).to.equal(durationMs);
        };

        it('for a Segment with unknown size', async () => {
            await expectSameResult(
                webm([info(TIMECODE_SCALE, MUXING_APP), TRACKS, CLUSTER]),
                61500
            );
        });

        it('for a Segment with known size', async () => {
            const children = [info(TIMECODE_SCALE, MUXING_APP), TRACKS];
            await expectSameResult(
                webm(children, [
                    0x01,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    children.flat().length,
                ]),
                1000
            );
        });

        it('for an empty Duration', async () => {
            const emptyDuration = element([0x44, 0x89], float64(0));
            await expectSameResult(
                webm([info(TIMECODE_SCALE, emptyDuration), TRACKS, CLUSTER]),
                4200
            );
        });

        it('for a file recorded by MediaRecorder', async function () {
            this.timeout(10000);

            const audioContext = new AudioContext();
            // resume() doesn't settle while the browser blocks audio
            await Promise.race([
                audioContext.resume(),
                new Promise((resolve) => {
                    setTimeout(resolve, 500);
                }),
            ]);
            if (audioContext.state !== 'running') {
                // The browser blocks audio without a user gesture
                await audioContext.close();
                this.skip();
            }

            const oscillator = audioContext.createOscillator();
            const destination = audioContext.createMediaStreamDestination();
            oscillator.connect(destination);
            oscillator.start();

            const recorder = new MediaRecorder(destination.stream, {
                mimeType: 'audio/webm',
            });
            const chunks = [];
            recorder.ondataavailable = (event) => chunks.push(event.data);
            recorder.start(200);
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
            await new Promise((resolve) => {
                recorder.onstop = resolve;
                recorder.stop();
            });
            oscillator.stop();
            await audioContext.close();

            await expectSameResult(
                new Blob(chunks, { type: recorder.mimeType }),
                1000
            );
        });
    });
});

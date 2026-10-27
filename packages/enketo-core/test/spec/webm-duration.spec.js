/* eslint-disable no-bitwise */
import fixWebmDuration from '../../src/js/audio-recorder/webm-duration';

const EBML_ID = [0x1a, 0x45, 0xdf, 0xa3];
const SEGMENT_ID = [0x18, 0x53, 0x80, 0x67];
const INFO_ID = [0x15, 0x49, 0xa9, 0x66];
const TRACKS_ID = [0x16, 0x54, 0xae, 0x6b];
const CLUSTER_ID = [0x1f, 0x43, 0xb6, 0x75];
const UNKNOWN_SIZE = [0x01, ...Array(7).fill(0xff)];

/**
 * Builds an EBML element with a 1-byte size.
 *
 * @param {Array<number>} id - The element ID bytes
 * @param {Array<number>} data - The element data bytes
 * @return {Array<number>} The element bytes
 */
const element = (id, data) => [...id, 0x80 | data.length, ...data];

const size8 = (value) => [0x01, 0, 0, 0, 0, 0, 0, value];

const float64 = (value) => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value);

    return [...bytes];
};

const bytesOf = async (blob) => [...new Uint8Array(await blob.arrayBuffer())];

describe('fixWebmDuration', () => {
    it('adds the duration to the header and keeps the rest of the file intact', async () => {
        const ebmlHeader = element(EBML_ID, element([0x42, 0x82], [0x77]));
        // Segment and Cluster of unknown size, like MediaRecorder writes them
        const segmentHeader = [...SEGMENT_ID, ...UNKNOWN_SIZE];
        const timecodeScale = element([0x2a, 0xd7, 0xb1], [0x0f, 0x42, 0x40]); // 1ms
        // Tracks and audio, larger than the part of the file that is read
        const audio = Array.from({ length: 200 * 1024 }, (_, i) => i % 256);
        const rest = [
            ...element(TRACKS_ID, element([0xae], [0xd7, 0x81, 0x01])),
            ...CLUSTER_ID,
            ...UNKNOWN_SIZE,
            ...audio,
        ];
        const original = [
            ...ebmlHeader,
            ...segmentHeader,
            ...element(INFO_ID, timecodeScale),
            ...rest,
        ];
        const blob = new Blob([new Uint8Array(original)], {
            type: 'audio/webm',
        });

        const fixed = await fixWebmDuration(blob, 61500);
        const bytes = await bytesOf(fixed);

        // Info gets the Duration element (ID, size and the duration in ms as
        // a float64), and an 8-byte size that includes it
        const duration = [0x44, 0x89, 0x88, ...float64(61500)];
        const expectedHeader = [
            ...ebmlHeader,
            ...segmentHeader,
            ...INFO_ID,
            ...size8(timecodeScale.length + duration.length),
            ...timecodeScale,
            ...duration,
        ];
        expect(fixed.type).to.equal('audio/webm');
        expect(bytes.slice(0, expectedHeader.length)).to.deep.equal(
            expectedHeader
        );
        // Everything after the header (tracks and audio) is unchanged
        expect(bytes.length).to.equal(expectedHeader.length + rest.length);
        expect(bytes.slice(expectedHeader.length)).to.deep.equal(rest);
        // The original file isn't modified
        expect(await bytesOf(blob)).to.deep.equal(original);
    });
});

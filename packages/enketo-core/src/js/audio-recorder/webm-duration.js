/**
 * Adds the Duration metadata to WebM files produced by MediaRecorder.
 *
 * MediaRecorder streams its output, so the Segment > Info element of the
 * resulting WebM file has no Duration and players show the file as having an
 * unknown length.
 *
 * Unlike the `fix-webm-duration` package, this implementation only reads and
 * rewrites the file header. The rest of the recording is referenced through
 * `Blob.slice()`, which does not copy the audio data. This matters for long
 * recordings: parsing a 1-hour recording in full allocates several copies of
 * it on the main thread, which can freeze or crash the browser tab.
 *
 * @module webm-duration
 */

/* eslint-disable no-bitwise */

const EBML_ID = 0x1a45dfa3;
const SEGMENT_ID = 0x18538067;
const SEEK_HEAD_ID = 0x114d9b74;
const CLUSTER_ID = 0x1f43b675;
const INFO_ID = 0x1549a966;
const TIMECODE_SCALE_ID = 0x2ad7b1;
const DURATION_ID = 0x4489;

const DEFAULT_TIMECODE_SCALE = 1000000; // 1 ms, in nanoseconds

/**
 * How many bytes of the file to read when looking for the Info element.
 * MediaRecorder writes the Info element right at the start of the file, so
 * this is more than enough.
 */
const HEADER_READ_SIZE = 64 * 1024;

/**
 * Reads the length of an EBML variable size integer from its first byte.
 *
 * @param {number} firstByte - The first byte of the integer
 * @return {number} The length in bytes (1-8), or 0 if invalid
 */
function vintLength(firstByte) {
    for (let length = 1; length <= 8; length++) {
        if (firstByte & (0x100 >> length)) {
            return length;
        }
    }

    return 0;
}

/**
 * Reads an EBML element ID. IDs keep their length marker bits.
 *
 * @param {Uint8Array} bytes - The bytes to read from
 * @param {number} offset - The offset to read at
 * @return {{ value: number, length: number } | null} The ID, or null if it can't be read
 */
function readId(bytes, offset) {
    const length = offset < bytes.length ? vintLength(bytes[offset]) : 0;
    if (length === 0 || length > 4 || offset + length > bytes.length) {
        return null;
    }

    let value = 0;
    for (let i = 0; i < length; i++) {
        value = value * 256 + bytes[offset + i];
    }

    return { value, length };
}

/**
 * Reads an EBML element data size.
 *
 * @param {Uint8Array} bytes - The bytes to read from
 * @param {number} offset - The offset to read at
 * @return {{ value: number, length: number, unknown: boolean } | null} The size, or null if it can't be read
 */
function readSize(bytes, offset) {
    const length = offset < bytes.length ? vintLength(bytes[offset]) : 0;
    if (length === 0 || offset + length > bytes.length) {
        return null;
    }

    const mask = 0xff >> length;
    let value = bytes[offset] & mask;
    let unknown = value === mask;
    for (let i = 1; i < length; i++) {
        const byte = bytes[offset + i];
        value = value * 256 + byte;
        unknown = unknown && byte === 0xff;
    }

    return { value, length, unknown };
}

/**
 * Reads the header (ID and data size) of the EBML element at `offset`.
 *
 * @param {Uint8Array} bytes - The bytes to read from
 * @param {number} offset - The offset of the element
 * @return {{ id: number, size: { value: number, length: number, unknown: boolean }, dataStart: number, dataEnd: number } | null} The element, or null if it can't be read
 */
function readElement(bytes, offset) {
    const id = readId(bytes, offset);
    if (!id) {
        return null;
    }

    const size = readSize(bytes, offset + id.length);
    if (!size) {
        return null;
    }

    const dataStart = offset + id.length + size.length;

    return {
        id: id.value,
        size,
        dataStart,
        dataEnd: dataStart + size.value,
    };
}

/**
 * Encodes a data size as an 8-byte EBML variable size integer.
 *
 * @param {number} value - The size to encode
 * @return {Uint8Array} The encoded size
 */
function encodeSize(value) {
    const bytes = new Uint8Array(8);
    let remaining = value;
    for (let i = 7; i > 0; i--) {
        bytes[i] = remaining % 256;
        remaining = Math.floor(remaining / 256);
    }
    bytes[0] = 0x01;

    return bytes;
}

/**
 * @param {number} value - The value to encode
 * @param {number} length - 4 or 8 bytes
 * @return {Uint8Array} The big endian encoded float
 */
function encodeFloat(value, length) {
    const bytes = new Uint8Array(length);
    const view = new DataView(bytes.buffer);
    if (length === 4) {
        view.setFloat32(0, value);
    } else {
        view.setFloat64(0, value);
    }

    return bytes;
}

/**
 * @param {Uint8Array} bytes - The bytes to read from
 * @param {number} offset - The offset to read at
 * @param {number} length - 4 or 8 bytes
 * @return {number} The decoded big endian float
 */
function decodeFloat(bytes, offset, length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, length);

    return length === 4 ? view.getFloat32(0) : view.getFloat64(0);
}

/**
 * @param {Uint8Array} bytes - The bytes to read from
 * @param {number} offset - The offset to read at
 * @param {number} length - The number of bytes
 * @return {number} The decoded big endian unsigned integer
 */
function decodeUint(bytes, offset, length) {
    let value = 0;
    for (let i = 0; i < length; i++) {
        value = value * 256 + bytes[offset + i];
    }

    return value;
}

/**
 * Computes how to rewrite the start of the file so that it contains the duration.
 *
 * @param {Uint8Array} head - The first bytes of the file
 * @param {number} durationMs - The duration in milliseconds
 * @return {{ parts: Array<Uint8Array>, end: number } | null} The new bytes to replace
 * `head[0..end]` with, or null if the file can't (or doesn't need to) be patched.
 */
function getDurationPatch(head, durationMs) {
    const ebml = readElement(head, 0);
    if (!ebml || ebml.id !== EBML_ID || ebml.size.unknown) {
        return null;
    }

    const segmentStart = ebml.dataEnd;
    const segment = readElement(head, segmentStart);
    if (!segment || segment.id !== SEGMENT_ID) {
        return null;
    }

    // Find the Info element among the first children of the Segment
    let infoStart = segment.dataStart;
    let info = readElement(head, infoStart);
    while (info && info.id !== INFO_ID) {
        if (
            info.size.unknown ||
            info.id === CLUSTER_ID ||
            // Inserting bytes would invalidate the positions in the SeekHead
            info.id === SEEK_HEAD_ID
        ) {
            return null;
        }
        infoStart = info.dataEnd;
        info = readElement(head, infoStart);
    }

    if (!info || info.size.unknown || info.dataEnd > head.length) {
        return null;
    }

    let timecodeScale = DEFAULT_TIMECODE_SCALE;
    let duration = null;
    for (let offset = info.dataStart; offset < info.dataEnd;) {
        const child = readElement(head, offset);
        if (!child || child.dataEnd > info.dataEnd) {
            return null;
        }
        if (child.id === TIMECODE_SCALE_ID) {
            timecodeScale =
                decodeUint(head, child.dataStart, child.size.value) ||
                DEFAULT_TIMECODE_SCALE;
        } else if (child.id === DURATION_ID) {
            duration = child;
        }
        offset = child.dataEnd;
    }

    // Duration is expressed in Segment ticks
    const durationTicks = (durationMs * 1000000) / timecodeScale;

    if (duration) {
        const length = duration.size.value;
        if (
            (length !== 4 && length !== 8) ||
            decodeFloat(head, duration.dataStart, length) > 0
        ) {
            return null;
        }

        // Overwrite the empty duration in place
        return {
            parts: [
                head.subarray(0, duration.dataStart),
                encodeFloat(durationTicks, length),
            ],
            end: duration.dataEnd,
        };
    }

    // Append a Duration element (2-byte ID, 1-byte size, 8-byte float) to Info
    const durationElement = new Uint8Array(11);
    durationElement.set([0x44, 0x89, 0x88]);
    durationElement.set(encodeFloat(durationTicks, 8), 3);

    const infoIdLength = info.dataStart - info.size.length - infoStart;
    const infoIdEnd = infoStart + infoIdLength;
    const newInfoSize = encodeSize(info.size.value + durationElement.length);
    const addedLength =
        newInfoSize.length - info.size.length + durationElement.length;

    const segmentSizeStart = segment.dataStart - segment.size.length;
    // A Segment of unknown size (what MediaRecorder writes) can be left as is
    const segmentSize = segment.size.unknown
        ? head.subarray(segmentSizeStart, segment.dataStart)
        : encodeSize(segment.size.value + addedLength);

    return {
        parts: [
            head.subarray(0, segmentSizeStart),
            segmentSize,
            head.subarray(segment.dataStart, infoIdEnd),
            newInfoSize,
            head.subarray(info.dataStart, info.dataEnd),
            durationElement,
        ],
        end: info.dataEnd,
    };
}

/**
 * Returns a copy of a WebM blob with the Duration metadata set.
 * The blob is returned unchanged if it already has a duration or if
 * its header can't be parsed.
 *
 * @param {Blob} blob - The WebM file
 * @param {number} durationMs - The duration in milliseconds
 * @return {Promise<Blob>} The WebM file with duration
 */
async function fixWebmDuration(blob, durationMs) {
    try {
        const headerBlob = blob.slice(0, Math.min(blob.size, HEADER_READ_SIZE));
        const head = new Uint8Array(await headerBlob.arrayBuffer());
        const patch = getDurationPatch(head, durationMs);
        if (!patch) {
            return blob;
        }

        return new Blob([...patch.parts, blob.slice(patch.end)], {
            type: blob.type,
        });
    } catch (error) {
        console.error('Failed to set the WebM duration:', error);

        return blob;
    }
}

export default fixWebmDuration;

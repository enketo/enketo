const { assertStringValue } = require('../helpers');

describe('digest', () => {
    it('digest', () => {
        [
            ['digest("abc", "MD5", "hex")', '900150983cd24fb0d6963f7d28e17f72'],
            [
                'digest("abc", "SHA-1", "hex")',
                'a9993e364706816aba3e25717850c26c9cd0d89d',
            ],
            [
                'digest("abc", "SHA-256", "hex")',
                'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
            ],
            [
                'digest("abc", "SHA-256")',
                'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=',
            ],
            [
                'digest("abc", "SHA-256", "base64")',
                'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=',
            ],
        ].forEach(([expr, expected]) => {
            assertStringValue(expr, expected);
        });
    });

    it('should dereference an xpath', () => {
        assertStringValue(
            'integrity',
            'digest(/simple/xpath/to/node, "MD5", "hex")',
            '164731747fc7236d799e588f60efbbe7'
        );
    });

    // The message must be encoded as UTF-8 before hashing, so that a given
    // string digests identically in Enketo, in JavaRosa, and in any other
    // standards-compliant implementation. See #1605.
    it('should encode non-ASCII messages as UTF-8', () => {
        [
            // 'abc © — xyz': characters in the 2- and 3-byte UTF-8 ranges
            [
                'digest("abc © — xyz", "MD5", "hex")',
                '6f7e606a1d1174d47a3806ca7e76218c',
            ],
            [
                'digest("abc © — xyz", "SHA-1", "hex")',
                'c5f99843bf4790cf2d39c13271ec6c6a8e83b270',
            ],
            [
                'digest("abc © — xyz", "SHA-256", "hex")',
                '03f921e8d84b143063d4a8cf2adfb944a8a50c909b04d1b513b9eed20ad499fb',
            ],
            [
                'digest("abc © — xyz", "SHA-384", "hex")',
                'ec2ef2afe5b0c4796318dbb26ebe53ed53eb2e1f4ca69f665a142d2c771e93473b32efd53b691d4133917ad5bb92f4aa',
            ],
            [
                'digest("abc © — xyz", "SHA-512", "hex")',
                '047717135c66246bbf17783dce06808d3439cf8269e148097bf2623e4600f07c199432540abc15bb7eac7fab32001d1aee3c37611164ad90c93d7631c6da24b5',
            ],
            [
                'digest("abc © — xyz", "SHA-256", "base64")',
                'A/kh6NhLFDBj1KjPKt+5RKilDJCbBNG1E7nu0grUmfs=',
            ],
            [
                'digest("abc © — xyz", "SHA-256")',
                'A/kh6NhLFDBj1KjPKt+5RKilDJCbBNG1E7nu0grUmfs=',
            ],
            // Cyrillic: entirely outside the ASCII range
            [
                'digest("Привет", "SHA-256", "hex")',
                'dd679c0b9fd408a04148aa7d30c9df393f67b7227f65693fffe0ed6d0f0ade59',
            ],
            // A surrogate pair, which must encode as four UTF-8 bytes
            [
                'digest("🎉", "SHA-256", "hex")',
                '6146299cd54818a0e659eb6ac88e80f6f8f70536bbbd962d36973f2d2323f26c',
            ],
        ].forEach(([expr, expected]) => {
            assertStringValue(expr, expected);
        });
    });

    it('should encode a non-ASCII dereferenced xpath as UTF-8', () => {
        assertStringValue(
            'abc © — xyz',
            'digest(/simple/xpath/to/node, "SHA-256", "hex")',
            '03f921e8d84b143063d4a8cf2adfb944a8a50c909b04d1b513b9eed20ad499fb'
        );
    });
});

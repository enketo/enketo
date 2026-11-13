/**
 * @module encryptor.spec.js
 * @description Tests encryption logic.
 * @see {SurveyEncryptionSpec}
 */

/**
 * @typedef {import('./feature/survey-encryption.spec.js')} SurveyEncryptionSpec
 */

import forge from 'node-forge';
import encryptor from '../../public/js/src/module/encryptor';

describe('Encryptor', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Seed generation', () => {
        it('generates correct seed length', () => {
            const seed = new encryptor.Seed(
                'abcdefg',
                'ÛdGÆF§Dq3V*px!>XRÿ÷ëp7§'
            );
            const first = seed.getIncrementedSeedByteString();
            expect(first.length).to.equal(16);
        });

        it('correctly generates the first seed based on two constructor parameters', () => {
            const seed1 = new encryptor.Seed(
                'abcdefg',
                'ÛdGÆF§Dq3V*px!>XRÿ÷ëp7§'
            );
            const seed2 = new encryptor.Seed(
                'bbcdefg',
                'ÛdGÆF§Dq3V*px!>XRÿ÷ëp7§'
            );
            const seed3 = new encryptor.Seed(
                'bbcdefg',
                'adGÆF§Dq3V*px!>XRÿ÷ëp7§'
            );
            const first1Expected = [
                26, 165, 249, 183, 157, 87, 116, 18, 86, 100, 25, 164, 27, 112,
                192, 230,
            ];
            const first1 = seed1
                .getIncrementedSeedByteString()
                .split('')
                .map((item) => item.charCodeAt(0));
            const first2 = seed2
                .getIncrementedSeedByteString()
                .split('')
                .map((item) => item.charCodeAt(0));
            const first3 = seed3
                .getIncrementedSeedByteString()
                .split('')
                .map((item) => item.charCodeAt(0));
            expect(first1).to.deep.equal(first1Expected);
            expect(first2).to.not.deep.equal(first1Expected);
            expect(first3).to.not.deep.equal(first1Expected);

            expect(first2).to.deep.equal([
                87, 16, 237, 144, 161, 2, 179, 181, 142, 237, 206, 30, 156, 158,
                121, 243,
            ]);
            expect(first3).to.deep.equal([
                143, 141, 17, 221, 167, 138, 28, 206, 70, 192, 18, 65, 159, 235,
                40, 20,
            ]);
        });

        it('correctly increments seeds at second call', () => {
            const seed1 = new encryptor.Seed(
                'abcdefg',
                'ÛdGÆF§Dq3V*px!>XRÿ÷ëp7§'
            );
            seed1.getIncrementedSeedByteString();
            const second = seed1
                .getIncrementedSeedByteString()
                .split('')
                .map((item) => item.charCodeAt(0));
            expect(second).to.deep.equal([
                26, 166, 249, 183, 157, 87, 116, 18, 86, 100, 25, 164, 27, 112,
                192, 230,
            ]);
        });

        it('correctly generates the 20th seed', () => {
            // test for > 16 files
            const seed = new encryptor.Seed(
                'abcdefg',
                'ÛdGÆF§Dq3V*px!>XRÿ÷ëp7§'
            );
            let array;
            for (let i = 0; i < 20; i++) {
                array = seed
                    .getIncrementedSeedByteString()
                    .split('')
                    .map((item) => item.charCodeAt(0));
            }
            expect(array).to.deep.equal([
                27, 167, 251, 185, 158, 88, 117, 19, 87, 101, 26, 165, 28, 113,
                193, 231,
            ]);
        });

        it('encodes instanceId with non-ASCII characters into UTF-8 before MD5 hashing', () => {
            const seed = new encryptor.Seed(
                'abcdefgé',
                'ÛdGÆF§Dq3V*px!>XRÿ÷ëp7§'
            );
            const first = seed
                .getIncrementedSeedByteString()
                .split('')
                .map((item) => item.charCodeAt(0));
            const firstExpected = [
                15, 216, 88, 212, 194, 59, 29, 40, 180, 63, 87, 57, 130, 116,
                247, 175,
            ];
            expect(first).to.deep.equal(firstExpected);
        });

        describe('IV byte overflow', () => {
            const KEY = 'A'.repeat(32);
            // With KEY, this instanceID's seed has 0xff at byte 1 (asserted below).
            // The second file increments byte 1, which then has to wrap to 0x00.
            const OVERFLOW_AT_1 = 'uuid:overflow-1-150';

            const toCodes = (byteString) =>
                byteString.split('').map((char) => char.charCodeAt(0));
            const seedCodes = (instanceId) =>
                toCodes(
                    forge.md.md5
                        .create()
                        .update(forge.util.encodeUtf8(instanceId))
                        .update(KEY)
                        .digest()
                        .getBytes()
                );

            it('wraps a byte from 0xff to 0x00 without changing the neighboring byte', () => {
                const expected = seedCodes(OVERFLOW_AT_1);

                expect(expected[1]).to.equal(0xff);

                const seed = new encryptor.Seed(OVERFLOW_AT_1, KEY);

                seed.getIncrementedSeedByteString(); // first file: byte 0
                const second = toCodes(seed.getIncrementedSeedByteString());

                expected[0] = (expected[0] + 1) % 256;
                expected[1] = 0x00;

                expect(second).to.deep.equal(expected);
            });

            it('only returns byte values from 0 to 255', () => {
                const seed = new encryptor.Seed(OVERFLOW_AT_1, KEY);

                for (let i = 0; i < 64; i++) {
                    const codes = toCodes(seed.getIncrementedSeedByteString());

                    expect(codes.every((code) => code <= 0xff)).to.equal(true);
                }
            });
        });
    });

    describe('submission encryption', () => {
        const form = {
            id: 'abc',
            version: '2',
            encryptionKey:
                'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5s9p+VdyX1ikG8nnoXLCC9hKfivAp/e1sHr3O15UQ+a8CjR/QV29+cO8zjS/KKgXZiOWvX+gDs2+5k9Kn4eQm5KhoZVw5Xla2PZtJESAd7dM9O5QrqVJ5Ukrq+kG/uV0nf6X8dxyIluNeCK1jE55J5trQMWT2SjDcj+OVoTdNGJ1H6FL+Horz2UqkIObW5/elItYF8zUZcO1meCtGwaPHxAxlvODe8JdKs3eMiIo9eTT4WbH1X+7nJ21E/FBd8EmnK/91UGOx2AayNxM0RN7pAcj47a434LzeM+XCnBztd+mtt1PSflF2CFE116ikEgLcXCj4aklfoON9TwDIQSp0wIDAQAB',
        };
        const SUBMISSION_NS = 'http://opendatakit.org/submissions';
        const XFORMS_NS = 'http://openrosa.org/xforms';

        it('generates a correct submission manifest for a simple text-only submission', (done) => {
            const record = {
                xml: '<root>this is a record</root>',
                instanceId: '1a2b',
            };

            encryptor
                .encryptRecord(form, record)
                .then((encryptedRecord) => {
                    const doc = new DOMParser().parseFromString(
                        encryptedRecord.xml,
                        'text/xml'
                    );
                    expect(doc.querySelectorAll('data').length).to.equal(1);
                    expect(doc.querySelector('data').namespaceURI).to.equal(
                        SUBMISSION_NS
                    );
                    expect(
                        doc.querySelector('data').getAttribute('id')
                    ).to.equal('abc');
                    expect(
                        doc.querySelector('data').getAttribute('version')
                    ).to.equal('2');
                    expect(
                        doc.querySelector('data').getAttribute('encrypted')
                    ).to.equal('yes');
                    expect(
                        doc.querySelectorAll('data > base64EncryptedKey').length
                    ).to.equal(1);
                    expect(
                        doc.querySelector('data > base64EncryptedKey')
                            .textContent
                    ).to.match(/.+==$/);
                    expect(
                        doc.querySelector('data > base64EncryptedKey')
                            .namespaceURI
                    ).to.equal(SUBMISSION_NS);
                    expect(doc.querySelectorAll('data > meta').length).to.equal(
                        1
                    );
                    expect(
                        doc.querySelector('data > meta').namespaceURI
                    ).to.equal(XFORMS_NS);
                    expect(
                        doc.querySelectorAll('data > meta > instanceID').length
                    ).to.equal(1);
                    expect(
                        doc.querySelector('data > meta > instanceID')
                            .textContent
                    ).to.equal('1a2b');
                    expect(
                        doc.querySelector('data > meta > instanceID')
                            .namespaceURI
                    ).to.equal(XFORMS_NS);
                    expect(
                        doc.querySelectorAll(
                            'data > base64EncryptedElementSignature'
                        ).length
                    ).to.equal(1);
                    expect(
                        doc.querySelector(
                            'data > base64EncryptedElementSignature'
                        ).textContent
                    ).to.match(/.+==$/);
                    expect(
                        doc.querySelector(
                            'data > base64EncryptedElementSignature'
                        ).namespaceURI
                    ).to.equal(SUBMISSION_NS);
                    expect(
                        doc.querySelector('data > encryptedXmlFile').textContent
                    ).to.equal('submission.xml.enc');
                    expect(
                        doc.querySelector('data >encryptedXmlFile').namespaceURI
                    ).to.equal(SUBMISSION_NS);
                    // only used by Enketo temporarily and then removed:
                    expect(
                        doc
                            .querySelector('data >encryptedXmlFile')
                            .getAttribute('type')
                    ).to.equal('file');

                    done();
                })
                .catch(done);
        });

        it('generates a correct submission manifest for a submission with (media) files', (done) => {
            const fakeImageA = new Blob(['<a id="a"><b id="b">hey!</b></a>'], {
                type: 'text/html',
            });
            fakeImageA.name = 'my-imageA.jpg';
            const fakeImageB = new Blob(['<a id="b"></a>'], {
                type: 'text/html',
            });
            fakeImageB.name = 'my-imageB.jpg';
            const record = {
                xml: '<root>this is a record</root>',
                instanceId: '1a2b',
                files: [fakeImageA, fakeImageB],
            };

            encryptor
                .encryptRecord(form, record)
                .then((encryptedRecord) => {
                    const doc = new DOMParser().parseFromString(
                        encryptedRecord.xml,
                        'text/xml'
                    );
                    expect(
                        doc.querySelectorAll('data > media').length
                    ).to.equal(2);
                    // Note, in the future, we'll put all <file> elements under 1 <media>
                    // https://github.com/opendatakit/aggregate/issues/319
                    expect(
                        doc.querySelectorAll('data > media > file').length
                    ).to.equal(2);
                    expect(
                        doc.querySelectorAll('data > media > file')[0]
                            .textContent
                    ).to.equal('my-imageA.jpg.enc');
                    expect(
                        doc.querySelectorAll('data > media > file')[1]
                            .textContent
                    ).to.equal('my-imageB.jpg.enc');
                    expect(
                        doc.querySelector('data > media > file').namespaceURI
                    ).to.equal(SUBMISSION_NS);
                    done();
                })
                .catch(done);
        });

        it('encodes submission XML with non-ASCII characters into UTF-8 before MD5 hashing', (done) => {
            const record = {
                xml: '<root>café résumé naïve</root>',
                instanceId: '1a2b',
            };

            encryptor
                .encryptRecord(form, record)
                .then((encryptedRecord) => {
                    expect(encryptedRecord.files[0].md5).to.equal(
                        '2ba225a35204382b2195ac4fcd60a3f9'
                    );
                    done();
                })
                .catch(done);
        });

        it('encodes the raw signature with non-ASCII characters into UTF-8 before MD5 hashing', (done) => {
            form.id = 'form-测试-тест'; // A form ID with non-ASCII characters

            const record = {
                xml: '<root>this is a record</root>',
                instanceId: '1a2b',
            };
            const mockBytes = forge.util.createBuffer(
                new Uint8Array(32).fill(65),
                'raw'
            );
            const mockPublicKey = {
                encrypt: (byteString) => {
                    const md = forge.md.md5.create();
                    md.update(byteString);
                    const hash = md.digest().getBytes();
                    return String.fromCharCode(
                        ...hash.split('').map((c) => c.charCodeAt(0) + 66)
                    );
                },
            };

            sandbox.stub(forge.random, 'getBytesSync').returns(mockBytes);
            sandbox.stub(forge.pki, 'publicKeyFromPem').returns(mockPublicKey);

            const encryptedSymmetricKey = mockPublicKey.encrypt(mockBytes);
            const submissionXMLMD5 = forge.md.md5
                .create()
                .update(forge.util.encodeUtf8(record.xml))
                .digest()
                .toHex();
            const expectedElements = [
                form.id,
                form.version,
                forge.util.encode64(encryptedSymmetricKey),
                record.instanceId,
                `submission.xml::${submissionXMLMD5}`,
            ];
            const elementsStr = `${expectedElements.join('\n')}\n`;
            const md = forge.md.md5.create();
            md.update(forge.util.encodeUtf8(elementsStr));
            const messageDigest = md.digest().getBytes();
            const encryptedDigest = mockPublicKey.encrypt(messageDigest);
            const expectedSignature = forge.util.encode64(encryptedDigest);

            encryptor
                .encryptRecord(form, record)
                .then((encryptedRecord) => {
                    const doc = new DOMParser().parseFromString(
                        encryptedRecord.xml,
                        'text/xml'
                    );
                    expect(
                        doc.querySelector(
                            'data > base64EncryptedElementSignature'
                        ).textContent
                    ).to.equal(expectedSignature);
                    done();
                })
                .catch(done);
        });

        /**
         * These tests decrypt Enketo's output with an implementation that is
         * independent of node-forge's AES (Web Crypto) and of `Seed` (IVs
         * computed per the ODK spec), so they catch output that ODK tools
         * can't decrypt even when Enketo agrees with itself.
         */
        describe('decryption with an independent implementation', () => {
            const KEY = 'A'.repeat(32);
            const encoder = new TextEncoder();

            const toBytes = (byteString) =>
                Uint8Array.from(byteString, (char) => char.charCodeAt(0));

            // The IV seed per the ODK spec: MD5(instanceID + key)
            const specSeed = (instanceId) =>
                Array.from(
                    toBytes(
                        forge.md.md5
                            .create()
                            .update(forge.util.encodeUtf8(instanceId))
                            .update(KEY)
                            .digest()
                            .getBytes()
                    )
                );

            // ODK spec IVs: file n increments seed byte n % 16 with Java `byte`
            // arithmetic (0xff -> 0x00).
            const specIvs = (instanceId, count) => {
                const seed = specSeed(instanceId);

                return Array.from({ length: count }, (_, n) => {
                    seed[n % 16] = (seed[n % 16] + 1) % 256;

                    return Uint8Array.from(seed);
                });
            };

            // AES-CFB-128 decryption built on Web Crypto, which has no CFB mode:
            // encrypting a zero block in CTR mode with counter C gives AES(C),
            // and CFB decrypts each block as C[i] XOR AES(C[i-1]), with C[-1] = IV.
            // Each block only depends on ciphertext, so blocks decrypt in parallel.
            const aesCfbDecrypt = async (iv, ciphertext) => {
                const key = await crypto.subtle.importKey(
                    'raw',
                    toBytes(KEY),
                    'AES-CTR',
                    false,
                    ['encrypt']
                );
                const blockStarts = Array.from(
                    { length: ciphertext.length / 16 },
                    (_, block) => block * 16
                );
                const keystreams = (
                    await Promise.all(
                        blockStarts.map((start) =>
                            crypto.subtle.encrypt(
                                {
                                    name: 'AES-CTR',
                                    counter:
                                        start === 0
                                            ? iv
                                            : ciphertext.slice(
                                                  start - 16,
                                                  start
                                              ),
                                    length: 128,
                                },
                                key,
                                new Uint8Array(16)
                            )
                        )
                    )
                ).map((keystream) => new Uint8Array(keystream));
                const plaintext = ciphertext.map(
                    (byte, i) =>
                        // eslint-disable-next-line no-bitwise -- CFB: plaintext = ciphertext XOR keystream
                        byte ^ keystreams[Math.floor(i / 16)][i % 16]
                );

                // Remove PKCS#5/PKCS#7 padding
                return plaintext.subarray(
                    0,
                    plaintext.length - plaintext[plaintext.length - 1]
                );
            };

            // Instance IDs found by search so that, with KEY, the seed byte used
            // by one of the three files is 0xff (`overflowAt`).
            const cases = [
                {
                    instanceId: 'uuid:1a2b',
                    overflowAt: null,
                    description: 'no overflow',
                },
                {
                    instanceId: 'uuid:overflow-0-2',
                    overflowAt: 0,
                    description: 'overflow at byte 0, first attachment',
                },
                {
                    instanceId: 'uuid:overflow-1-150',
                    overflowAt: 1,
                    description: 'overflow at byte 1, second attachment',
                },
                {
                    instanceId: 'uuid:overflow-2-140',
                    overflowAt: 2,
                    description: 'overflow at byte 2, answers file',
                },
            ];

            cases.forEach(({ instanceId, overflowAt, description }) => {
                it(`decrypts every file with the ODK spec IVs (${description})`, async () => {
                    const seedStart = specSeed(instanceId).slice(0, 3);

                    // Guard the precondition, so the case can't silently stop
                    // testing an overflow.
                    if (overflowAt === null) {
                        expect(seedStart).to.not.include(0xff);
                    } else {
                        expect(seedStart[overflowAt]).to.equal(0xff);
                    }

                    sandbox
                        .stub(forge.random, 'getBytesSync')
                        .callsFake((count) => 'A'.repeat(count));

                    const attachmentA = Uint8Array.from(
                        { length: 300 },
                        (_, i) => i % 256
                    );
                    const attachmentB = encoder.encode('second attachment ✓');
                    const fileA = new Blob([attachmentA]);
                    const fileB = new Blob([attachmentB]);

                    fileA.name = 'a.jpg';
                    fileB.name = 'b.mp3';

                    const xml = '<root>café résumé naïve</root>';
                    const encryptedRecord = await encryptor.encryptRecord(
                        { ...form },
                        { xml, instanceId, files: [fileA, fileB] }
                    );
                    const expected = [
                        attachmentA,
                        attachmentB,
                        encoder.encode(xml),
                    ];
                    const ivs = specIvs(instanceId, expected.length);

                    // Attachments first, then submission.xml.enc
                    expect(encryptedRecord.files.length).to.equal(3);

                    const decrypted = await Promise.all(
                        encryptedRecord.files.map(async (file, n) => {
                            const ciphertext = new Uint8Array(
                                await file.arrayBuffer()
                            );

                            expect(ciphertext.length % 16).to.equal(0);

                            return Array.from(
                                await aesCfbDecrypt(ivs[n], ciphertext)
                            );
                        })
                    );

                    expect(decrypted).to.deep.equal(
                        expected.map((bytes) => Array.from(bytes))
                    );
                });
            });
        });
    });
});

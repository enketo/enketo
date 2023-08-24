import { Language, parseLanguage } from '../src/language';

describe('language', () => {
    describe('parser', () => {
        type ParserTestParameters = [
            name: string,
            sample: string,
            language: Language
        ];

        const test = (t: ParserTestParameters) => {
            const name = t[0];
            const sample = t[1];
            const expected = t[2];
            it(`parses "${name}" with sample "${sample}" correctly`, () => {
                expect(parseLanguage(name, sample)).to.deep.equal(expected);
            });
        };

        const tests: ParserTestParameters[] = [
            // no lanuage (only inline XForm text)
            ['', 'a', new Language('', '', '', 'ltr')],
            ['', 'رب', new Language('', '', '', 'rtl')],
            // non-recommended ways, some half-hearted attempt to determine at least dir correctly
            ['Arabic', 'رب', new Language('Arabic', 'Arabic', 'ar', 'rtl')],
            ['arabic', 'رب', new Language('arabic', 'arabic', 'ar', 'rtl')],
            [
                'العربية',
                'رب',
                new Language('العربية', 'العربية', 'العربية', 'rtl'),
            ],
            ['English', 'hi', new Language('English', 'English', 'en', 'ltr')],
            ['Dari', 'کن', new Language('Dari', 'Dari', 'prs', 'rtl')],
            // spaces
            [
                '  fantasy lang  ',
                'bl',
                new Language(
                    '  fantasy lang  ',
                    'fantasy lang',
                    'fantasy lang',
                    'ltr'
                ),
            ],
            [
                'fantasy lang',
                'ک',
                new Language(
                    'fantasy lang',
                    'fantasy lang',
                    'fantasy lang',
                    'rtl'
                ),
            ],
            // better way, which works well in Enketo (not in ODK Collect),
            // description is automatically set to English description if tag is found
            ['ar', 'رب', new Language('ar', 'Arabic', 'ar', 'rtl')],
            ['ar-IR', 'رب', new Language('ar-IR', 'Arabic', 'ar-IR', 'rtl')],
            ['nl', 'he', new Language('nl', 'Dutch', 'nl', 'ltr')],
            // the recommended future-proof way
            [
                'ArabicDialect (ar)',
                'رب',
                new Language(
                    'ArabicDialect (ar)',
                    'ArabicDialect',
                    'ar',
                    'rtl'
                ),
            ],
            // sample contains markdown tag
            [
                'Dari (prs)',
                '# نام فورم',
                new Language('Dari (prs)', 'Dari', 'prs', 'rtl'),
            ],
            // sample returns 'bidi' directionality -> rtl
            [
                'Sorani (ckb)',
                'رهگهز',
                new Language(
                    'Sorani (ckb)',
                    'Sorani', // or Central Kurdish?
                    'ckb',
                    'rtl'
                ),
            ],
            // no space before paren open
            [
                'ArabicDialect(ar)',
                'رب',
                new Language('ArabicDialect(ar)', 'ArabicDialect', 'ar', 'rtl'),
            ],
            [
                'Nederlands (nl)',
                'heej',
                new Language('Nederlands (nl)', 'Nederlands', 'nl', 'ltr'),
            ],
            // recommended way, spaces in name
            [
                'Arabic Dialect (ar)',
                'رب',
                new Language(
                    'Arabic Dialect (ar)',
                    'Arabic Dialect',
                    'ar',
                    'rtl'
                ),
            ],
            // unmatchable tag
            ['0a', 'd', new Language('0a', '0a', '0a', 'ltr')],
            // unmatchable description
            [
                'nonexisting',
                'd',
                new Language(
                    'nonexisting',
                    'nonexisting',
                    'nonexisting',
                    'ltr'
                ),
            ],
            // unmatchable tag and unmatchable description
            [
                'nonexisting (0a)',
                'd',
                new Language('nonexisting (0a)', 'nonexisting', '0a', 'ltr'),
            ],
        ];

        test(tests[0]);

        // tests.forEach(test);
    });
});

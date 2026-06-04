import * as utils from '../../src/js/utils';

describe('Parsing expressions', () => {
    const t = [
        ['func(b,c)', '', []],
        ['func(b,c)', undefined, []],
        ['func(b,c)', null, []],
        ['func(b,c)', false, []],
        ['', 'func', []],
        [undefined, 'func', []],
        [null, 'func', []],
        [false, 'func', []],
        ['func()', 'func', [['func()', []]]],
        ['concat("version: ", version())', 'version', [['version()', []]]],
        ['func(  )', 'func', [['func(  )', ['']]]],
        ['func(b,c)', 'func', [['func(b,c)', ['b', 'c']]]],
        ['func( b ,c)', 'func', [['func( b ,c)', ['b', 'c']]]],
        [
            'func(b,func(c))',
            'func',
            [
                ['func(b,func(c))', ['b', 'func(c)']],
                ['func(c)', ['c']],
            ],
        ],
        [
            'func(b, func(func( c )))',
            'func',
            [
                ['func(b, func(func( c )))', ['b', 'func(func( c ))']],
                ['func(func( c ))', ['func( c )']],
                ['func( c )', ['c']],
            ],
        ],
        [
            'func(b,c(1+funca(4,7)))',
            'func',
            [['func(b,c(1+funca(4,7)))', ['b', 'c(1+funca(4,7))']]],
        ],
        [
            'func(a,b) + 5 + func(b,c)',
            'func',
            [
                ['func(a,b)', ['a', 'b']],
                ['func(b,c)', ['b', 'c']],
            ],
        ],
        [
            '"blabla" + indexed-repeat(/path/to/a, /path/to, position(..) - 1) + "what"',
            'indexed-repeat',
            [
                [
                    'indexed-repeat(/path/to/a, /path/to, position(..) - 1)',
                    ['/path/to/a', '/path/to', 'position(..) - 1'],
                ],
            ],
        ],
    ];

    function test(expr, func, expected) {
        it(`extracts the calls to ${func} and their parameters as a string from ${expr}`, () => {
            const result = utils.parseFunctionFromExpression(expr, func);
            expect(result).to.deep.equal(expected);
        });
    }

    for (let i = 0; i < t.length; i++) {
        test(t[i][0], t[i][1], t[i][2]);
    }
});

describe('return postfixed filenames', () => {
    [
        ['myname', '-mypostfix', 'myname-mypostfix'],
        ['myname.jpg', '-mypostfix', 'myname-mypostfix.jpg'],
        ['myname.dot.jpg', '-mypostfix', 'myname.dot-mypostfix.jpg'],
        ['myname.000', '-mypostfix', 'myname-mypostfix.000'],
        [undefined, 'mypostfix', ''],
        [null, 'mypostfix', ''],
        [false, 'mypostfix', ''],
        ['myname', undefined, 'myname'],
        ['myname', null, 'myname'],
        ['myname', false, 'myname'],
    ].forEach(([name, postfix, expected]) => {
        it(`returns the filename ${expected} from ${name} and ${postfix}`, () => {
            const file = new Blob(['a'], {
                type: 'text',
            });
            file.name = name;

            expect(utils.getFilename(file, postfix)).to.deep.equal(expected);
        });
    });
});

describe('stripInvalidXmlCharacters', () => {
    it('should return the same string when no invalid characters are present', () => {
        expect(utils.stripInvalidXmlCharacters('hello world')).to.equal(
            'hello world'
        );
    });

    it('should preserve valid XML whitespace characters (tab, LF, CR)', () => {
        expect(utils.stripInvalidXmlCharacters('a\tb\nc\rd')).to.equal(
            'a\tb\nc\rd'
        );
    });

    it('should strip null character (U+0000)', () => {
        expect(utils.stripInvalidXmlCharacters('ab\x00cd')).to.equal('abcd');
    });

    it('should strip control characters U+0001 through U+0008', () => {
        expect(
            utils.stripInvalidXmlCharacters(
                'a\x01\x02\x03\x04\x05\x06\x07\x08b'
            )
        ).to.equal('ab');
    });

    it('should strip U+000B (vertical tab) and U+000C (form feed)', () => {
        expect(utils.stripInvalidXmlCharacters('a\x0B\x0Cb')).to.equal('ab');
    });

    it('should strip control characters U+000E through U+001F', () => {
        expect(utils.stripInvalidXmlCharacters('a\x0E\x0F\x10\x1F b')).to.equal(
            'a b'
        );
    });

    it('should strip U+FFFE and U+FFFF', () => {
        expect(utils.stripInvalidXmlCharacters('a\uFFFE\uFFFFb')).to.equal(
            'ab'
        );
    });

    it('should preserve valid characters in the range U+0020 to U+D7FF', () => {
        expect(
            utils.stripInvalidXmlCharacters('Hello! @#$%^&*() é ñ ü')
        ).to.equal('Hello! @#$%^&*() é ñ ü');
    });

    it('should preserve valid characters in the range U+E000 to U+FFFD', () => {
        expect(utils.stripInvalidXmlCharacters('\uE000\uFFFD')).to.equal(
            '\uE000\uFFFD'
        );
    });

    it('should preserve valid supplementary characters (U+10000 to U+10FFFF)', () => {
        // U+1F600 is 😀 (grinning face emoji)
        expect(utils.stripInvalidXmlCharacters('hello 😀')).to.equal(
            'hello 😀'
        );
    });

    it('should return falsy values as-is', () => {
        expect(utils.stripInvalidXmlCharacters('')).to.equal('');
        expect(utils.stripInvalidXmlCharacters(null)).to.equal(null);
        expect(utils.stripInvalidXmlCharacters(undefined)).to.equal(undefined);
    });

    it('should strip mixed invalid characters from a realistic string', () => {
        // Simulates copy-paste from a bad PDF containing U+0000 and U+0002
        expect(
            utils.stripInvalidXmlCharacters('Patient\x00 name:\x02 John Doe')
        ).to.equal('Patient name: John Doe');
    });
});

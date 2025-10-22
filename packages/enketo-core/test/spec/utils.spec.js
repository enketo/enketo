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

describe('SVG Sanitization', () => {
    let parser;

    beforeEach(() => {
        parser = new DOMParser();
    });

    it('should remove script elements from SVG', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <script>alert('XSS')</script>
                <path id="safe" d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);

        expect(sanitized.querySelector('script')).to.be.null;
        expect(sanitized.querySelector('path')).to.not.be.null;
    });

    it('should remove event handler attributes', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
                <path id="test" onclick="alert('click')" d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);

        expect(sanitized.hasAttribute('onload')).to.be.false;
        expect(sanitized.querySelector('path').hasAttribute('onclick')).to.be
            .false;
        expect(sanitized.querySelector('path').getAttribute('id')).to.equal(
            'test'
        );
    });

    it('should remove javascript: URLs from href attributes', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <a href="javascript:alert('XSS')">
                    <path id="link" d="M 10 10 L 20 20"/>
                </a>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);

        expect(sanitized.querySelector('a').hasAttribute('href')).to.be.false;
        expect(sanitized.querySelector('path').getAttribute('id')).to.equal(
            'link'
        );
    });

    it('should remove dangerous elements like foreignObject', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <foreignObject>
                    <iframe src="javascript:alert('XSS')"></iframe>
                </foreignObject>
                <path id="safe" d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);

        expect(sanitized.querySelector('foreignObject')).to.be.null;
        expect(sanitized.querySelector('iframe')).to.be.null;
        expect(sanitized.querySelector('path')).to.not.be.null;
    });

    it('should preserve safe SVG content', () => {
        const safeSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <g id="group">
                    <path id="CO" fill="blue" d="M 10 10 L 20 20"/>
                    <circle id="CA" cx="50" cy="50" r="10"/>
                </g>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(safeSvg);

        expect(sanitized.getAttribute('viewBox')).to.equal('0 0 100 100');
        expect(sanitized.querySelector('#CO')).to.not.be.null;
        expect(sanitized.querySelector('#CA')).to.not.be.null;
        expect(sanitized.querySelector('g')).to.not.be.null;
    });

    it('should return null for null input', () => {
        expect(utils.sanitizeSvg(null)).to.be.null;
    });

    it('should return undefined for undefined input', () => {
        expect(utils.sanitizeSvg(undefined)).to.be.undefined;
    });
});

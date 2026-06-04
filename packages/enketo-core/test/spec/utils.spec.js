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

    it('should remove all event handler attributes when multiple are present on the same element', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" onclick="alert(2)" onmouseover="alert(3)">
                <path id="test" d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);

        expect(sanitized.hasAttribute('onload')).to.be.false;
        expect(sanitized.hasAttribute('onclick')).to.be.false;
        expect(sanitized.hasAttribute('onmouseover')).to.be.false;
        expect(sanitized.querySelector('path').getAttribute('id')).to.equal(
            'test'
        );
    });

    it('should remove javascript: URLs from href attributes', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <a href="   javascript:alert('XSS')">
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

    it('should remove HTML elements (e.g. img with onerror) nested inside foreignObject', () => {
        const maliciousSvg = parser
            .parseFromString(
                `<svg xmlns="http://www.w3.org/2000/svg">
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml">
                            <img src="x" onerror="alert('XSS: foreignObject img onerror')"/>
                        </div>
                    </foreignObject>
                    <path id="safe" d="M 10 10 L 20 20"/>
                </svg>`,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);

        expect(sanitized.querySelector('foreignObject')).to.be.null;
        expect(sanitized.querySelector('img')).to.be.null;
        // Verify no element anywhere in the sanitized SVG has an onerror attribute
        const allElements = sanitized.querySelectorAll('*');
        for (const el of allElements) {
            expect(el.hasAttribute('onerror')).to.be.false;
        }
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

    it('should preserve safe text and tspan nodes', () => {
        const safeSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
                <text id="label" x="10" y="20" font-size="12">
                    Safe text
                    <tspan id="suffix" dx="4">node</tspan>
                </text>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(safeSvg);

        expect(sanitized.querySelector('text#label')).to.not.be.null;
        expect(sanitized.querySelector('tspan#suffix')).to.not.be.null;
        expect(
            sanitized.querySelector('text#label').textContent.replace(/\s+/g, ' ').trim()
        ).to.equal('Safe text node');
    });

    it('should sanitize <style> elements and keep only safe CSS declarations', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <style>
                    path { fill: red; position: fixed; stroke: green; }
                    text { font-size: 12px; color: blue; background: yellow; }
                    circle { fill: url(https://evil.example/fill); opacity: 0.5; }
                    @import url(https://evil.example/import.css);
                </style>
                <path id="safe" d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);
        const styleText = sanitized.querySelector('style').textContent;

        expect(styleText).to.contain('path{fill:red;stroke:green;}');
        expect(styleText).to.contain('text{font-size:12px;color:blue;}');
        expect(styleText).to.contain('circle{opacity:0.5;}');
        expect(styleText).to.not.contain('position:fixed');
        expect(styleText).to.not.contain('background:yellow');
        expect(styleText).to.not.contain('url(');
        expect(styleText).to.not.contain('@import');
        expect(sanitized.querySelector('path')).to.not.be.null;
    });

    it('should keep class-only style selectors scoped to svg', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <style>
                    body { opacity: .5; }
                    :root { color: red; }
                    .outside { fill: red; }
                    path { fill: red; }
                    svg rect { stroke: blue; }
                </style>
                <rect id="safe" d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);
        const styleText = sanitized.querySelector('style').textContent;

        expect(styleText).to.contain('path{fill:red;}');
        expect(styleText).to.contain('svg rect{stroke:blue;}');
        expect(styleText).to.not.contain('body{');
        expect(styleText).to.not.contain(':root{');
        expect(styleText).to.contain('svg .outside{fill:red;}');
    });

    it('should sanitize style attributes and keep only safe CSS declarations', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg"
                 style="opacity:0.8;position:fixed;fill:url(https://evil.example/a.svg)">
                <path id="safe" style="fill:red;stroke:blue;background:yellow;transform:translate(10,20) rotate(45deg)" d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);
        const svgStyle = sanitized.getAttribute('style');
        const pathStyle = sanitized.querySelector('path').getAttribute('style');

        expect(svgStyle).to.equal('opacity:0.8;');
        expect(pathStyle).to.contain('fill:red;');
        expect(pathStyle).to.contain('stroke:blue;');
        expect(pathStyle).to.contain(
            'transform:translate(10,20) rotate(45deg);'
        );
        expect(pathStyle).to.not.contain('background:yellow');
        expect(pathStyle).to.not.contain('url(');
        expect(sanitized.querySelector('#safe')).to.not.be.null;
    });

    it('should reject unsafe transform and url-like style values', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <path
                    id="safe"
                    style="transform:translate(10,20) evil(1);fill:var(--x);stroke:expression(alert(1));opacity:1"
                    d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);
        const pathStyle = sanitized.querySelector('path').getAttribute('style');

        expect(pathStyle).to.equal('opacity:1;');
    });

    it('should reject escaped url() function names in style values', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg">
                <path
                    id="safe"
                    style="fill:u\\72l(https://evil.example/escaped);stroke:blue"
                    d="M 10 10 L 20 20"/>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = utils.sanitizeSvg(maliciousSvg);
        const pathStyle = sanitized.querySelector('path').getAttribute('style');

        expect(pathStyle).to.equal('stroke:blue;');
    });

    it('should return null for null input', () => {
        expect(utils.sanitizeSvg(null)).to.be.null;
    });

    it('should return undefined for undefined input', () => {
        expect(utils.sanitizeSvg(undefined)).to.be.undefined;
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

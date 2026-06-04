import { sanitizeSvg } from '../../src/js/sanitization-utils';

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

        const sanitized = sanitizeSvg(maliciousSvg);

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

        const sanitized = sanitizeSvg(maliciousSvg);

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

        const sanitized = sanitizeSvg(maliciousSvg);

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

        const sanitized = sanitizeSvg(maliciousSvg);

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

        const sanitized = sanitizeSvg(maliciousSvg);

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

        const sanitized = sanitizeSvg(maliciousSvg);

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

        const sanitized = sanitizeSvg(safeSvg);

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

        const sanitized = sanitizeSvg(safeSvg);

        expect(sanitized.querySelector('text#label')).to.not.be.null;
        expect(sanitized.querySelector('tspan#suffix')).to.not.be.null;
        expect(
            sanitized
                .querySelector('text#label')
                .textContent.replace(/\s+/g, ' ')
                .trim()
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

        const sanitized = sanitizeSvg(maliciousSvg);
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

        const sanitized = sanitizeSvg(maliciousSvg);
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

        const sanitized = sanitizeSvg(maliciousSvg);
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

    it('should remove external href references and keep local fragment refs', () => {
        const maliciousSvg = parser
            .parseFromString(
                `
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <defs>
                    <path id="safe-path" d="M 10 10 L 20 20" />
                    <pattern id="pt-base" width="10" height="10" />
                    <pattern id="pt-safe-ref" xlink:href="#pt-base" />
                    <pattern id="pt-unsafe-ref" xlink:href="https://evil.example/remote.svg#pt" />
                </defs>
                <image id="img-unsafe" href="https://evil.example/tracker.svg" width="10" height="10" />
                <a id="a-unsafe" href="https://evil.example">link</a>
                <a id="a-safe" href="#safe-path">safe link</a>
            </svg>
        `,
                'text/xml'
            )
            .querySelector('svg');

        const sanitized = sanitizeSvg(maliciousSvg);

        expect(
            sanitized
                .querySelector('#pt-safe-ref')
                .getAttributeNS('http://www.w3.org/1999/xlink', 'href')
        ).to.equal('#pt-base');
        expect(
            sanitized
                .querySelector('#pt-unsafe-ref')
                .getAttributeNS('http://www.w3.org/1999/xlink', 'href')
        ).to.be.null;
        expect(sanitized.querySelector('#img-unsafe').hasAttribute('href')).to
            .be.false;
        expect(sanitized.querySelector('#a-unsafe').hasAttribute('href')).to.be
            .false;
        expect(
            sanitized.querySelector('#a-safe').getAttribute('href')
        ).to.equal('#safe-path');
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

        const sanitized = sanitizeSvg(maliciousSvg);
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

        const sanitized = sanitizeSvg(maliciousSvg);
        const pathStyle = sanitized.querySelector('path').getAttribute('style');

        expect(pathStyle).to.equal('stroke:blue;');
    });

    it('should return null for null input', () => {
        expect(sanitizeSvg(null)).to.be.null;
    });

    it('should return null for undefined input', () => {
        expect(sanitizeSvg(undefined)).to.be.null;
    });
});

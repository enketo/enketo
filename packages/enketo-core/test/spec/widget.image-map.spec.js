import ImageMapWidget from '../../src/widget/image-map/image-map';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const SVG =
    'data:text/svg;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NTkiIGhlaWdodD0iNTkzIiB2aWV3Qm94PSIwIDAgOTI3IDU4NiI+DQo8dGl0bGU+QmxhbmsgVVMgc3RhdGVzIG1hcDwvdGl0bGU+DQo8Zz4NCiAgPHBhdGggZmlsbD0icGluayIgaWQ9IkNPIiBkPSJNMzgwLjIsMjM1LjUgbC0zNiwtMy41IC03OS4xLC04LjYgLTIuMiwyMi4xIC03LDUwLjQgLTEuOSwxMy43IDM0LDMuOSAzNy41LDQuNCAzNC43LDMgMTQuMywwLjZ6Ij48L3BhdGg+ICANCjwvZz4NCjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0E5QTlBOSIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMjE1LDQ5M3Y1NWwzNiw0NSBNMCw0MjVoMTQ3bDY4LDY4aDg1bDU0LDU0djQ2Ij48L3BhdGg+DQo8L3N2Zz4=';
const FORM1 = `<form class="or">
        <fieldset class="question simple-select or-appearance-image-map">
            <fieldset>
                <legend>
                    <span lang="default" class="question-label active" >Select states from the image</span>
                    <img lang="default" class="active" src="${SVG}" alt="image">
                </legend>
                <div class="option-wrapper">
                    <label>
                        <input type="radio" name="/w/im" data-name="123" value="CO" data-type-xml="select1">
                        <span lang="" class="option-label active">Colorado/span>
                    </label>
                </div>
            </fieldset>
        </fieldset>
    </form>`;
// const FORM2 = FORM1.replace( '"radio"', '"checkbox"' );

// Note that these tests may not be testing what they appear to be testing.
// Because of the unusual implementation of the widget, the tests don't actually check what is displayed on the map (e.g. a loaded value)
runAllCommonWidgetTests(ImageMapWidget, FORM1, 'CO');

// the test with checkboxes don't run because input.setVal and input.getVal are not compatible for select_multiple type questions.
// One uses space-separated value and the other uses and array.
// runAllCommonWidgetTests( ImageMapWidget, FORM2, [ 'CO' ] );

/**
 * Security tests: verify that the image-map widget sanitizes XSS attack
 * vectors in SVG files before inserting them into the DOM.
 *
 * The malicious SVG (test/fixtures/malicious-test.svg) is purpose-built to
 * exercise every significant XSS attack surface in SVGs:
 *   - <script> tags
 *   - <style> tags (CSS injection / clickjacking)
 *   - on* event handler attributes
 *   - <foreignObject> with nested HTML (e.g. <img onerror=...>)
 *   - javascript: URLs (plain, whitespace-prefixed, and xlink:href)
 *   - External references via xlink:href
 *   - style attributes (CSS injection)
 *   - SMIL <animate> targeting href
 *
 * The form backing this test is test/forms/svg-xss-test.xml, which references
 * the SVG via jr://images/malicious-test.svg with an image-map appearance.
 * fetch() is stubbed so the test is self-contained and does not depend on
 * Karma's file-serving infrastructure.
 */

// The malicious SVG is also stored at test/fixtures/malicious-test.svg and is
// referenced by the form fixture at test/forms/svg-xss-test.xml.
// It is embedded here as a string so the test is fully self-contained and
// does not depend on Karma's file-serving infrastructure.
const MALICIOUS_SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="400" height="300" viewBox="0 0 400 300"
     onload="alert('XSS: onload on root')"
     style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:red">
  <title>Malicious SVG Test</title>
  <script>alert('XSS: script tag')</script>
  <style>body { display: none !important; } * { background: red !important; }</style>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <img src="x" onerror="alert('XSS: foreignObject img onerror')"/>
    </div>
  </foreignObject>
  <use xlink:href="http://attacker.example.com/evil.svg#payload"/>
  <use href="#safe-path" onclick="alert('XSS: use onclick')"/>
  <animate attributeName="href" values="javascript:alert('XSS: SMIL animate')"/>
  <a href="   javascript:alert('XSS: whitespace-prefixed javascript:')">
    <rect x="10" y="10" width="80" height="40" fill="blue"/>
  </a>
  <a xlink:href="javascript:alert('XSS: xlink:href javascript:')">
    <rect x="100" y="10" width="80" height="40" fill="green"/>
  </a>
  <rect id="multi-event" x="10" y="60" width="80" height="40" fill="orange"
        onmouseover="alert('XSS: onmouseover')"
        onclick="alert('XSS: onclick')"
        onfocus="alert('XSS: onfocus')"/>
  <rect id="style-attr" x="100" y="60" width="80" height="40"
        style="fill:red;position:fixed;top:0;left:0;width:100%;height:100%"/>
  <g id="safe-group">
    <path id="safe-path" fill="pink" d="M200,150 L250,200 L300,150 Z"/>
    <rect id="safe-rect" x="200" y="60" width="80" height="40" fill="lightblue"/>
    <circle id="safe-circle" cx="310" cy="200" r="30" fill="lightyellow" stroke="black"/>
  </g>
</svg>`;

describe('SVG XSS sanitization via image-map widget', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        // Stub fetch to return the malicious SVG content regardless of URL
        sinon
            .stub(window, 'fetch')
            .callsFake(() =>
                Promise.resolve(new Response(MALICIOUS_SVG_CONTENT))
            );
    });

    afterEach(() => {
        sinon.restore();
        container.remove();
    });

    it('should load the SVG and sanitize all XSS attack vectors', () => {
        container.innerHTML = `<form class="or">
            <fieldset class="question simple-select or-appearance-image-map">
                <fieldset>
                    <legend>
                        <span lang="default" class="question-label active">select safe-path</span>
                        <img lang="default" class="active" src="jr://images/malicious-test.svg" alt="image">
                    </legend>
                    <div class="option-wrapper">
                        <label>
                            <input type="radio" name="/aSzEP83LafQr8YE4AgdA5F/something" value="safe-path" data-type-xml="select1">
                            <span lang="" class="option-label active">safe-path</span>
                        </label>
                    </div>
                </fieldset>
            </fieldset>
        </form>`;

        const control = container.querySelector(ImageMapWidget.selector);
        // ImageMapWidget._init() is async; the constructor returns the Promise.
        const widgetPromise = new ImageMapWidget(control, {});

        return widgetPromise.then(() => {
            const svg = container.querySelector('svg');

            // The SVG must have been fetched and inserted
            expect(svg, 'SVG was not inserted by widget').to.not.be.null;

            // Safe content must be preserved
            expect(svg.querySelector('path'), 'Safe <path> was removed').to.not
                .be.null;

            // Dangerous elements must be absent
            expect(svg.querySelector('script'), '<script> survived').to.be.null;
            expect(svg.querySelector('style'), '<style> survived').to.be.null;
            expect(
                svg.querySelector('foreignObject'),
                '<foreignObject> survived'
            ).to.be.null;
            expect(
                svg.querySelector('img'),
                '<img> from foreignObject survived'
            ).to.be.null;

            // No on* event handler attributes anywhere in the SVG tree
            svg.querySelectorAll('*').forEach((el) => {
                Array.from(el.attributes).forEach((attr) => {
                    expect(
                        attr.name.toLowerCase().startsWith('on'),
                        `Event handler attribute "${attr.name}" survived on <${el.tagName}>`
                    ).to.be.false;
                });
            });

            // No style attributes (CSS injection prevention)
            expect(
                svg.hasAttribute('style'),
                'style attribute survived on root <svg>'
            ).to.be.false;
            svg.querySelectorAll('[style]').forEach((el) => {
                expect(
                    el.hasAttribute('style'),
                    `style attribute survived on <${el.tagName}>`
                ).to.be.false;
            });

            // No javascript: URLs on any href (plain or xlink)
            svg.querySelectorAll('a').forEach((a) => {
                const href = a.getAttribute('href') || '';
                const xlinkHref =
                    a.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
                    '';
                expect(
                    href.trim().toLowerCase().startsWith('javascript:'),
                    `javascript: href survived on <a>`
                ).to.be.false;
                expect(
                    xlinkHref.trim().toLowerCase().startsWith('javascript:'),
                    `javascript: xlink:href survived on <a>`
                ).to.be.false;
            });
        });
    });
});

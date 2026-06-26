import DrawWidget from '../../src/widget/draw/draw-widget';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM1 = `<form class="or">
        <label class="question or-appearance-draw">
            <input name="/data/d" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;
const FORM2 = `<form class="or">
        <label class="question or-appearance-signature">
            <input name="/data/s" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;
const FORM3 = `<form class="or">
        <label class="question or-appearance-annotate">
            <input name="/data/a" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;

[FORM1, FORM2, FORM3].forEach((form) => {
    runAllCommonWidgetTests(DrawWidget, form, '');
});

describe('draw widget', () => {
    describe('widget selection', () => {
        it('does not instantiate for non image accept attributes', () => {
            const form = FORM1.replace(
                'accept="image/*"',
                'accept="something/else"'
            );
            const fragment = document
                .createRange()
                .createContextualFragment(form);
            const control = fragment.querySelector(DrawWidget.selector);
            expect(control).to.equal(null);
        });
    });

    describe('markup', () => {
        it('preserves valid accept attribute value on file input', () => {
            const fragment = document
                .createRange()
                .createContextualFragment(FORM3);
            const control = fragment.querySelector('[name="/data/a"]');
            const widget = new DrawWidget(control, {});
            const fileInput = widget.question.querySelector(
                'input[type="file"].draw-widget__load'
            );
            expect(fileInput.getAttribute('accept')).to.equal('image/*');
        });

        it('escapes malicious accept attribute values', () => {
            const form = FORM3.replace(
                'accept="image/*"',
                'accept="image/*&quot;><img src=x onerror=alert(1)>"'
            );
            const fragment = document
                .createRange()
                .createContextualFragment(form);
            const control = fragment.querySelector('[name="/data/a"]');
            const widget = new DrawWidget(control, {});
            expect(widget.question.querySelector('img[onerror]')).to.equal(
                null
            );
            expect(widget.question.querySelector('[onerror]')).to.equal(null);
        });
    });
});

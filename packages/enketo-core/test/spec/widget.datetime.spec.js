import events from '../../src/js/event';
import { initTimeLocalization } from '../../src/js/format';
import Datetimepicker from '../../src/widget/datetime/datetimepicker-extended';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM = `<form class="or">
        <label class="question ">
            <input name="/data/dt" type="datetime-local" data-type-xml="dateTime" value="" />
        </label>
    </form>`;

// Arizona timezone and meridian preference
runAllCommonWidgetTests(Datetimepicker, FORM, '2012-01-01T13:00:00.000-07:00');

describe('datetimepicker widget', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {Function} */
    let teardownTimeLocalization;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        teardownTimeLocalization = initTimeLocalization();
    });

    afterEach(() => {
        sandbox.restore();
        teardownTimeLocalization();
    });

    function initForm(form, parent = document.createDocumentFragment()) {
        parent.append(document.createRange().createContextualFragment(form));
        const control = parent.querySelector('input');
        return new Datetimepicker(control);
    }

    describe('manual input without Enter', () => {
        it('is propagated correctly for datetime fields', () => {
            const datepicker = initForm(FORM);
            const input = datepicker.element;
            const fakeDateInput = datepicker.element
                .closest('.question')
                .querySelector('.widget .date input');
            const fakeTimeInput = datepicker.element
                .closest('.question')
                .querySelector('.widget .timepicker input');

            input.onchange = sinon.stub();

            // add manual value to fake input
            fakeDateInput.value = '2012-01-01';
            fakeTimeInput.value = '01:01';
            fakeDateInput.dispatchEvent(new Event('change'));

            // timezone info will be added by engine
            expect(input.value.endsWith('-07:00')).to.equal(false);
            expect(input.onchange.callCount).to.equal(1);

            // reset value in fake input manually
            fakeDateInput.value = '';
            fakeDateInput.dispatchEvent(new Event('change'));

            expect(input.value).to.equal('');
            expect(input.onchange.callCount).to.equal(2);
        });
    });

    describe('applyfocus event', () => {
        /** @type {HTMLElement} */
        let container;

        beforeEach(() => {
            container = document.createElement('div');
            document.body.append(container);
        });

        afterEach(() => {
            container.remove();
            document
                .querySelectorAll('body > .datepicker')
                .forEach((el) => el.remove());
        });

        it('does not open the datepicker while the form is hidden', () => {
            // Like on initial load, when the loader hides the form.
            container.style.display = 'none';
            const datetimepicker = initForm(FORM, container);

            datetimepicker.element.dispatchEvent(events.ApplyFocus());

            // The picker is only added to <body> when it opens.
            expect(document.querySelector('body > .datepicker')).to.equal(null);
        });

        it('focuses the fake date input when the form is visible', () => {
            const datetimepicker = initForm(FORM, container);
            const fakeDateInput = datetimepicker.question.querySelector(
                '.widget .date input'
            );

            datetimepicker.element.dispatchEvent(events.ApplyFocus());

            expect(document.activeElement).to.equal(fakeDateInput);
        });
    });
});

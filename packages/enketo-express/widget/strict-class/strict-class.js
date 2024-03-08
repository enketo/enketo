import Widget from 'enketo-core/src/js/widget';
import settings from '../../public/js/src/module/settings';

class StrictClass extends Widget {
    static get selector() {
        return 'form';
    }

    static condition() {
        return !!settings.strictViolationSelector;
    }

    _init() {
        const classes = ['required', 'constraint'];

        [
            '[data-oc-required-type="strict"]',
            '[data-oc-constraint-type="strict"]',
        ].forEach((selector, i) => {
            [...this.element.querySelectorAll(selector)]
                .map((el) => el.closest('.question'))
                // If calculation without form control, exclude it;
                .filter((el) => !!el)
                .forEach((el) => el.classList.add(`oc-strict-${classes[i]}`));
        });

        if (settings.relevantIsStrict) {
            [...this.element.querySelectorAll('.or-branch')]
                .map((el) => el.closest('.question, .or-group, .or-group-data'))
                // If calculation without form control, exclude it;
                .filter((el) => !!el)
                .forEach((el) => el.classList.add('oc-strict-relevant'));
        }
    }
}

export default StrictClass;

import pageModule from 'enketo-core/src/js/page';
import $ from 'jquery';
import settings from './settings';
import gui from './gui';

// We don't use the original call, because OC only wants to (sometimes) block strict validation (not regular non-strict)
pageModule._next = function () {
    const that = this;

    this.form.validateContent($(this.current)).then((valid) => {
        const currentIndex = that._getCurrentIndex();
        const next = that._getNext(currentIndex);
        const newIndex = currentIndex + 1;

        if (next) {
            if (valid) {
                that._flipTo(next, newIndex);
            }

            // for strict-validation navigation-blocking, we ignore some errors (compared to Enketo Core module)
            if (!valid && settings.strictViolationSelector) {
                const strictViolations =
                    that.current.matches(settings.strictViolationSelector) ||
                    !!that.current.querySelector(
                        settings.strictViolationSelector
                    );

                if (
                    !strictViolations ||
                    !settings.strictViolationBlocksNavigation
                ) {
                    that._flipTo(next, newIndex);
                    // return newIndex;

                    valid = true;
                } else {
                    gui.alertStrictBlock();
                }
            }
        }

        return valid;
    });
};

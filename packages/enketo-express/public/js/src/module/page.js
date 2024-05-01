import pageModule from 'enketo-core/src/js/page';
import $ from 'jquery';
import settings from './settings';
import gui from './gui';

// Contains fix for https://github.com/OpenClinica/enketo-express-oc/issues/720
// This function should be removed once PR https://github.com/enketo/enketo/pull/1286 is merged
// and published
pageModule.flipToPageContaining = function ($e) {
    const e = $e[0];
    const closestPage = e.closest('[role="page"]');

    if (closestPage) {
        this._flipTo(closestPage);
    } else if (e.closest('.question')) {
        // If $e is a comment question, and it is not inside a group, there will be no closestPage.
        const referer = e.querySelector('[data-for]');
        const ancestor = e.closest('.or-repeat, form.or');
        if (referer && ancestor) {
            const linkedQuestion = ancestor.querySelector(
                `[name="${referer.dataset.for}"]`
            );
            if (linkedQuestion) {
                this._flipTo(linkedQuestion.closest('[role="page"]'));
            }
        }
    }
    this.$toc.parent().find('.pages-toc__overlay').click();
};

// const originalPageModuleNext = pageModule._next;

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

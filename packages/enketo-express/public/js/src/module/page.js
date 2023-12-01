import pageModule from 'enketo-core/src/js/page';
import { getAncestors } from 'enketo-core/src/js/dom-utils';
import $ from 'jquery';
import events from './event';
import reasons from './reasons';
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

/*
 * The only thing we want to change in this function for OC,
 * is to NOT flip to the next page when a repeat is the same as a page and
 * and a new repeat instance is created,
 * while there are empty reason-for-change fields.
 */
pageModule.setRepeatHandlers = function () {
    this.form.view.html.addEventListener(events.AddRepeat().type, (event) => {
        this._updateAllActive();

        // ---------- Custom OC --------------
        if (
            event.target.getAttribute('role') === 'page' &&
            !reasons.validate()
        ) {
            this.toggleButtons();
        }
        // ------- End of Custom OC ----------

        // Don't flip if the user didn't create the repeat with the + button.
        // or if is the default first instance created during loading.
        // except if the new repeat is actually the first page in the form, or contains the first page
        if (
            event.detail.trigger === 'user' ||
            this.activePages[0] === event.target ||
            getAncestors(this.activePages[0], '.or-repeat').includes(
                event.target
            )
        ) {
            this.flipToPageContaining($(event.target));
        } else {
            this._toggleButtons();
        }
    });

    this.form.view.html.addEventListener(
        events.RemoveRepeat().type,
        (event) => {
            // if the current page is removed
            // note that that.current will have length 1 even if it was removed from DOM!
            if (this.current && this.current.closest('html')) {
                this._updateAllActive();
                let $target = $(event.target).prev();
                if ($target.length === 0) {
                    $target = $(event.target);
                }
                // is it best to go to previous page always?
                this.flipToPageContaining($target);
            }
        }
    );
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

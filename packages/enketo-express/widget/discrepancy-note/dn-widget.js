/* eslint-disable class-methods-use-this */
import Widget from 'enketo-core/src/js/widget';
import { getSiblingElements } from 'enketo-core/src/js/dom-utils';
import $ from 'jquery';
import { t } from '../../public/js/src/module/translator';
import settings from '../../public/js/src/module/settings';
import events from '../../public/js/src/module/event';
import fileManager from '../../public/js/src/module/file-manager';
import { Form } from '../../public/js/src/module/form';
import reasons from '../../public/js/src/module/reasons';

let currentUser;
let users;
let annotationIconDataUri;
const SYSTEM_USER = 'root';

const pad2 = (x) => (x < 10 ? `0${x}` : x);

/**
 * Visually transforms a question into a comment modal that can be shown on its linked question.
 */
class Comment extends Widget {
    static get selector() {
        return '.or-appearance-dn input[type="text"][data-for], .or-appearance-dn textarea[data-for]';
    }

    static get helpersRequired() {
        return ['input', 'pathToAbsolute', 'evaluate', 'getModelValue'];
    }

    _init() {
        this.linkedQuestion = this._getLinkedQuestion(this.element);

        if (this.linkedQuestion) {
            this.ordinal = 0;
            this.readOnly = this.element.readOnly;

            const linkedInput = this.linkedQuestion.querySelector(
                'input:not(.ignore), textarea:not(.ignore)'
            );
            const linkedReadonlySelect = this.linkedQuestion.querySelector(
                'select:not(.ignore)[readonly]'
            );
            this.linkedQuestionReadonly = !!(
                (linkedInput && linkedInput.readOnly) ||
                linkedReadonlySelect
            );

            // DEBUG
            // const populate = Math.random() < 0.5;
            // this.element.value = populate ? '{"queries":[{"type":"annotation", "id":"7","date_time":"2019-05-03 11:08:42.242 -06:00","comment":"Source file can be found in the cabin. Forcing ellipsis cut-off hopefully. Forcing ellipsis cut-off hopefully. Forcing ellipsis cut-off hopefully, if all goes very veryveryveryveryveryveryveryverywell.","assigned_to":"","notify":false,"thread_id":"123456"},{"type":"annotation","id":"6","date_time":"2019-05-03 11:08:35.031 -06:00","comment":"The data is out of normal range.","assigned_to":"","notify":false,"thread_id":"123","user":null},{"type":"comment","id":"5", "date_time":"2019-05-03 11:08:31.064 -06:00","comment":"The data should be within 10% of last visit. Please confirm.","status":"updated","assigned_to":"","notify":false,"thread_id":"abc","user":"honoria"},{"type":"comment","id":"4","date_time":"2019-05-03 11:08:26.532 -06:00","comment":"The data is outside normal range. Here is another sentence to force ellipsis cut-off. Please Confirm. Please Confirm. Please Confirm. Please Confirm. Please Confirm.Please confirm.","status":"updated","assigned_to":"","notify":false,"user":null},{"type":"comment","id":"3","date_time":"2019-05-03 11:08:22.892 -06:00","comment":"This field is required.","status":"updated","assigned_to":"honoria","notify":false,"thread_id":"ghi","visible_thread_id": "M001", "user":null},{"type":"comment","id":"2","date_time":"2019-05-03 11:08:16.987 -06:00","comment":"I do not agree.","status":"updated","assigned_to":"honoria","notify":true,"thread_id":"def","user":null},{"type":"comment","id":"1","date_time":"2019-05-03 11:08:06.802 -06:00","comment":"Some outrageous comment.","status":"new","assigned_to":"honoria","notify":false,"thread_id":"abc","user":null}],"logs":[]}' : '';

            this.notes = this._parseModelFromString(this.element.value);
            this.threadNameMap = this._generateThreadNameMap(this.notes);

            this.defaultAssignee = this._getDefaultAssignee(this.notes);
            this.question.classList.add('hide');
            this.question.setAttribute('role', 'comment');
            // Any <button> inside a <label> receives click events if the <label> is clicked!
            // See http://codepen.io/MartijnR/pen/rWJeOG?editors=1111
            const commentButton = document
                .createRange()
                .createContextualFragment(
                    '<a class="btn-icon-only btn-comment btn-dn" tabindex="-1" type="button" href="#"><i class="icon"> </i></a>'
                );
            const lastLabel = [
                ...this.linkedQuestion.querySelectorAll('.question-label'),
            ].slice(-1)[0];
            if (!lastLabel) {
                /*
                 * https://github.com/OpenClinica/enketo-express-oc/issues/238
                 *
                 * Offically there is no support for questions without a label, but unfortunately, some forms were created like this.
                 * We just want the widget to keep working (not crash) but accept visual issues (e.g. long hints may overlap icon).
                 */
                const alternative = this.linkedQuestion.querySelector(
                    '.required, .or-hint'
                );
                if (alternative) {
                    alternative.before(commentButton);
                } else {
                    // if there is a hint, this makes it nearly impossible to click the comment button, so we use this if only as last resort.
                    this.linkedQuestion.prepend(commentButton);
                }
            } else {
                lastLabel.after(commentButton);
            }
            this.commentButton = this.linkedQuestion.querySelector('.btn-dn');
            this._setCommentButtonState(
                this._getCurrentStatus(this.notes),
                this._hasAnnotation(this.notes),
                this._hasMultipleOpenQueries(this.notes)
            );
            this._setUsers();
            this._setUserOptions(this.readOnly);
            this._setCommentButtonHandler();
            this._setValidationHandler();
            this._setDisabledHandler();
            this._setValueChangeHandler();
            this._setCloseHandler();
            this._setFocusHandler();
            this._setConstraintEvaluationHandler();
            this._setRepeatRemovalReasonChangeHandler();
            this._setPrintOptimizationHandler();
            this._setAnnotationIconDataUri();
        }
    }

    /**
     * This function should only be called by init (upon load).
     *
     * @param notes
     * @return {string} [description]
     */
    _getDefaultAssignee(notes) {
        let defaultAssignee = '';

        notes.queries
            .concat(notes.logs)
            .sort(this._datetimeDesc.bind(this))
            .some((item) => {
                if (item.user === SYSTEM_USER) {
                    return false;
                }
                defaultAssignee = item.user || '';

                return true;
            });

        return defaultAssignee;
    }

    _getLinkedQuestion(element) {
        const contextPath = this.options.helpers.input.getName(element);
        const targetPath = element.dataset.for.trim();
        const absoluteTargetPath = this.options.helpers.pathToAbsolute(
            targetPath,
            contextPath
        );
        // The root is nearest repeat or otherwise nearest form. This avoids having to calculate indices, without
        // diminishing the flexibility in any meaningful way,
        // as it e.g. wouldn't make sense to place a comment node for a top-level question, inside a repeat.
        const root = element.closest('form.or, .or-repeat');

        return this.options.helpers.input.getWrapNode(
            root.querySelector(
                `[name="${absoluteTargetPath}"]:not([data-event="xforms-value-changed"]), [data-name="${absoluteTargetPath}"]:not([data-event="xforms-value-changed"])`
            )
        );
    }

    _setCommentButtonState(state = '', annotation = false, multi = false) {
        this.commentButton.classList.remove(
            'new',
            'closed',
            'closed-modified',
            'updated',
            'invalid'
        );
        if (state) {
            this.commentButton.classList.add(state);
        }
        this.commentButton.classList.toggle(
            'multi',
            state !== 'closed' && state !== 'closed-modified' && multi
        );
        this.commentButton.classList.toggle('annotation', annotation);
    }

    _commentHasError() {
        return (
            this.question.classList.contains('invalid-required') ||
            this.question.classList.contains('invalid-constraint')
        );
    }

    _setCommentButtonHandler() {
        this.commentButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (this._isCommentModalShown(this.linkedQuestion)) {
                this._hideCommentModal(this.linkedQuestion);
                // Note there is an edge case where a disabled (non-relevant) question (as page) does not get hidden
                // and we need to make sure the DN widget get disabled in that case.
                // https://github.com/OpenClinica/enketo-express-oc/issues/459
            } else if (!this.linkedQuestion.matches('.disabled')) {
                this.linkedQuestionErrorMsg = this._getCurrentErrorMsg();
                this._showCommentModal();
            }
        });
    }

    _setValidationHandler() {
        // Update query icon if query question is invalid.
        this.question.addEventListener(events.Invalidated().type, () => {
            this._setCommentButtonState(
                'invalid',
                this._hasAnnotation(this.notes),
                this._hasMultipleOpenQueries(this.notes)
            );
        });
    }

    _setPrintOptimizationHandler() {
        this.question.addEventListener(
            events.Printify().type,
            this._printify.bind(this)
        );
        this.question.addEventListener(
            events.DePrintify().type,
            this._deprintify.bind(this)
        );
    }

    _setCloseHandler() {
        this.linkedQuestion.addEventListener(
            events.AddQuery().type,
            (event) => {
                let errorMsg = '';
                const q = event.target;
                const currentStatus = this._getCurrentStatus(this.notes);
                const irrelevantGroupAncestor = q.closest('.invalid-relevant');

                if (irrelevantGroupAncestor) {
                    const value = this.options.helpers.getModelValue(
                        $(
                            this.linkedQuestion.querySelector(
                                'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)'
                            )
                        )
                    );
                    if (
                        value &&
                        currentStatus !== 'updated' &&
                        currentStatus !== 'new'
                    ) {
                        // This query may not always select the correct error message if the group contains multiple irrelevant error messages
                        const errorEl = irrelevantGroupAncestor
                            ? irrelevantGroupAncestor.querySelector(
                                  '.or-relevant-msg.active'
                              )
                            : null;
                        errorMsg = errorEl ? errorEl.textContent : '';
                    }
                } else if (
                    currentStatus !== 'updated' &&
                    currentStatus !== 'new'
                ) {
                    errorMsg = this._getCurrentErrorMsg();
                    if (!errorMsg && q.classList.contains('invalid-relevant')) {
                        const errorEl = q.querySelector(
                            '.or-relevant-msg.active'
                        );
                        errorMsg = errorEl ? errorEl.textContent : null;
                    }
                }

                if (errorMsg) {
                    // Always a new thread
                    this._addQuery(
                        t('widget.dn.autoconstraint', {
                            errorMsg,
                            interpolation: {
                                escapeValue: false,
                            },
                        }),
                        'new',
                        '',
                        false,
                        SYSTEM_USER
                    );
                }
            }
        );
    }

    _setFocusHandler() {
        this.element.addEventListener(events.ApplyFocus().type, () => {
            if (this.commentButton.offsetHeight) {
                this.commentButton.click();
                const threadId = decodeURIComponent(document.location.hash)
                    .substring(1)
                    .split('#')[1];
                if (threadId) {
                    const link = this.nav.querySelector(
                        `a[data-thread="${threadId}"]`
                    );
                    if (link) {
                        link.click();
                    }
                    // For certain views, don't open the only thread automatically upon load
                    // if no thread is specified.
                } else if (
                    !settings.openSingleDnThreadAutomaticallyUponLoadAndGoToDn
                ) {
                    const link = this.nav.querySelector('a#dn-history');
                    if (link) {
                        link.click();
                    }
                }
            } else {
                this.question.dispatchEvent(events.GoToIrrelevant());
            }
        });
    }

    /**
     * Observes the disabled state of the linked question, and automatically generates
     * an autoquery:
     * 1. The question gets disabled and any query threads are currently 'open'.
     */
    _setDisabledHandler() {
        const target = this.linkedQuestion.querySelector(
            'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)'
        );

        this.linkedQuestion.addEventListener(events.Hiding().type, () => {
            // For now there is no need to double-check if this question has a relevant attribute
            // or has an ancestor group with a relevant attribute. This is because we trust that
            // the "hiding" event is sent only for branches or its children when being closed (by the branch module).
            const linkedVal = this.options.helpers.input.getVal(target);
            // Note that getVal() can return an empty array.

            this._getThreadFirsts(this.notes).forEach((item) => {
                const status = this._getQueryThreadStatus(
                    this.notes,
                    item.thread_id
                );
                const open = status === 'updated' || status === 'new';
                /*
                 * If during a session a query is closed, and this triggers a contraintUpdate of the linked question,
                 * we do not want to generate an autoquery.
                 *
                 * updated.fullPath includes positions (of repeats) which we need to strip
                 */
                if (open && linkedVal.length === 0) {
                    // This will not be triggered if a form is loaded with a value for an irrelevant question and an open query.
                    this._addQuery(
                        t('widget.dn.autoclosed'),
                        'closed',
                        '',
                        false,
                        SYSTEM_USER,
                        'comment',
                        item.thread_id || 'NULL'
                    );
                }
            });
        });
    }

    /**
     * Listens to a value change of the linked question and generates an audit log (and optionally a query).
     */
    _setValueChangeHandler() {
        const that = this;
        let previousValue = this.options.helpers.getModelValue(
            $(
                this.linkedQuestion.querySelector(
                    'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)'
                )
            )
        );

        $(this.linkedQuestion).on(
            `${events.XFormsValueChanged().type} ${events.InputUpdate().type}`,
            (evt) => {
                const currentValue = that.options.helpers.getModelValue(
                    $(evt.target)
                );

                if (previousValue !== currentValue) {
                    that._createAudit(evt, currentValue, previousValue);
                    previousValue = currentValue;
                }
            }
        );

        this.linkedQuestion.addEventListener(
            events.FakeInputUpdate().type,
            (evt) => {
                // For this special event we can assume previousValue was '' because OC does not use defaults.
                const currentValue = that.options.helpers.getModelValue(
                    $(evt.target)
                );
                this._createAudit(evt, currentValue, '');
                previousValue = currentValue;
            }
        );
    }

    _createAudit(evt, currentValue, previousValue) {
        let comment;
        // Note obtaining the values like this does not work for file input types, but since have a different
        // change comment for those that doesn't mention the filename, we don't need to fix that.
        if (evt.target.type !== 'file') {
            comment = t('widget.dn.valuechange', {
                new: `"${this._getLabelForSelectValue(currentValue)}"`,
                previous: `"${this._getLabelForSelectValue(previousValue)}"`,
            });
        } else {
            comment = currentValue
                ? t('widget.dn.newfile')
                : t('widget.dn.fileremoved');
        }

        this._addAudit(comment, '', false);

        if (settings.reasonForChange && !this.linkedQuestionReadonly) {
            const reasonQuestion = reasons.addField(this.linkedQuestion);

            if (reasonQuestion) {
                reasonQuestion.addEventListener(events.Change().type, (evt) => {
                    // Also for empty onchange values
                    // TODO: exclude empty values if RFC field never had a value?
                    this._addReason(evt.target.value);
                    reasons.setSubmitted(evt.target);
                });
                reasonQuestion.addEventListener(
                    events.ReasonChange().type,
                    (evt) => {
                        if (evt.detail && evt.detail.type === 'autoquery') {
                            this._addQuery(
                                evt.detail.reason,
                                'new',
                                '',
                                false,
                                SYSTEM_USER
                            );
                        }
                    }
                );
                reasonQuestion.addEventListener('input', (evt) => {
                    if (evt.target.value && evt.target.value.trim()) {
                        reasons.setEdited(evt.target);
                    }
                });
            }

            reasons.applyToAll();
        }

        previousValue = currentValue;

        comment = t('widget.dn.closedmodified');
        this._getThreadFirsts(this.notes).forEach((item) => {
            const status = this._getQueryThreadStatus(
                this.notes,
                item.thread_id
            );
            if (status === 'closed') {
                this._addQuery(
                    comment,
                    'closed-modified',
                    '',
                    false,
                    SYSTEM_USER,
                    'comment',
                    item.thread_id || 'NULL'
                );
            }
        });
    }

    /**
     * Finding display label belonging to a select option value.
     * Borrowed code from enketo-core's replaceChoiceNameFn function.
     *
     * @param {*} value
     */
    _getLabelForSelectValue(value) {
        const labels = [];
        const multiple = !!this.linkedQuestion.querySelector(
            'select[multiple]:not(.ignore), input[type="checkbox"]:not(.ignore)'
        );
        const values = multiple ? value.split(' ') : [value];
        let control;

        if (values[0]) {
            if (
                this.linkedQuestion.classList.contains('simple-select') ||
                // support horizontal-compact and no-buttons appearance
                // https://github.com/OpenClinica/enketo-express-oc/issues/460
                // https://jira.openclinica.com/browse/OC-14577
                this.linkedQuestion.classList.contains(
                    'or-appearance-horizontal-compact'
                ) ||
                this.linkedQuestion.classList.contains(
                    'or-appearance-no-buttons'
                )
            ) {
                // checkboxes, radio buttons
                values.forEach((val) => {
                    const input = this.linkedQuestion.querySelector(
                        `[value="${val}"]`
                    );
                    // If the list of options was updated (choice-filter / predicate), the input
                    // may not exist. https://github.com/OpenClinica/enketo-express-oc/issues/467
                    // This means we cannot lookup the label and will just return the value instead.
                    // If not acceptable we'd have to cache the labels of previous values. Probably prone to bugs.
                    if (input) {
                        const labelEls = getSiblingElements(
                            input,
                            '.option-label.active'
                        );
                        if (labelEls.length) {
                            labels.push(labelEls[0].textContent);
                        }
                    }
                });
            } else if (
                (control = this.linkedQuestion.querySelector(
                    'select:not(.ignore)'
                ))
            ) {
                // pulldown selects
                values.forEach((val) => {
                    const option = control.querySelector(`[value="${val}"]`);
                    if (option) {
                        labels.push(option.textContent);
                    }
                });
            } else if (
                (control = this.linkedQuestion.querySelector(
                    'input[list]:not(.ignore)'
                ))
            ) {
                // autocomplete widgets
                const list = control.getAttribute('list');
                const siblingListEls = getSiblingElements(
                    control,
                    `datalist#${CSS.escape(list)}`
                );
                if (siblingListEls.length) {
                    const optionEl = siblingListEls[0].querySelector(
                        `[data-value="${value}"]`
                    );
                    if (optionEl) {
                        labels.push(optionEl.getAttribute('value'));
                    }
                }
            }
        }

        // If length is unequal just give up. I think this cannot occur.
        if (labels.length && labels.length === values.length) {
            return labels
                .map((label, i) => `${label} (${values[i]})`)
                .join(', ');
        }

        return value;
    }

    _setRepeatRemovalReasonChangeHandler() {
        const that = this;
        if (settings.reasonForChange && !that.linkedQuestionReadonly) {
            this.linkedQuestion.addEventListener(
                events.ReasonChange().type,
                function (event) {
                    if (event.detail && event.detail.type === 'remove') {
                        if (event.detail.reason) {
                            that._addReason(event.detail.reason);
                            reasons.removeField(this);
                        } else {
                            console.error('no reason provided');
                        }
                    }
                }
            );
        }
    }

    /**
     * Listen for a custom constraintevaluated.oc event in order to create a query if the status is closed.
     *
     * This listener is meant for the following situation:
     * 1. a form is loaded with a query for question A with status 'closed' and a constraint that has a dependency on question B
     * 2. the value of question B is changed, triggering a re-evaluation of the constraint of question A
     * 3. regardless of the constraint evaluation result, this should add an autoquery to A and change the status to closed-modified
     */
    _setConstraintEvaluationHandler() {
        const that = this;
        $(this.linkedQuestion).on(
            'constraintevaluated.oc',
            (event, updated) => {
                that._getThreadFirsts(that.notes).forEach((item) => {
                    const status = that._getQueryThreadStatus(
                        that.notes,
                        item.thread_id
                    );
                    /*
                     * If during a session a query is closed, and this triggers a contraintUpdate of the linked question,
                     * we do not want to generate an autoquery.
                     *
                     * updated.fullPath includes positions (of repeats) which we need to strip
                     */
                    if (
                        status === 'closed' &&
                        updated.fullPath.replace(/\[\d+\]/g, '') !==
                            that.element.getAttribute('name')
                    ) {
                        that._addQuery(
                            t('widget.dn.closedmodified'),
                            'closed-modified',
                            '',
                            false,
                            SYSTEM_USER,
                            'comment',
                            item.thread_id || 'NULL'
                        );
                    }
                });
            }
        );
    }

    _isCommentModalShown(linkedQuestion) {
        return !!linkedQuestion.querySelector('.or-comment-widget');
    }

    /**
     * If the linked question is not shown full width, ensure that the comment question is.
     * This correction is meant for the Grid Theme.
     *
     */
    _getFullWidthStyleCorrection() {
        const form = this.linkedQuestion.closest('form');
        const closestRepeat = this.linkedQuestion.closest('.or-repeat');
        const fullWidth = closestRepeat
            ? closestRepeat.offsetWidth
            : form.offsetWidth;
        // select the first question on the current page
        const firstQuestionOnCurrentPage =
            form.querySelector(
                '[role="page"].current.question, [role="page"].current .question'
            ) || form.querySelector('.question');
        const mostLeft = $(firstQuestionOnCurrentPage).position().left;
        const linkedQuestionWidth = this.linkedQuestion.offsetWidth;
        const linkedQuestionLeft = $(this.linkedQuestion).position().left;

        // By correcting the left we can make this function agnostic to themes.
        return {
            width: `${(fullWidth * 100) / linkedQuestionWidth}%`,
            left: `${
                ((mostLeft - linkedQuestionLeft) * 100) / linkedQuestionWidth
            }%`,
        };
    }

    _showCommentModal() {
        const range = document.createRange();
        const closeButtonHtml =
            '<button class="btn-icon-only or-comment-widget__content__btn-close-x" type="button">&times;</button>';
        const newQueryButtonHtml = `<button class="btn btn-primary small" data-type="comment"><span class="icon icon-plus"> </span> ${t(
            'widget.dn.addnewtext'
        )}</button>`;
        const newAnnotationButtonHtml = `<button class="btn btn-primary small" data-type="annotation"><span class="icon icon-plus"> </span> ${t(
            'widget.dn.addnewtext'
        )}</button>`;
        this.element.closest('form').dispatchEvent(events.Heartbeat());
        const fragment = range.createContextualFragment(
            `<section class="widget or-comment-widget">
                <div class="or-comment-widget__overlay--click-preventer"></div>
                <input class="ignore or-comment-widget__view-toggle" type="checkbox" name="dn-view-toggle"/>
                <div class="or-comment-widget__nav">
                    <div class="border">
                        <h3 class="or-comment-widget__nav__main">
                            <a id="dn-history" href="#" data-thread="*">${t(
                                'widget.dn.allhistory'
                            )}</a>
                        </h3>
                        <h3 class="or-comment-widget__nav__main"><span class="or-comment-widget__nav__main__title">${t(
                            'widget.dn.queries'
                        )}</span>
                            ${
                                settings.type !== 'view'
                                    ? newQueryButtonHtml
                                    : ''
                            }
                        </h3>
                        <ul>
                            ${this._getThreadFirsts(this.notes, 'comment')
                                .map(
                                    (item) =>
                                        `<li class="or-comment-widget__nav__item">
                                        <a href="#"  data-type="comment" data-thread="${
                                            item.thread_id || 'NULL'
                                        }">
                                            <span class="or-comment-widget__nav__item__start">
                                                <span class="or-comment-widget__nav__item__start__icon icon ${this._getQueryThreadStatus(
                                                    this.notes,
                                                    item.thread_id
                                                )}"> </span>
                                                <span class="or-comment-widget__nav__item__start__id">${
                                                    item.visible_thread_id
                                                        ? item.visible_thread_id
                                                        : ''
                                                }
                                                </span>
                                            </span>
                                            <span class="or-comment-widget__nav__item__text ${
                                                item.comment.length < 66
                                                    ? 'short'
                                                    : ''
                                            }"><span>${
                                            item.comment
                                        }</span></span>
                                        </a>
                                    </li>`
                                )
                                .join('')}
                        </ul>
                        <h3 class="or-comment-widget__nav__main"><span class="or-comment-widget__nav__main__title">${t(
                            'widget.dn.annotations'
                        )}</span>
                            ${
                                settings.type !== 'view'
                                    ? newAnnotationButtonHtml
                                    : ''
                            }
                        </h3>
                        <ul>
                            ${this._getThreadFirsts(this.notes, 'annotation')
                                .map(
                                    (item) =>
                                        `<li  class="or-comment-widget__nav__item">
                                        <a href="#"  data-type="annotation" data-thread="${
                                            item.thread_id || 'NULL'
                                        }">
                                            <span class="or-comment-widget__nav__item__start">
                                                <span class="or-comment-widget__nav__item__start__icon icon icon-dn-annotation"> </span>
                                            </span>
                                            <span class="or-comment-widget__nav__item__text ${
                                                item.comment.length < 66
                                                    ? 'short'
                                                    : ''
                                            }"><span>${
                                            item.comment
                                        }</span></span>
                                        </a>
                                    </li>`
                                )
                                .join('')}
                        </ul>
                    </div>
                </div>
                <div class="or-comment-widget__content">
                    ${closeButtonHtml}
                    <form onsubmit="return false;" class="or-comment-widget__content__form" autocomplete="off"></form>
                    <div class="or-comment-widget__content__history">
                        <div class="or-comment-widget__content__history__content"></div>
                            <span class="or-comment-widget__content__history__value-change-filler"></span>
                            <input id="dn-show-value-changes" class="or-comment-widget__content__history__value-change-toggle ignore" type="checkbox" name="show-value-changes" checked />
                            <label for="dn-show-value-changes" class="option-label">${t(
                                'widget.dn.showvaluechanges'
                            )}</span>
                        </div>
                    </div>
                </div>
            </section>`
        );

        const oldWidget =
            this.linkedQuestion.querySelector('.or-comment-widget');
        if (oldWidget) {
            oldWidget.remove();
        }
        this.linkedQuestion.prepend(fragment);

        const overlayFragment = range.createContextualFragment(
            '<div class="or-comment-widget__overlay--shadow-giver"></div>'
        );
        this.linkedQuestion.before(overlayFragment);

        const widget = this.linkedQuestion.querySelector('.or-comment-widget');
        this.history = widget.querySelector(
            '.or-comment-widget__content__history'
        );

        const viewToggle = widget.querySelector(
            '.or-comment-widget__view-toggle'
        );
        this.nav = widget.querySelector('.or-comment-widget__nav');
        this.nav.querySelectorAll('a, button').forEach((el) => {
            el.addEventListener('click', (event) => {
                event.preventDefault();
                viewToggle.checked = true;
                if (el.classList.contains('active')) {
                    return false;
                }
                this.nav.querySelectorAll('a, button').forEach((el) => {
                    el.classList.remove('active');
                    el.disabled = false;
                });
                if (event.currentTarget.nodeName.toLowerCase() === 'a') {
                    event.currentTarget.classList.add('active');
                } else {
                    event.currentTarget.disabled = true;
                }
                this._switch(event);
            });
        });

        const openThreadFirsts = this._getThreadFirsts(this.notes).filter(
            (item) => {
                const status = this._getQueryThreadStatus(
                    this.notes,
                    item.thread_id
                );

                return status === 'updated' || status === 'new';
            }
        );

        if (openThreadFirsts.length === 1) {
            const threadId = openThreadFirsts[0].thread_id || 'NULL';
            this.nav.querySelector(`a[data-thread="${threadId}"]`).click();
        } else {
            this.nav.querySelector('#dn-history').click();
        }

        viewToggle.checked = false;

        // Display widget in full form width even if its linked question is not a full row (in the Grid theme)
        Object.entries(this._getFullWidthStyleCorrection()).forEach((o) => {
            widget.style[o[0]] = o[1];
        });

        // https://github.com/OpenClinica/enketo-express-oc/issues/495
        this._mapChecker();

        const closeButton = widget.querySelector(
            '.or-comment-widget__content__btn-close-x'
        );
        const overlay = widget.querySelector(
            '.or-comment-widget__overlay--click-preventer'
        );
        [closeButton, overlay].forEach((el) => {
            el.addEventListener('click', (event) => {
                this._hideCommentModal(this.linkedQuestion);
                event.preventDefault();
                event.stopPropagation();
            });
        });
    }

    _mapChecker() {
        const root = this.element.closest('form');
        const maps = Array.from(
            root.querySelectorAll('.or-appearance-image-map')
        );
        const ready = maps.every((map) => map.querySelector('svg'));

        let count = 0;
        if (!ready) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (
                        mutation.attributeName === 'viewBox' &&
                        mutation.target.tagName === 'svg'
                    ) {
                        count++;
                        if (count === maps.length) {
                            this._scrollToview();
                            mutationObserver.disconnect();
                        }
                    }
                });
            });

            mutationObserver.observe(root, {
                attributes: true,
                childList: true,
                subtree: true,
            });
        } else {
            this._scrollToview();
        }
    }

    _scrollToview() {
        const queryModal = this.linkedQuestion.querySelector(
            '.widget.or-comment-widget'
        );
        const option = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
        };
        if (
            window.innerHeight - this.linkedQuestion.offsetHeight <
            queryModal.offsetHeight
        ) {
            queryModal.scrollIntoView(option);
        } else {
            this.linkedQuestion.scrollIntoView(option);
        }
    }

    // switches the right pane of the widget that shows the form (optionally) and the thread content
    _switch(event) {
        this.type = event.currentTarget.dataset.type;
        this.threadId = event.currentTarget.dataset.thread;
        this._renderForm();
        this._renderHistory();
    }

    _hideCommentModal(linkedQuestion) {
        this.element.closest('form').dispatchEvent(events.Heartbeat());
        linkedQuestion.querySelector('.or-comment-widget').remove();
        linkedQuestion
            .closest('.or, .or-group, .or-group-data')
            .querySelector('.or-comment-widget__overlay--shadow-giver')
            .remove();
    }

    /**
     * Sets users and currentUser global variables (once for all dn widgets);
     */
    _setUsers() {
        if (!users) {
            try {
                const userNodes = this.options.helpers.evaluate(
                    'instance("_users")/root/item',
                    'nodes',
                    null,
                    null,
                    true
                );
                // doing this in 2 steps as it is likely useful later on to store the users array separately.
                users = userNodes.map((item) => ({
                    firstName: item.querySelector('first_name').textContent,
                    lastName: item.querySelector('last_name').textContent,
                    userName: item.querySelector('user_name').textContent,
                }));
                const currentUsernameNode = this.options.helpers.evaluate(
                    'instance("_users")/root/item[@current]/user_name',
                    'node',
                    null,
                    null,
                    true
                );
                currentUser = currentUsernameNode
                    ? currentUsernameNode.textContent
                    : null;
            } catch (e) {
                console.error(e);
            }
        }
    }

    /**
     * @param {boolean=} readOnly
     */
    _setUserOptions(readOnly) {
        const disabled = readOnly ? 'disabled' : '';
        const { defaultAssignee } = this;
        this.usersOptionsHtml = `<option value="" ${disabled}></option>${users.map(
            (user) => {
                const readableName = `${user.firstName} ${user.lastName} (${user.userName})`;
                const selected =
                    user.userName === defaultAssignee ? ' selected ' : '';

                return `<option value="${user.userName}"${selected}${disabled}>${readableName}</option>`;
            }
        )}`;
    }

    _getCurrentErrorMsg() {
        if (this.linkedQuestion.classList.contains('invalid-required')) {
            const el = this.linkedQuestion.querySelector(
                '.or-required-msg.active'
            );

            return el ? el.textContent : '';
        }

        return Form.prototype.constraintClassesInvalid
            .map((invalidClass) => {
                if (this.linkedQuestion.classList.contains(invalidClass)) {
                    const el = this.linkedQuestion.querySelector(
                        `.${invalidClass.replace('invalid-', 'or-')}-msg.active`
                    );

                    return el ? el.textContent : undefined;
                }
            })
            .filter((msg) => msg)
            .join(' | ');
    }

    _parseModelFromString(str) {
        try {
            if (str.trim().length > 0) {
                const model = JSON.parse(str);
                if (typeof model !== 'object' || Array.isArray(model)) {
                    throw new Error('Parsed JSON is not an object.');
                }
                if (typeof model.queries === 'undefined') {
                    model.queries = [];
                }
                if (typeof model.logs === 'undefined') {
                    model.logs = [];
                }

                return model;
            }
            return {
                queries: [],
                logs: [],
            };
        } catch (e) {
            // console.error( e );
            throw new Error('Failed to parse discrepancy notes.');
        }
    }

    _datetimeDesc(a, b) {
        const aDate = new Date(this._getIsoDatetimeStr(a.date_time));
        const bDate = new Date(this._getIsoDatetimeStr(b.date_time));
        if (bDate.toString() === 'Invalid Date' || aDate > bDate) {
            return -1;
        }
        if (aDate.toString() === 'Invalid Date' || aDate < bDate) {
            return 1;
        }

        return 0;
    }

    _getParsedElapsedTimeUpTo7Days(datetimeStr) {
        const dt = new Date(this._getIsoDatetimeStr(datetimeStr));
        if (
            typeof datetimeStr !== 'string' ||
            dt.toString() === 'Invalid Date'
        ) {
            console.error(
                `Could not convert datetime string "${datetimeStr}" to a Date object.`
            );

            return 'error';
        }

        return this._parseElapsedTimeUpTo7Days(new Date() - dt);
    }

    _getReadableDateTime(datetimeStr) {
        const dt = new Date(this._getIsoDatetimeStr(datetimeStr));
        if (
            typeof datetimeStr !== 'string' ||
            dt.toString() === 'Invalid Date'
        ) {
            console.error(
                `Could not convert datetime string "${datetimeStr}" to a Date object.`
            );

            return 'error';
        }

        // 13-Jun-2018 13:58 UTC-04:00
        return `${pad2(dt.getDate())}-${dt.toLocaleDateString('en', {
            month: 'short',
        })}-${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(
            dt.getMinutes()
        )}:${pad2(dt.getSeconds())} UTC${dt.getTimezoneOffsetAsTime()}`;
        // Date.getTimezoneOffsetAsTime is an extension in enketo-xpathjs
    }

    _parseElapsedTimeUpTo7Days(elapsedMilliseconds) {
        // let months;
        let days;
        let hours;
        let minutes;

        if (isNaN(elapsedMilliseconds) || elapsedMilliseconds < -120000) {
            console.error(
                `Could not parse elapsed time for elapsed milliseconds: "${elapsedMilliseconds}"`
            );

            return 'error';
        }

        // To work around negative values due to incorrect times on OC server or client device,
        // we tolerate up to -2 minutes.
        if (elapsedMilliseconds < 0) {
            console.error(
                'Negative time difference of less than 2 minutes. Setting to "Just Now"'
            );
            elapsedMilliseconds = 1;
        }

        minutes = elapsedMilliseconds / (1000 * 60);

        if (minutes < 0.5) {
            return t('widget.dn.now');
        }
        if (minutes < 59.5) {
            return t('widget.dn.minute', { count: Math.round(minutes) });
        }
        hours = minutes / 60;
        if (hours < 23.5) {
            return t('widget.dn.hour', { count: Math.round(hours) });
        }
        days = hours / 24;
        if (days <= 7) {
            return t('widget.dn.day', { count: Math.round(days) });
        }

        return null;
    }

    _addQuery(
        comment,
        status,
        assignee,
        notify,
        user,
        type = 'comment',
        thread_id = this.options.helpers.evaluate('uuid()', 'string')
    ) {
        const that = this;
        const q = {
            type,
            id: (++this.ordinal).toString(),
            date_time: this._getFormattedCurrentDatetimeStr(),
            comment,
            status,
            assigned_to: assignee,
            notify,
            thread_id,
        };

        if (q.thread_id === 'NULL') {
            delete q.thread_id;
        }

        if (user) {
            q.user = user;
        }

        this.notes.queries.unshift(q);

        // Strip logs from model
        // This also automatically leaves out undefined properties such as status!
        const modelDataStr = JSON.stringify({
            queries: that.notes.queries,
        });

        // Update form control and XML Model
        this.originalInputValue = modelDataStr;
        // If the form has not finished initializing, the originalInputValue setter function (in the Widget super class)
        // won't actually trigger a model change, so we use a special event to delay firing a change event.
        // This event will do nothing after the form has initialized.
        // Issue https://github.com/OpenClinica/enketo-express-oc/issues/393
        this.element.dispatchEvent(events.DelayChange());

        const error = this._commentHasError();
        this._setCommentButtonState(
            error ? 'invalid' : this._getCurrentStatus(this.notes),
            this._hasAnnotation(this.notes),
            this._hasMultipleOpenQueries(this.notes)
        );
    }

    _addAudit(comment, assignee, notify) {
        this.notes.logs.unshift({
            type: 'audit',
            date_time: this._getFormattedCurrentDatetimeStr(),
            comment,
            assigned_to: assignee,
            notify,
        });
    }

    _addReason(reason) {
        let modelDataStr;
        const that = this;
        let q;

        if (!reason) {
            return;
        }

        q = {
            type: 'reason',
            id: (++this.ordinal).toString(),
            date_time: this._getFormattedCurrentDatetimeStr(),
            comment: reason,
        };

        this.notes.queries.unshift(q);

        // strip logs from model
        modelDataStr = JSON.stringify({
            queries: that.notes.queries,
        });

        // update XML Model
        this.element.value = modelDataStr;
        this.element.dispatchEvent(events.Change());
    }

    _getCurrentStatus(notes) {
        let status = '';
        if (!notes.queries || notes.queries.length === 0) {
            return status;
        }

        const threads = this._getThreadFirsts(notes);

        ['new', 'updated', 'closed', 'closed-modified'].some((st) => {
            if (this._existsThreadWithStatus(notes, threads, st)) {
                status = st;

                return true;
            }

            return false;
        });

        return status;
    }

    _existsThreadWithStatus(notes, threads, status) {
        return threads.some(
            (item) =>
                // TODO: this is inefficient, this.notes is filtered and sorted constantly
                this._getQueryThreadStatus(notes, item.thread_id) === status
        );
    }

    _getQueryThreadStatus(notes, threadId) {
        let status = '';
        this._filteredNotes(notes, 'comment', threadId || 'NULL', false)
            .sort(this._datetimeDesc.bind(this))
            .some((item) => {
                if (item.status) {
                    status = item.status;

                    return true;
                }

                return false;
            });

        return status;
    }

    _getFormattedCurrentDatetimeStr() {
        const now = new Date();
        const offset = {};

        offset.minstotal = now.getTimezoneOffset();
        offset.direction = offset.minstotal < 0 ? '+' : '-';
        offset.hrspart = pad2(Math.abs(Math.floor(offset.minstotal / 60)));
        offset.minspart = pad2(Math.abs(Math.floor(offset.minstotal % 60)));

        return new Date(now.getTime() - offset.minstotal * 60 * 1000)
            .toISOString()
            .replace('T', ' ')
            .replace(
                'Z',
                ` ${offset.direction}${offset.hrspart}:${offset.minspart}`
            );
    }

    _getIsoDatetimeStr(dateTimeStr) {
        let parts;
        if (typeof dateTimeStr === 'string') {
            parts = dateTimeStr.split(' ');

            return `${parts[0]}T${parts[1]}${parts[2]}`;
        }

        return dateTimeStr;
    }

    _generateThreadNameMap(notes) {
        return this._filteredNotes(notes, 'comment', '*', false).reduce(
            (map, item) => {
                if (item.thread_id && item.visible_thread_id) {
                    map[item.thread_id] = item.visible_thread_id;
                }

                return map;
            },
            {}
        );
    }

    _renderForm() {
        const form = event.currentTarget
            .closest('.or-comment-widget')
            .querySelector('form');
        [...form.children].forEach((el) => el.remove());

        if (
            event.currentTarget.id === 'dn-history' ||
            (this.type === 'annotation' && this.threadId)
        ) {
            return;
        }
        const range = document.createRange();
        const assignText = t('widget.dn.assignto') || 'Assign To'; // TODO: add string to kobotoolbox/enketo-express
        const notifyText = t('widget.dn.notifytext') || 'Email?'; // TODO: add string to kobotoolbox/enketo-express
        const comment = this.element.closest('.question').cloneNode(true);
        const readOnlyAttr = this.readOnly ? 'readonly ' : '';

        const widget = this.linkedQuestion.querySelector('.or-comment-widget');

        let reopen = false;

        let btnsHtml;
        if (this.type === 'annotation') {
            btnsHtml = `<button name="new" class="btn btn-primary or-comment-widget__content__form__btn-submit" type="button">${t(
                'widget.dn.addannotationbutton'
            )}</button>`;
        } else {
            const status =
                this.type !== 'comment'
                    ? null
                    : this.threadId
                    ? this._getQueryThreadStatus(this.notes, this.threadId)
                    : null;

            if (
                settings.type === 'view' ||
                (!settings.dnCloseButton &&
                    (status === 'closed' || status === 'closed-modified'))
            ) {
                return;
            }

            reopen =
                (status === 'closed' || status === 'closed-modified') &&
                settings.dnCloseButton;
            const newQueryButtonHtml = `<button name="new" class="btn btn-primary or-comment-widget__content__form__btn-submit" type="button">${t(
                'widget.dn.addquerybutton'
            )}</button>`;
            const closeQueryButtonHtml =
                settings.dnCloseButton !== true
                    ? ''
                    : `<button name="closed" class="btn btn-default or-comment-widget__content__form__btn-submit" type="button">${t(
                          'widget.dn.closequerytext'
                      )}</button>`;
            const updateQueryButtonHtml = `<button name="updated" class="btn btn-primary or-comment-widget__content__form__btn-submit" type="button">
                    ${
                        reopen
                            ? t('widget.dn.reopen')
                            : t('widget.comment.update')
                    }
                </button>`;

            if (
                status === 'new' ||
                status === 'updated' ||
                status === 'closed-modified'
            ) {
                btnsHtml = closeQueryButtonHtml + updateQueryButtonHtml;
            } else if (status === 'closed') {
                btnsHtml = updateQueryButtonHtml;
            } else {
                btnsHtml = newQueryButtonHtml;
            }
        }
        let labelText = t('widget.dn.addnewannotation');
        if (this.type === 'comment') {
            if (reopen) {
                labelText = t('widget.dn.reopenlabel');
            } else if (this.threadId) {
                labelText = t('widget.dn.typeresponse');
            } else {
                labelText = t('widget.dn.addnewquery');
            }
        }

        comment.classList.remove('hide', 'question');
        comment.removeAttribute('role');
        comment.querySelector('.question-label').textContent = labelText;

        const input = comment.querySelector('input, textarea');
        input.classList.add('ignore');
        input.removeAttribute('data-for');
        input.removeAttribute(' data-type-xml');
        input.setAttribute('name', 'dn-comment');
        input.value =
            this.type === 'comment' && !this.threadId
                ? this.linkedQuestionErrorMsg
                : '';

        const user =
            this.type === 'annotation' && !this.threadId
                ? ''
                : range.createContextualFragment(
                      `<div class="or-comment-widget__content__form__user">
                <label class="or-comment-widget__content__form__user__dn-assignee">
                    <span>${assignText}</span>
                    <select name="dn-assignee" class="ignore" >${this.usersOptionsHtml}</select>
                </label>
                <div class="or-comment-widget__content__form__user__dn-notify option-wrapper">
                    <label>
                        <input name="dn-notify" class="ignore" value="true" type="checkbox" ${readOnlyAttr}/>
                        <span class="option-label">${notifyText}</span>
                    </label>
                </div>
            </div>`
                  );
        const buttonGroup = range.createContextualFragment(
            `<div class="or-comment-widget__content__form__query-btns">${btnsHtml}</div>`
        );

        form.prepend(comment);
        form.append(user);
        form.append(buttonGroup);

        const queryButtons = widget.querySelectorAll(
            '.or-comment-widget__content__form__query-btns .btn'
        );

        input.addEventListener('input', () => {
            queryButtons.forEach((el) => (el.disabled = !input.value.trim()));
        });
        input.dispatchEvent(new Event('input'));
        input.focus();

        widget
            .querySelector('form.or-comment-widget__content__form')
            .addEventListener('submit', () => {
                const btn = widget.querySelector(
                    '.btn[name="updated"], .btn[name="new"]'
                );
                if (btn) {
                    btn.click();
                }
            });

        queryButtons.forEach((btn) => {
            btn.addEventListener('click', (event) => {
                if (input.value) {
                    const comment = input.value;
                    const assigneeEl = widget.querySelector(
                        'select[name="dn-assignee"]'
                    );
                    const assignee = assigneeEl ? assigneeEl.value : undefined;
                    const notifyEl = widget.querySelector(
                        'input[name="dn-notify"]'
                    );
                    const notify = notifyEl ? notifyEl.checked : undefined;
                    const status =
                        this.type === 'comment'
                            ? event.target.getAttribute('name')
                            : undefined;

                    this._addQuery(
                        comment,
                        status,
                        assignee,
                        notify,
                        null,
                        this.type,
                        this.threadId
                    );
                    input.value = '';
                    this._hideCommentModal(this.linkedQuestion);
                }
                event.preventDefault();
                event.stopPropagation();
            });
        });
    }

    _renderHistory() {
        const range = document.createRange();
        const notesToDisplay = this._filteredNotes(
            this.notes,
            this.type,
            this.threadId || ''
        );
        this.history
            .querySelector('.or-comment-widget__content__history__content')
            .remove();
        this.history
            .querySelectorAll(
                '#dn-show-value-changes, [for="dn-show-value-changes"]'
            )
            .forEach((el) =>
                el.classList.toggle('hide', notesToDisplay.length === 0)
            );

        const htmlStr = `<div class="or-comment-widget__content__history__content">${
            notesToDisplay
                .sort(this._datetimeDesc.bind(this))
                .map((item) => this._getHistoryRow(item))
                .join('') || t('widget.dn.emptyhistorytext')
        }</div>`;

        this.history.append(range.createContextualFragment(htmlStr));

        const widget = this.history.closest('.or-comment-widget');

        widget.querySelectorAll('.tooltip[data-title]').forEach((el) => {
            el.addEventListener('mouseenter', () => {
                const hoverEl = range.createContextualFragment(
                    `<span class="dn-tooltip-visible">${el.dataset.title}</span>`
                );
                const span = hoverEl.querySelector('.dn-tooltip-visible');
                const widgetRect = widget.getBoundingClientRect();
                const elemRect = el.getBoundingClientRect();
                const top = elemRect.top - widgetRect.top - 10;
                span.style.top = `${top}px`;

                widget.append(hoverEl);

                // left can only be calculated after adding tooltip to DOM
                let left =
                    elemRect.left -
                    widgetRect.left -
                    span.getBoundingClientRect().width -
                    10;
                if (left < 0) {
                    left =
                        elemRect.left -
                        widgetRect.left +
                        el.getBoundingClientRect().width +
                        10;
                }

                span.style.left = `${left}px`;
            });
            el.addEventListener('mouseleave', () => {
                const tip = widget.querySelector('.dn-tooltip-visible');
                if (tip) {
                    tip.remove();
                }
            });
        });
    }

    _linkify(comment) {
        // This relies on a auto-generated string with 2 filenames surrounded by quotation marks, e.g.
        // Value changed from "img1.jpg" to "img2.jpg".
        const reg = /"([^"]+)"/g;
        let linkifiedComment = comment;
        let i = 0;
        let results;

        // for first 0, 1, or 2 matches:
        while ((results = reg.exec(comment)) !== null && i < 2) {
            const filename = results[1];
            if (filename) {
                const fileUrl = fileManager.getInstanceAttachmentUrl(filename);
                if (fileUrl) {
                    linkifiedComment = linkifiedComment.replace(
                        filename,
                        `<a target="_blank" rel="noreferrer" href="${fileUrl}">${filename}</a>`
                    );
                }
            }
            i++;
        }

        return linkifiedComment;
    }

    // The annotation icon is not part of font-awesome. In css we use background-image but this it not printed automatically in all browsers
    // so we use an <img> to ensure the icon gets printed (in _getHistoryRow()).
    _setAnnotationIconDataUri() {
        if (!annotationIconDataUri) {
            this.linkedQuestion.append(
                document
                    .createRange()
                    .createContextualFragment(
                        '<span class="temporary icon icon-dn-annotation"> </span>'
                    )
            );
            const icon = this.linkedQuestion.querySelector(
                '.temporary.icon-dn-annotation'
            );
            const cssUri = window.getComputedStyle(icon).backgroundImage;
            const result = /url\("([^)]+)"\)/.exec(cssUri);
            if (result && result[1]) {
                annotationIconDataUri = result[1];
            }
            icon.remove();
        }
    }

    _encodeHtml(str) {
        return str.replace(
            /[&<>'"]/g,
            (tag) =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;',
                }[tag])
        );
    }

    _getHistoryRow(item, options = {}) {
        const types = {
            comment: '<span class="icon fa-comment-o"> </span>',
            audit: '',
            reason: '<span class="icon icon-delta"> </span>',
            annotation: `<span class="icon"><img src="${annotationIconDataUri}"/></span>`,
        };
        if (typeof item.user === 'undefined') {
            item.user = currentUser;
        }
        if (typeof options !== 'object') {
            options = {};
        }
        // const msg = this._linkify( item.comment || item.message );
        const msg = item.comment || item.message;
        const rdDatetime = this._getReadableDateTime(item.date_time);
        const elapsedTime = this._getParsedElapsedTimeUpTo7Days(item.date_time);
        const time =
            options.timestamp === 'datetime'
                ? rdDatetime
                : elapsedTime || rdDatetime.split(' ')[0];
        const fullName = this._parseFullName(item.user) || t('widget.dn.me');
        const initials = this._parseInitials(item.user) || t('widget.dn.me');
        const visibleThreadId = this.threadNameMap[item.thread_id]
            ? `#${this.threadNameMap[item.thread_id]}`
            : '';
        const assignee = !item.assigned_to
            ? visibleThreadId
            : t('widget.dn.assignedto', {
                  id: visibleThreadId,
                  assignee: item.assigned_to,
              }).trim();
        const status = item.status
            ? t('widget.dn.status', { status: item.status })
            : '';

        return `
            <div class="or-comment-widget__content__history__row ${
                item.type === 'audit' ? 'audit' : ''
            }">
                <div class="or-comment-widget__content__history__row__start">
                    <span class="or-comment-widget__content__history__row__start__username tooltip" data-title="${fullName}${
            item.user ? ` (${item.user})` : ''
        }">${options.username === 'full' ? fullName : initials}</span>
                    <span class="or-comment-widget__content__history__row__start__datetime tooltip" data-title="${rdDatetime}">${time}</span>
                </div>
                <div class="or-comment-widget__content__history__row__main${
                    item.type === 'audit' ? '--audit' : ''
                }">
                    <span class="or-comment-widget__content__history__row__main__icon">${
                        types[item.type]
                    }</span>
                    <span class="or-comment-widget__content__history__row__main__comment">
                        <span class="or-comment-widget__content__history__row__main__comment__text">${this._encodeHtml(
                            msg
                        )}</span>
                        <span class="or-comment-widget__content__history__row__main__comment__meta">
                            ${
                                assignee
                                    ? assignee[0].toUpperCase() +
                                      assignee.substring(1)
                                    : ''
                            } ${status}
                        </span>
                    </span>
                </div>
                <div class="or-comment-widget__content__history__row__filler"></div>
            </div>`;
    }

    _parseInitials(user) {
        let initials;

        if (!user) {
            return '';
        }

        users.some((u) => {
            if (u.userName === user) {
                initials = `${u.firstName
                    .substring(0, 1)
                    .toUpperCase()}${u.lastName.substring(0, 1).toUpperCase()}`;

                return true;
            }
        });

        return initials || user.substring(0, 1).toUpperCase();
    }

    _parseFullName(user) {
        let fullName;

        if (!user) {
            return '';
        }

        users.some((u) => {
            if (u.userName === user) {
                fullName = `${u.firstName} ${u.lastName}`;

                return true;
            }
        });

        // use unchanged user as fallback if no match is found
        return fullName || user;
    }

    /**
     * Returns notes of a particular thread, optionally with logs
     *
     * @param {object} notes
     * @param {string} type
     * @param {string} threadId
     * @param {boolean} includeLogs
     */
    _filteredNotes(notes, type, threadId = '*', includeLogs = true) {
        let filtered = !type
            ? notes.queries
            : notes.queries.filter((item) => item.type === type);
        // if threadId is '*' or undefined, include everything
        // if threadId is '', include only those items with that particular empty string value (should be nothing)
        filtered = filtered.filter(
            (item) =>
                threadId === '*' ||
                (threadId === 'NULL' && !item.thread_id) ||
                item.thread_id === threadId
        );

        return includeLogs ? filtered.concat(notes.logs) : filtered;
    }

    /**
     * Returns an array of thread objects
     *
     * @param notes
     * @param {string} type
     */
    _getThreadFirsts(notes, type = 'comment') {
        const threads = [];
        const queries = notes.queries
            .filter((item) => item.type === type)
            .sort(this._datetimeDesc.bind(this));

        // reverse is destructive so we create a copy
        return [...queries].reverse().filter((item) => {
            if (threads.includes(item.thread_id)) {
                return false;
            }
            threads.push(item.thread_id);

            return true;
        });
    }

    _hasAnnotation(notes) {
        return this._filteredNotes(notes, 'annotation', '*', false).length > 0;
    }

    /**
     * Checks if there are more than 1 open queries.
     *
     * @param {*} notes
     * @return {boolean}
     */
    _hasMultipleOpenQueries(notes) {
        let first = null;

        return this._getThreadFirsts(notes, 'comment').some((comment) => {
            const status = this._getQueryThreadStatus(notes, comment.thread_id);
            if (status === 'new' || status === 'updated') {
                if (first) {
                    return true;
                }
                first = true;
            }

            return false;
        });
    }

    // Amend DN question to optimize for printing. Does not have to be undone, as it is not
    // used during regular data entry.
    _printify() {
        let labelText;
        const items = this.notes.queries
            .concat(this.notes.logs)
            .sort(this._datetimeDesc.bind(this));

        // Do not display DN questions that have no history.
        if (items.length === 0) {
            return;
        }

        if (this.linkedQuestion.matches('.or-appearance-analog-scale')) {
            const $clone = $(this.linkedQuestion)
                .find('.question-label.widget.active')
                .clone();
            $clone.find('ul, br').remove();
            labelText = $clone.text();
        } else {
            labelText = $(this.linkedQuestion)
                .find('.question-label.active')
                .text();
        }

        this.question.classList.add('printified');
        this.question.append(
            document.createRange().createContextualFragment(
                `<div class="dn-temp-print">
                ${items
                    .map((item) =>
                        this._getHistoryRow(item, {
                            timestamp: 'datetime',
                            username: 'full',
                        })
                    )
                    .join('')}
            </div>`
            )
        );

        const existingLabel = this.question.querySelector(
            '.question-label.active'
        );
        const control = this.linkedQuestion.querySelector(
            'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)'
        );
        const name = control ? control.dataset.name || control.name : null;
        const questionName = name
            ? name.substring(name.lastIndexOf('/') + 1)
            : '?';
        const parser = new DOMParser();

        existingLabel.dataset.original = existingLabel.textContent;
        existingLabel.textContent = parser.parseFromString(
            t('widget.dn.printhistoryheading', { labelText, questionName }),
            'text/html'
        ).body.textContent;
    }

    _deprintify() {
        if (this.question.classList.contains('printified')) {
            this.question.classList.remove('printified');
            this.question.querySelector('.dn-temp-print').remove();

            const existingLabel = this.question.querySelector(
                '.question-label.active'
            );
            existingLabel.textContent = existingLabel.dataset.original;
            delete existingLabel.dataset.original;
        }
    }
}

export default Comment;

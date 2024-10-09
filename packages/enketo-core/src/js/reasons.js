import { t } from 'enketo/translator';
import events from './event';

const range = document.createRange();

export default {
    /* get $section() {
        this._$section = this._$section || $( `<section class="reason-for-change"><header class="reason-for-change__header"><h5>${t( 'fieldsubmission.reason.heading' )}</h5><div class="question reason-for-change__header__apply-to-all"><input class="ignore" type="text" name="common-rfc" placeholder="${t( 'fieldsubmission.reason.placeholder1' )}"/><div class="option-wrapper"><label class=""><input class="ignore" type="checkbox" name="apply-to-all"/><span lang="" class="option-label active">${t( 'fieldsubmission.reason.applytoall' )}</span></label></div></div></header></section>` ).insertBefore( '.form-footer' );

        return this._$section;
    }, */
    get section() {
        const contextual = range.createContextualFragment(
            `<section class="reason-for-change">
                    <header class="reason-for-change__header">
                        <h5>${t('fieldsubmission.reason.heading')}</h5>
                        <div class="question reason-for-change__header__apply-to-all">
                            <input autocomplete="off" class="ignore" type="text" name="common-rfc" placeholder="${t(
                                'fieldsubmission.reason.placeholder1'
                            )}"/>
                            <div class="option-wrapper">
                                <label class="">
                                    <input class="ignore" type="checkbox" name="apply-to-all"/>
                                    <span lang="" class="option-label active">${t(
                                        'fieldsubmission.reason.applytoall'
                                    )}</span>
                                </label>
                            </div>
                        </div>
                    </header>
                </section>`
        );

        this._section =
            this._section ||
            document
                .querySelector('.form-footer')
                .insertAdjacentElement(
                    'beforebegin',
                    contextual.firstElementChild
                );

        return this._section;
    },
    get questionMsg() {
        this._questionMsg =
            this._questionMsg ||
            `<span class="oc-reason-msg active">${t(
                'fieldsubmission.reason.questionmsg'
            )}</span>`;

        return this._questionMsg;
    },
    fields: [],
    numbers: [],
    addField(question) {
        if (this.fields.length === 0) {
            this.setApplyToAllHandler();
        }
        if (!this.fields.includes(question)) {
            // No need to worry about nested repeats as OC doesn't use them.
            const closestRepeatEl = question.closest('.or-repeat');
            const repeatNumberEl = closestRepeatEl
                ? closestRepeatEl.querySelector('.repeat-number')
                : null;
            let index;
            let repeatNumber;
            if (repeatNumberEl) {
                repeatNumber = repeatNumberEl.textContent || 1;
                index = this.numbers.indexOf(repeatNumberEl);
                if (index === -1) {
                    index = this.numbers.length;
                    this.numbers[index] = repeatNumberEl;
                }
            }
            const labelEl = question.querySelector('.question-label.active');
            const labelText = labelEl ? labelEl.textContent : '';
            const repeatNumberHtml = repeatNumber
                ? `<span class="reason-for-change__item__repeat-number" data-index="${index}">(${repeatNumber})</span>`
                : '';
            const fieldFragment = range.createContextualFragment(
                `<div class="reason-for-change__item">
                    <span class="reason-for-change__item__label">${labelText}</span>${repeatNumberHtml}
                    <input autocomplete="off" class="ignore" type="text" placeholder="${t(
                        'fieldsubmission.reason.placeholder2'
                    )}"/>
                </div>`
            );
            this.fields.push(question);
            question.append(range.createContextualFragment(this.questionMsg));
            this.section.append(fieldFragment);

            return this.section.lastChild;
        }

        return null;
    },
    removeField(question) {
        const index = this.fields.indexOf(question);
        if (index !== -1) {
            this.fields.splice(index, 1);
            // is this robust?
            this.section
                .querySelectorAll('.reason-for-change__item')
                [index].remove();
        }
    },
    clearAll() {
        this.section
            .querySelectorAll('.reason-for-change__item')
            .forEach((el) => el.remove());
        this.section.querySelector(
            'input[name="apply-to-all"]'
        ).checked = false;
        this.section.querySelector('input[name="common-rfc"]').value = '';
        this.fields = [];
    },
    getInvalidFields() {
        this.validate();

        return [
            ...this.section.querySelectorAll(
                '.reason-for-change__item.invalid input'
            ),
        ];
    },
    setInvalid(inputEl) {
        this.changeFieldStatus(inputEl, 'invalid');
    },
    setSubmitted(inputEl) {
        this.changeFieldStatus(inputEl, 'added');
        inputEl.dataset.previousValue = inputEl.value;
    },
    setEdited(inputEl) {
        // only set edited status if the field has been submitted previously
        if (this.hasSubmitted(inputEl)) {
            if (inputEl.value === inputEl.dataset.previousValue) {
                // remove statuses to go back to 'added' status only
                this.changeFieldStatus(inputEl, 'added');
            } else {
                this.changeFieldStatus(inputEl, 'edited');
            }
        }
    },
    setNumber(el, number) {
        el.textContent = `(${number})`;
    },
    getIndex(inputEl) {
        return [
            ...this.section.querySelectorAll('.reason-for-change__item'),
        ].findIndex(
            (item) => item === inputEl.closest('.reason-for-change__item')
        );
    },
    hasSubmitted(inputEl) {
        return inputEl.parentNode.classList.contains('added');
    },
    changeFieldStatus(inputEl, status) {
        // we never remove the "added" class
        inputEl.parentNode.classList.remove('edited', 'invalid');
        if (status) {
            inputEl.parentNode.classList.add(status);
        }
        this.updateQuestionMessage(inputEl, status);
    },
    updateQuestionMessage(inputEl, status) {
        const question = this.fields[this.getIndex(inputEl)];
        const existingMsg = question.querySelector('.oc-reason-msg');
        if (status === 'edited' || status === 'added') {
            if (existingMsg) {
                existingMsg.remove();
            }
        } else if (!existingMsg) {
            question.append(this.questionMsg);
        }
    },
    updateNumbering() {
        this.section
            .querySelectorAll('.reason-for-change__item__repeat-number')
            .forEach((el) =>
                this.setNumber(el, this.numbers[el.dataset.index].textContent)
            );
    },
    validate() {
        let valid = true;
        this.section
            .querySelectorAll('.reason-for-change__item:not(.added) input')
            .forEach((el) => {
                this.setInvalid(el);
                valid = false;
            });

        return valid;
    },
    getFirstInvalidField() {
        return this.section.querySelector('.invalid input');
    },
    setValue(el, newVal) {
        if (el.value.trim() !== newVal.trim()) {
            el.value = newVal;
            el.dispatchEvent(events.Change());
        }
    },
    applyToAll() {
        const checkbox = this.section.querySelector(
            'input[name="apply-to-all"]'
        );
        const input = this.section.querySelector('input[name="common-rfc"]');
        if (checkbox.matches(':checked')) {
            this.section
                .querySelectorAll('.reason-for-change__item input[type="text"]')
                .forEach((el) => this.setValue(el, input.value));
        }
    },
    setApplyToAllHandler() {
        this.section
            .querySelector('.reason-for-change__header')
            .addEventListener(events.Change().type, this.applyToAll.bind(this));
    },
};

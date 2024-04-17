// Modify the Enketo Core branch module.

import branchModule from 'enketo-core/src/js/relevant';
import { getXPath } from 'enketo-core/src/js/dom-utils';
import events from 'enketo-core/src/js/event';

/*
 * Overwrite to always call this.clear if ever enabled and currently relevant.
 */
branchModule.disable = function (branchNode, path) {
    let changed = false;

    // In OC, we also want to clear values from branches that have never been enabled (i.e. contain the pre-init class)
    // This is needed to:
    // - clear any values that were added during loading when the branch was briefly enabled but later disabled before loading finished
    // - clear any values that were loaded from records that were perhaps created from a different version of the form (to correct this)
    if (
        !branchNode.classList.contains('disabled') &&
        !branchNode.classList.contains('invalid-relevant')
    ) {
        changed = true;
        this.clear(branchNode, path);
        this.deactivate(branchNode);
    } else {
        // This processing (for OC) likely affects loading performance negatively for forms with lots of relevant conditions
        // that are false by default.
        // If a non-relevant question has a value upon load (dynamic default e.g.) OC would like to show a relevantError.
        this.deactivate(branchNode);
    }

    return changed;
};

/**
 * Overwrite clear function
 *
 * @param branchNode
 */
branchModule.clear = function (branchNode) {
    // Only user can clear values from user-input fields in OC.
    // TODO: when readonly becomes dynamic, we'll have to fix this.
    // Only for readonly items in OC fork:
    [
        ...branchNode.querySelectorAll(
            'input[readonly]:not(.ignore), select[readonly]:not(.ignore), textarea[readonly]:not(.ignore)'
        ),
    ].forEach((control) => {
        // We do not use input.clear() here because the eventhandlers that trigger clearing the model values are not yet in place and in OC
        // the clearing may need to happen during form instantiation.
        // TODO: inefficiently the index is determined in both clear() and deactivate() functions.
        const dataObj = this.form.model.node(
            this.form.input.getName(control),
            this.form.input.getIndex(control)
        );
        dataObj.setVal('');
        this.form.input.setVal(control, '');
    });

    // Also changed from Enketo Core, we never update calculated items if relevancy changes:
};

branchModule.activate = function (branchNode) {
    let required;

    this.setDisabledProperty(branchNode, false);
    if (branchNode.matches('.question')) {
        const control = branchNode.querySelector(
            'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)'
        );
        this.form.setValid(control, 'relevant');
        // Re-show any constraint error message when the relevant error has been removed.
        // Since validateInput looks at both required and constraint, and we don't want required
        // validation, we use a very dirty trick to bypass it.
        required = control.dataset.required;

        if (required) {
            delete control.dataset.required;
        }
        this.form.validateInput(control);
        if (required) {
            control.dataset.required = required;
        }
    } else if (branchNode.matches('.or-group, .or-group-data')) {
        this.form.setValid(branchNode, 'relevant');
    }
};

branchModule.originalDeactivate = branchModule.deactivate;

// Overwrite deactivate function
branchModule.deactivate = function (branchNode) {
    let value;
    const control = branchNode.querySelector(
        'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)'
    );

    if (branchNode.matches('.question')) {
        const name = this.form.input.getName(control);
        const index = this.form.input.getIndex(control);
        value = this.form.model.node(name, index).getVal();

        if (value !== '') {
            this.form.setInvalid(control, 'relevant');
            // In enketo-core we don't remove the "pre-init" class until question gets enabled, but
            // in OC a record loaded with a non-relevant value, would need to pre-init class to be
            // removed to display properly.
            // https://github.com/OpenClinica/enketo-express-oc/issues/465
            branchNode.classList.remove('pre-init');
            // After setting invalid-relevant remove any previous errors.
            this.form.setValid(control, 'constraint');
            this.form.setValid(control, 'required');
        } else {
            this.form.setValid(control, 'relevant');
            this.originalDeactivate(branchNode);
            branchNode.dispatchEvent(events.Hiding());
        }
    } else if (branchNode.matches('.or-group, .or-group-data')) {
        const name = this.form.input.getName(branchNode);
        let index;
        /*
         * We need to check if any of the fields with a form control or calculations
         * (excl discrepancy note questions) has a value.
         * The best way is to do this in the model.
         * Note that we need to check ALL repeats if the repeat parent (with the same /path/to/repeat) has a relevant!
         */
        if (!branchNode.querySelector(`.or-repeat[name="${name}"]`)) {
            index = this.form.input.getIndex(branchNode);
        }
        /*
         * First get all the leaf nodes (nodes without children) and then check if there is a calculation
         * or dn question, or readonly question for this node.
         *
         * Then get the concatenated textContent of the filtered leaf nodes and trim to avoid
         * recognizing whitespace-only as a value. (whitespace in between is fine as it won't give a false positive)
         *
         * If the result has length > 0, one form control in the group has a value.
         */
        const dataEls = this.form.model.node(name, index).getElements();

        if (!dataEls.length) {
            value = false;
        } else {
            value = dataEls.some((dataEl) =>
                [...dataEl.querySelectorAll('*')]
                    .filter((el) => {
                        if (el.children.length === 0) {
                            const path = getXPath(el, 'instance');
                            const selector = `.calculation > [name="${path}"], .or-appearance-dn > [name="${path}"], [readonly]:not(.readonly-forced)[name="${path}"]`;
                            // If a repeat has zero instances, the search for .or-appearance-dn in form.html will result in null, which means the dn-detection would fail.
                            const searchElements = [this.form.view.html].concat(
                                Object.entries(
                                    this.form.repeats.templates || {}
                                ).map((entries) => entries[1])
                            );
                            const ignore = searchElements.some(
                                (e) => !!e.querySelector(selector)
                            );

                            return !ignore;
                        }

                        return false;
                    })
                    .map((el) => (el.textContent ? el.textContent.trim() : ''))
                    .join('')
            );
        }

        if (value) {
            // In enketo-core we don't remove the "pre-init" class until the branch gets enabled, but
            // in OC a record loaded with a non-relevant value, would need to pre-init class to be
            // removed to display properly.
            branchNode.classList.remove('pre-init');
            this.form.setInvalid(branchNode, 'relevant');
        } else {
            this.form.setValid(branchNode, 'relevant');
            this.originalDeactivate(branchNode);
            // trigger on all questions inside this group that possibly have a discrepancy note attached to them.
            branchNode
                .querySelectorAll('.question')
                .forEach((question) => question.dispatchEvent(events.Hiding()));
        }
    }
};

export default branchModule;

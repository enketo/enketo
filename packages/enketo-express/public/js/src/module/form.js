// Extend the Enketo Core Form class, and expose it for local testing.
import { Form, FormModel } from 'enketo-core';
import events from 'enketo-core/src/js/event';
import config from 'enketo/config';
import gui from './gui';
import settings from './settings';
import './calculate';
import './relevant';
import './required';
import './page';
import './repeat';
import './input';
import './download-utils';

Form.constraintNames = Array.from(Array(21)).map(
    (val, i) => `constraint${i !== 0 ? i : ''}`
);

Form.prototype.extendedBy = 'OpenClinica';

Object.defineProperty(Form.prototype, 'constraintClassesInvalid', {
    get: () => Form.constraintNames.map((n) => `invalid-${n}`),
});

Object.defineProperty(Form.prototype, 'constraintAttributes', {
    get: () =>
        Form.constraintNames.map((n, i) => `data-${i === 0 ? n : `oc-${n}`}`),
});

/**
 * This function doesn't actually evaluate constraints. It triggers
 * an event on nodes that have constraint dependency on the changed node(s).
 * This event is used in the discrepancy notes widget.
 *
 * @param  {[type]} updated - [description]
 */
const constraintUpdate = function (updated) {
    updated = updated || {};
    // If the update object is a repeat node (cloned=true), do nothing
    if (!updated.cloned) {
        this.getRelatedNodes('data-constraint', '', updated)
            // The filter below is commented out, because at the moment this.getRelatedNodes already takes
            // care of this (in enketo-core). However, it is not unrealistic to expect that in the future we will
            // not be able to rely on that as it may be considered a performance hack too far. In that case, uncomment below.
            //
            // Filter out the nodes that are inside a repeat instance other than
            // the repeat instance that contains the node that triggered the dataupdate
            // https://github.com/kobotoolbox/enketo-express/issues/741
            /* .filter( function() {
                var $input;
                var $repeat;
                var repeatIndex;
                if ( !updated.repeatPath ) {
                    return true;
                }
                $input = $( this );
                $repeat = $input.closest( '.or-repeat[name="' + updated.repeatPath + '"]' );
                if ( !$repeat.length ) {
                    return true;
                }
                repeatIndex = $( '.or-repeat[name="' + updated.repeatPath + '"]' ).index( $repeat );
                return repeatIndex === updated.repeatIndex;
            } ) */
            .trigger('constraintevaluated.oc', updated);
    }
};

/**
 * OC does not empty irrelevant nodes. Instead non-empty irrelevant nodes get an error until the user clears the value.
 * This function takes care of re-evaluating the branch when the value is cleared.
 *
 * @param  {[type]} updated - [description]
 * @return {[type]}         [description]
 */
const relevantErrorUpdate = function (updated) {
    const nodes = this.getRelatedNodes('data-relevant', '', updated)
        .get()
        .concat(this.getRelatedNodes('name', '[data-relevant]', updated).get())
        .concat(
            this.getRelatedNodes('data-name', '[data-relevant]', updated).get()
        )
        .filter((control) => !!control.closest('.invalid-relevant'))
        .map((n) =>
            n.matches('[data-relevant]')
                ? n
                : n.querySelector('[data-relevant]')
        );

    this.relevant.updateNodes(nodes);
};

const originalInit = Form.prototype.init;
const originalValidateInput = Form.prototype.validateInput;

Form.prototype.evaluationCascadeAdditions = [
    constraintUpdate,
    relevantErrorUpdate,
];

Form.prototype.init = function () {
    const that = this;
    let initialized = false;

    // Before any other change handlers, add the "strict check" handlers
    if (settings.strictViolationSelector) {
        this.view.$.on(
            'change.file',
            'input:not(.ignore)[data-required][data-oc-required-type="strict"], select:not(.ignore)[data-required][data-oc-required-type="strict"], textarea:not(.ignore)[data-required][data-oc-required-type="strict"]',
            function (evt) {
                if (initialized) {
                    that.strictRequiredCheckHandler(evt, this);
                }
            }
        ).on(
            'change.file',
            'input:not(.ignore)[data-constraint][data-oc-constraint-type="strict"], select:not(.ignore)[data-constraint][data-oc-constraint-type="strict"], textarea:not(.ignore)[data-constraint][data-oc-constraint-type="strict"]',
            function (evt) {
                if (initialized) {
                    that.strictConstraintCheckHandler(evt, this);
                }
            }
        );
    }

    const loadErrors = originalInit.call(this);

    initialized = true;

    return loadErrors;
};

Form.prototype.specialOcLoadValidate = function (includeRequired) {
    const that = this;
    let $collectionToValidate = this.getRelatedNodes('data-constraint');

    if (includeRequired) {
        $collectionToValidate = $collectionToValidate.add(
            this.getRelatedNodes('data-required')
        );
    }

    // Note, even if includeRequired is falsy, any empty question that has both a required and constraint expression
    // will show a required error.
    // So the above collection determining is just to limit the amount of validation the engine has to perform but it
    // still needs cleaning, because the engine will validate **all** expressions on the selected question.

    $collectionToValidate.each(function () {
        const control = this;
        that.validateInput(control).then((result) => {
            if (!result.requiredValid && !includeRequired) {
                // Undo the displaying of a required error message upon load.
                // Note: a failed required means there cannot be a failed constraint, because they are mutually exclusive
                // in the engine (constraint is only evaluated if question has a value).
                that.setValid(control, 'required');
            }
        });
    });
};

// No-op because OC clears non-relevant values immediately. Save a huge amount of time upon 'Close'.
Form.prototype.clearNonRelevant = () => {};

/**
 * Skip constraint (and required) validation if question is currently marked with "invalid-relevant" error.
 *
 * @param {[type]} $input - [description]
 * @param control
 * @return {[type]}        [description]
 */
Form.prototype.validateInput = function (control) {
    // There is a condition where a value change results in both an invalid-relevant and invalid-constraint,
    // where the invalid constraint is added *after* the invalid-relevant. I can reproduce in automated test (not manually).
    // It is probably related due to the asynchronicity of the constraint evaluation.
    //
    // To crudely resolve this, we remove any constraint error here.
    // However we do want some of the other things that validateInput does (ie. updating the required "*" visibility), so
    // we will still run it but then remove any invalid classes.
    //
    // This is very unfortunate, but these are the kind of acrobatics that are necessary to "fight" the built-in behavior of Enketo's form engine.
    return originalValidateInput.call(this, control).then((result) => {
        if (
            result &&
            (!result.requiredValid ||
                !result.constraintValid || // form.validateInput still returns true for hidden and disabled fields
                (Array.isArray(result.constraintValid) &&
                    result.constraintValid.some((valid) => valid === false)))
        ) {
            const question = control.closest('.question');
            if (question && question.classList.contains('invalid-relevant')) {
                // TODO: another perhaps more efficient approach would be to check with invalid-constraintN classes are currently present
                Form.constraintNames.forEach((constraint) =>
                    this.setValid(control, constraint)
                );
            }
        }

        return result;
    });
};

Form.prototype.strictRequiredCheckHandler = function (evt, input) {
    const that = this;
    const n = {
        path: this.input.getName(input),
        required: this.input.getRequired(input),
        val: this.input.getVal(input),
    };

    // No need to validate.
    if (
        n.readonly ||
        n.inputType === 'hidden' ||
        input.closest('.invalid-relevant')
    ) {
        return;
    }

    // Only now, will we determine the index (expensive).
    n.ind = this.input.getIndex(input);

    // Check required
    if (n.val === '' && this.model.node(n.path, n.ind).isRequired(n.required)) {
        const question = input.closest('.question');
        const msg = question.querySelector('.or-required-msg.active').innerHTML;
        gui.alertStrictError(msg);
        // Cancel propagation input
        evt.stopImmediatePropagation();
        const currentModelValue = that.model.node(n.path, n.ind).getVal();
        that.input.setVal(input, currentModelValue);
        // When changing this make sure that the radio picker's change
        // listener picks this event up.
        // https://github.com/OpenClinica/enketo-express-oc/issues/168
        input.dispatchEvent(events.InputUpdate());
        question.scrollIntoView();
    }
};

Form.prototype.strictConstraintCheckHandler = function (evt, input) {
    const that = this;
    const n = {
        path: this.input.getName(input),
        xmlType: this.input.getXmlType(input),
        constraint: this.input.getConstraint(input)[0],
        val: this.input.getVal(input),
    };

    // No need to validate.
    if (
        n.readonly ||
        n.inputType === 'hidden' ||
        !n.constraint ||
        input.closest('.invalid-relevant')
    ) {
        return;
    }

    // Only now, will we determine the index (expensive).
    n.ind = this.input.getIndex(input);

    // In order to evaluate the constraint, its value has to be set in the model.
    // This would trigger a fieldsubmission, which is what we're trying to prevent.
    // A heavy-handed dumb-but-safe approach is to clone the model and set the value there.
    const modelClone = new FormModel(
        new XMLSerializer().serializeToString(this.model.xml)
    );
    // TODO: initialize clone with **external data**.
    modelClone.init();
    // Set the value in the clone
    const updated = modelClone.node(n.path, n.ind).setVal(n.val, n.xmlType);
    // Check if strict constraint passes
    if (!updated) {
        return;
    }
    // Note: we don't use Enketo Core's nodeset.validateConstraintAndType here because it's asynchronous,
    // which means we couldn't selectively stop event propagation.
    const modelCloneNodeValue = modelClone.node(n.path, n.ind).getVal();

    if (modelCloneNodeValue.toString() === '') {
        return;
    }

    if (
        typeof n.constraint !== 'undefined' &&
        n.constraint !== null &&
        n.constraint.length > 0 &&
        !modelClone.evaluate(n.constraint, 'boolean', n.path, n.ind)
    ) {
        const question = input.closest('.question');
        const msg = question.querySelector(
            '.or-constraint-msg.active'
        ).innerHTML;
        gui.alertStrictError(msg);
        // Cancel propagation input
        evt.stopImmediatePropagation();
        const currentModelValue = that.model.node(n.path, n.ind).getVal();
        that.input.setVal(input, currentModelValue);
        // When changing this make sure that the radio picker's change
        // listener picks this event up.
        // https://github.com/OpenClinica/enketo-express-oc/issues/168
        input.dispatchEvent(events.InputUpdate());
        question.scrollIntoView();
    }
};

/**
 * Removes an invalid mark on a question in the form UI.
 * OC: customized to also work on groups
 *
 * @param {Element} control - form control HTML element
 * @param {string} [type] - One of "constraint", "required" and "relevant".
 */
Form.prototype.setValid = function (control, type) {
    const wrap = control.closest(
        '.question, .calculation, .or-group, .or-group-data'
    );

    if (!wrap) {
        // TODO: this condition occurs, at least in tests for itemsets, but we need find out how.
        return;
    }

    const classes = type
        ? [`invalid-${type}`]
        : [...wrap.classList].filter((cl) => cl.indexOf('invalid-') === 0);
    wrap.classList.remove(...classes);
};

/**
 * Marks a question as invalid in the form UI.
 * OC: customized to also work on groups
 *
 * @param {Element} control - form control HTML element
 * @param {string} [type] - One of "constraint", "required" and "relevant".
 */
Form.prototype.setInvalid = function (control, type = 'constraint') {
    const wrap = control.closest(
        '.question, .calculation, .or-group, .or-group-data'
    );

    if (!wrap) {
        // TODO: this condition occurs, at least in tests for itemsets, but we need find out how.
        return;
    }

    if (config.validatePage === false && this.isValid(control)) {
        this.blockPageNavigation();
    }

    wrap.classList.add(`invalid-${type}`);
};

// TODO can this function be removed entirely?
/**
 * Checks whether the question is not currently marked as invalid. If no argument is provided, it checks the whole form.
 * OC customization: added group
 *
 * @param {Element} node - form control HTML element
 * @return {!boolean} Whether the question/form is not marked as invalid.
 */
Form.prototype.isValid = function (node) {
    const invalidSelectors = ['.invalid-required', '.invalid-relevant'].concat(
        this.constraintClassesInvalid
    );
    if (node) {
        const questionOrGroup = node.closest(
            '.question, .calculation, .or-group, .or-group-data'
        );
        const cls = questionOrGroup.classList;

        return !invalidSelectors.some((selector) => cls.contains(selector));
    }

    return !this.view.html.querySelector(invalidSelectors.join(', '));
};

/**
 *
 * @param {*} control - form control HTML element
 * @param {*} result - result object obtained from Nodeset.validate
 */
Form.prototype.updateValidityInUi = function (control, result) {
    let passed = result.requiredValid !== false;

    // if required === false, result.constraintValid returned by nodeset.validate is null
    if (result.constraintValid === null) {
        result.constraintValid = Array.from(Array(21)).map(() => null);
    }

    // Update UI
    if (result.requiredValid === false) {
        if (Array.isArray(result.constraintValid)) {
            result.constraintValid.forEach((valid, index) =>
                this.setValid(
                    control,
                    index === 0 ? 'constraint' : `constraint${index}`
                )
            );
        }
        this.setInvalid(control, 'required');
    } else {
        this.setValid(control, 'required');

        if (Array.isArray(result.constraintValid)) {
            result.constraintValid.forEach((valid, index) => {
                const cls = index === 0 ? 'constraint' : `constraint${index}`;
                if (valid === false) {
                    passed = false;
                    this.setInvalid(control, cls);
                } else {
                    // includes valid === undefined
                    this.setValid(control, cls);
                }
            });
        }
    }

    if (!passed) {
        control.dispatchEvent(events.Invalidated());
    }
};

/* eslint import/prefer-default-export: "off" */
export { Form };

// Modify the Enketo Core calculation module.

import calculationModule from 'enketo-core/src/js/calculate';

calculationModule._originalUpdateCalc = calculationModule._updateCalc;

calculationModule._updateCalc = function (control, props, emptyNonRelevant) {
    // OC customization:
    // Always clear if not relevant except if the setvalue target is a visible form control and is user-editable.
    emptyNonRelevant = !(
        props.type === 'setvalue' &&
        control &&
        control.closest('.question') &&
        !control.matches('[readonly]')
    );

    return this._originalUpdateCalc(control, props, emptyNonRelevant);
};

export default calculationModule;

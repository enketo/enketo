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

    if (emptyNonRelevant) {
        // We're temporarily disabling this cache because it is causing this bug
        // https://github.com/OpenClinica/enketo-express-oc/issues/730
        // which we don't quite understand yet, but need to fix urgently.
        // A proper fix would have to be created in enketo/enketo after which we should remove this clause
        // (and improve performance).
        this.preInitRelevance = new WeakMap();
    }

    return this._originalUpdateCalc(control, props, emptyNonRelevant);
};

export default calculationModule;

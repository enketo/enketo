import { Nodeset } from 'enketo-core/src/js/nodeset';
import types from 'enketo-core/src/js/types';

/**
 * Validate a value with an XPath Expression and /or xml data type
 *
 * @param {string} [expressions] - an array of 21 length of XPath constraint expressions
 * @param {string} [xmlDataType] - XML data type
 * @return {Promise} wrapping an array of boolean or undefined indicating if the value is valid or not; error also indicates invalid field, or problem validating it
 */
Nodeset.prototype.validateConstraintAndType = function (
    expressions,
    xmlDataType
) {
    if (
        !xmlDataType ||
        typeof types[xmlDataType.toLowerCase()] === 'undefined'
    ) {
        xmlDataType = 'string';
    }

    const value = this.getVal().toString();

    if (value.toString() === '') {
        return expressions.map(() => undefined);
    }

    return expressions.map((expr) => {
        if (value === '') {
            return true;
        }
        if (!types[xmlDataType.toLowerCase()].validate(value)) {
            return false;
        }

        return expr
            ? this.model.evaluate(
                  expr,
                  'boolean',
                  this.originalSelector,
                  this.index
              )
            : undefined;
    });
};

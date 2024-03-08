import OpenRosaXPath from 'openrosa-xpath-evaluator';
import extendXPath from 'enketo-xpath-extensions-oc';

/**
 * @function xpath-evaluator-binding
 */
export default function () {
    const evaluator = OpenRosaXPath();

    extendXPath(evaluator);

    this.xml.jsEvaluate = evaluator.evaluate;
}

require('./date-extensions'); // TODO remove?

const ExtendedXPathEvaluator = require('./extended-xpath');
const openrosaExtensions = require('./openrosa-extensions');
const XPR = require('./xpr');
const { asBoolean, asNumber, asString } = require('./utils/xpath-cast');

const cast = {
    string: asString,
    boolean: asBoolean,
    number: asNumber,
};

module.exports = function () {
    const ore = openrosaExtensions();
    const evaluator = new ExtendedXPathEvaluator(new XPathEvaluator(), ore);

    evaluator.customXPathFunction = {
        add: (name, { fn, args: _args, ret }) => {
            if (Object.prototype.hasOwnProperty.call(ore.func, name)) {
                throw new Error(
                    `There is already a function with the name: '${name}'`
                );
            }

            const argTypes = _args.map((a) => a.t);
            const allowedArgTypes = Object.keys(cast);
            const unsupportedArgTypes = argTypes.filter(
                (t) => !allowedArgTypes.includes(t)
            );
            if (unsupportedArgTypes.length) {
                const quoted = unsupportedArgTypes.map((t) => `'${t}'`);
                throw new Error(`Unsupported arg type(s): ${quoted.join(',')}`);
            }

            const allowedRetTypes = Object.keys(XPR);
            if (!allowedRetTypes.includes(ret)) {
                throw new Error(`Unsupported return type: '${ret}'`);
            }

            ore.func[name] = (...args) => {
                if (args.length !== argTypes.length) {
                    throw new Error(
                        `Function "${name}" expected ${argTypes.length} arg(s), but got ${args.length}`
                    );
                }

                const convertedArgs = argTypes.map((type, idx) =>
                    cast[type](args[idx])
                );
                return XPR[ret](fn(...convertedArgs));
            };
        },
    };

    return evaluator;
};

require('./date-extensions');
var ExtendedXPathEvaluator = require('./extended-xpath');
var openrosaExtensions = require('./openrosa-extensions');
var config = require('./config');
var extensions = openrosaExtensions(config);

function OpenrosaXPathEvaluator() {
  var evaluator = new XPathEvaluator();
  return {
    createExpression: evaluator.createExpression,
    createNSResolver: evaluator.createNSResolver,
    evaluate: function (expr, node, nsr, rt) {
      const xevaluator = new ExtendedXPathEvaluator(
        (v, xnode, xnsr, xrt) => {
          if(!rt || rt<7 || v.startsWith('//')) rt = null;
          xrt = xrt || rt || XPathResult.ANY_TYPE;
          const result = evaluator.evaluate(v, xnode || node, xnsr || nsr, xrt, null);
          // console.log(`${v} => ${result.resultType}`);
          return result;
        },
        extensions);
      return xevaluator.evaluate(...arguments);
    },
  };
}

module.exports = (function(){

  var module = {
    config: config,
    customXPathFunction: extensions.customXPathFunction,
    XPathEvaluator: OpenrosaXPathEvaluator,

    /**
     * Get the current list of DOM Level 3 XPath window and document objects
     * that are in use.
     *
     * @return {Object} List of DOM Level 3 XPath window and document objects
     *         that are currently in use.
     */
    getCurrentDomLevel3XPathBindings: function()
    {
      return {
        'window': {
          XPathException: window.XPathException,
          XPathExpression: window.XPathExpression,
          XPathNSResolver: window.XPathNSResolver,
          XPathResult: window.XPathResult,
          XPathNamespace: window.XPathNamespace
        },
        'document': {
          createExpression: document.createExpression,
          createNSResolver: document.createNSResolver,
          evaluate: document.evaluate
        }
      };
    },

    /**
     * Get the list of DOM Level 3 XPath objects that are implemented by
     * the XPathJS module.
     *
     * @return {Object} List of DOM Level 3 XPath objects implemented by
     *         the XPathJS module.
     */
    createDomLevel3XPathBindings: function(options)
    {
      var openrosaEvaluator = new OpenrosaXPathEvaluator(options);

      return {
        'document': {
          evaluate: openrosaEvaluator.evaluate
        }
      };
    },

    /**
     * Bind DOM Level 3 XPath interfaces to the DOM.
     *
     * @param {Object} doc the document or (Document.prototype!) to bind the evaluator etc. to
     * @return List of original DOM Level 3 XPath objects that has been replaced
     */
    bindDomLevel3XPath: function(doc, bindings)
    {
      var newBindings = (bindings || module.createDomLevel3XPathBindings()),
        currentBindings = module.getCurrentDomLevel3XPathBindings(),
        i
      ;

      doc = doc || document;

      for(i in newBindings['document'])
      {
        doc[i] = newBindings['document'][i];
      }

      return currentBindings;
    }
  };
  return module;

})();

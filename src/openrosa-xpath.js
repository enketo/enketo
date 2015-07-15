var
    boolean_from_string = /^boolean-from-string\((.*)\)$/,
    pow = /^pow\((.*),\s*(.*)\)$/,
    _uuid_part = function(c) {
        var r = Math.random()*16|0,
                v=c=='x'?r:r&0x3|0x8;
        return v.toString(16);
    },
    uuid = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                .replace(/[xy]/g, _uuid_part);
    };

/**
 * OpenRosa wrapper for [`document.evaluate()`]
 *   (https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate).
 *
 * @e is a string representing the XPath to be evaluated.
 * @contextNode specifies the context node for the query (see the
 *   [XPath specification](http://www.w3.org/TR/xpath)). It's common to pass
 *   document as the context node.
 * @namespaceResolver is a function that will be passed any namespace prefixes
 *   and should return a string representing the namespace URI associated with
 *   that prefix. It will be used to resolve prefixes within the XPath itself,
 *   so that they can be matched with the document. null is common for HTML
 *   documents or when no namespace prefixes are used.
 * @resultType is an integer that corresponds to the type of result XPathResult
 *   to return. Use named constant properties, such as XPathResult.ANY_TYPE, of
 *   the XPathResult constructor, which correspond to integers from 0 to 9.
 * @result is an existing XPathResult to use for the results. null is the most
 *   common and will create a new XPathResult
 */
var openrosa_xpath = function(e, contextNode, namespaceResolver, resultType, result) {
  var doc = this,
      match, res, val,
      overriden = doc ? doc.evaluate : null;

  if(e === 'uuid()') {
    val = uuid();
    return {
      resultType: XPathResult.STRING_TYPE,
      stringValue: val
    };
  }

  match = boolean_from_string.exec(e);
  if(match) {
    res = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
        XPathResult.STRING_TYPE, result).stringValue;
    val = res === '1' || res === 'true';
    return {
      resultType: XPathResult.BOOLEAN_TYPE,
      booleanValue: val,
      stringValue: val.toString()
    };
  }

  match = pow.exec(e);
  if(match) {
    res = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
        XPathResult.STRING_TYPE, result).stringValue;
    val = Math.pow(parseInt(res, 10), parseInt(match[2], 10));
    return {
      resultType: XPathResult.NUMBER_TYPE,
      numberValue: val,
      stringValue: val.toString() };
  }

  if(overriden) return overriden.apply(doc, arguments);

  throw new Error('Failed to parse expression: ' + e);
};

if(typeof define === 'function') {
  define(function() { return openrosa_xpath; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = openrosa_xpath;
}

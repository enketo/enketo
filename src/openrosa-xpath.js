var
    raw_string_singles = /^\s*'([^']*)'\s*$/,
    raw_string_doubles = /^\s*"([^"]*)"\s*$/,
    raw_number = /^\s*([0-9]+)\s*$/,
    boolean_from_string = /^boolean-from-string\((.*)\)$/,
    int = /^int\((.*)\)$/,
    pow = /^pow\((.*),\s*(.*)\)$/,
    concat = /^concat\((.*),\s*(.*)\)$/,
    selected = /^selected\((.*),\s*(.*)\)$/,
    regex = /^regex\((.*),\s*(.*)\)$/,
    infix = /^(.*)\s*((?:<|&lt;|>|&gt;)=?)\s*(.*)$/,
    coalesce = /^coalesce\((.*),\s*(.*)\)$/,
    substr = /^substr\(([^,]*),\s*([^,]*)(?:,\s*(.*))?\)$/,
    _uuid_part = function(c) {
        var r = Math.random()*16|0,
                v=c=='x'?r:r&0x3|0x8;
        return v.toString(16);
    },
    uuid = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                .replace(/[xy]/g, _uuid_part);
    },
    xpathResult = {
      boolean: function(val) { return { resultType:XPathResult.BOOLEAN_TYPE,
          booleanValue:val, stringValue:val.toString() } },
      number: function(val) { return { resultType:XPathResult.NUMBER_TYPE,
          numberValue:val, stringValue:val.toString() } },
      string: function(val) { return { resultType:XPathResult.STRING_TYPE,
          stringValue:val } },
    },
    zeroPad = function(n) { return n >= 10 ? n : '0' + n; },
    textVal = function(xpathResult) {
      switch(xpathResult.resultType) {
        case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
        case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
        case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
        case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
        case XPathResult.ANY_UNORDERED_NODE_TYPE:
        case XPathResult.FIRST_ORDERED_NODE_TYPE:
          console.log('We got a node of type: ' + xpathResult.resultType);
          return xpathResult.iterateNext().textContent;
      }
      return xpathResult.stringValue;
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
  'use strict';
  var doc = this,
      match, res, val, r,
      overriden = doc ? doc.evaluate : null,
      recurse = function(expr, _resultType) {
        if(!_resultType) _resultType = XPathResult.ANY_TYPE;
        return openrosa_xpath.call(doc, expr, contextNode, namespaceResolver,
            _resultType, result);
      }

  // Handle no-arg function calls

  if(e === 'uuid()') {
    return xpathResult.string(uuid());
  }
  if(e === 'random()') {
    return xpathResult.number(Math.random());
  }
  if(e === 'now()') {
    return xpathResult.number(Date.now());
  }
  if(e === 'today()') {
    var today = new Date();
    today = today.getFullYear() + '-' + zeroPad(today.getMonth()+1) + '-' +
        zeroPad(today.getDate());
    return xpathResult.string(today);
  }

  // Handle infix operators

  match = infix.exec(e);
  if(match) {
    var lhs = recurse(match[1]),
        operator = match[2],
        rhs = recurse(match[3]);
    switch(operator) {
      case '<':
      case '&lt;':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          res = lhs.numberValue < rhs.numberValue;
        } else {
          res = textVal(lhs) < textVal(rhs);
        }
        break;
      case '<=':
      case '&lt;=':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          res = lhs.numberValue <= rhs.numberValue;
        } else {
          res = textVal(lhs) <= textVal(rhs);
        }
        break;
      case '>':
      case '&gt;':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          res = lhs.numberValue > rhs.numberValue;
        } else {
          res = textVal(lhs) > textVal(rhs);
        }
        break;
      case '>=':
      case '&gt;=':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          res = lhs.numberValue >= rhs.numberValue;
        } else {
          res = textVal(lhs) >= textVal(rhs);
        }
        break;
    }
    if(typeof res === 'undefined') return xpathResult.string('Not yet implemented');
    return xpathResult.boolean(res);
  }

  // Handle function-style operators

  match = raw_number.exec(e);
  if(match) {
    return xpathResult.number(match[1]);
  }

  match = raw_string_singles.exec(e);
  if(match) {
    return xpathResult.string(match[1]);
  }

  match = raw_string_doubles.exec(e);
  if(match) {
    return xpathResult.string(match[1]);
  }

  match = int.exec(e);
  if(match) {
    res = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
        XPathResult.STRING_TYPE, result).stringValue;
    return xpathResult.number(parseInt(res, 10));
  }

  match = boolean_from_string.exec(e);
  if(match) {
    res = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
        XPathResult.STRING_TYPE, result).stringValue;
    return xpathResult.boolean(res === '1' || res === 'true');
  }

  match = selected.exec(e);
  if(match) {
    var haystack = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
        XPathResult.STRING_TYPE, result).stringValue.split(' '),
    needle = openrosa_xpath.call(doc, match[2], contextNode, namespaceResolver,
        XPathResult.STRING_TYPE, result).stringValue;
    return xpathResult.boolean(haystack.indexOf(needle) !== -1);
  }

  match = concat.exec(e);
  if(match) {
    val = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
            XPathResult.STRING_TYPE, result).stringValue +
        openrosa_xpath.call(doc, match[2], contextNode, namespaceResolver,
            XPathResult.STRING_TYPE, result).stringValue
    return xpathResult.string(val);
  }

  match = pow.exec(e);
  if(match) {
    res = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
        XPathResult.STRING_TYPE, result).stringValue;
    val = Math.pow(parseInt(res, 10), parseInt(match[2], 10));
    return xpathResult.number(val);
  }

  match = regex.exec(e);
  if(match) {
      val = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
          XPathResult.STRING_TYPE, result);
      r = openrosa_xpath.call(doc, match[2], contextNode, namespaceResolver,
            XPathResult.STRING_TYPE, result);
      return xpathResult.boolean(new RegExp(r).test(val));
  }

  match = coalesce.exec(e);
  if(match) {
      res = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
          XPathResult.STRING_TYPE, result);
      if(res.stringValue) return res;
      res = openrosa_xpath.call(doc, match[2], contextNode, namespaceResolver,
            XPathResult.STRING_TYPE, result);
      return res;
  }

  match = substr.exec(e);
  if(match) {
      res = openrosa_xpath.call(doc, match[1], contextNode, namespaceResolver,
          XPathResult.STRING_TYPE, result).stringValue;
      var startIndex = parseInt(match[2], 10),
          endIndex = match[3] ? parseInt(match[3], 10) : res.length;
      val = res.slice(startIndex, endIndex);
      return xpathResult.string(val);
  }

  if(overriden) return overriden.apply(doc, arguments);

  throw new Error('Failed to parse expression: [' + e + ']');
};

if(typeof define === 'function') {
  define(function() { return openrosa_xpath; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = openrosa_xpath;
}

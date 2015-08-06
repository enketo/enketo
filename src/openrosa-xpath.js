var
    MILLIS_PER_DAY = 1000 * 60 * 60 * 24,
    MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    raw_string_singles = /^'([^']*)'$/,
    raw_string_doubles = /^"([^"]*)"$/,
    raw_number = /^(-?[0-9]+)$/,
    boolean_from_string = /^boolean-from-string\((.*)\)$/,
    int = /^int\((.*)\)$/,
    format_date = /^format-date(?:-time)?\((.*), ['"]([^'"]*)['"]\)$/,
    date = /^date(?:-time)?\((.*)\)$/,
    date_string = /^\d\d\d\d-\d\d-\d\d(?:T\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d))?$/,
    decimal_date = /^decimal-date(?:-time)?\((.*)\)$/,
    pow = /^pow\((.*),\s*(.*)\)$/,
    concat = /^concat\((.*),\s*(.*)\)$/,
    selected = /^selected\((.*),\s*(.*)\)$/,
    regex = /^regex\((.*),\s*(.*)\)$/,
    infix = /^(.*)\s+((?:=|<|&lt;|>|&gt;|!)=?|[-+*]|mod|div)\s+(.*)$/,
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
      dateString: function(val) {
        val = val.getFullYear() + '-' + zeroPad(val.getMonth()+1) + '-' +
            zeroPad(val.getDate());
        return xpathResult.string(val);
      }
    },
    zeroPad = function(n, len) {
      len = len || 2;
      n = n.toString();
      while(n.length < len) n = '0' + n;
      return n;
    },
    textVal = function(xpathResult) {
      switch(xpathResult.resultType) {
        case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
        case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
        case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
        case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
        case XPathResult.ANY_UNORDERED_NODE_TYPE:
        case XPathResult.FIRST_ORDERED_NODE_TYPE:
          return xpathResult.iterateNext().textContent;
      }
      return xpathResult.stringValue;
    },
    /** Date format spec from openrosa https://bitbucket.org/m.sundt/javarosa/src/62409ae3b803/core/src/org/javarosa/core/model/utils/DateUtils.java#cl-247 */
    _format_date = function(date, format) {
      date = new Date(Date.parse(date));
      var c, i, sb = '', f = {
        year: 1900 + date.getYear(),
        month: 1 + date.getMonth(),
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        secTicks: date.getTime(),
        dow: date.getDay(),
      };

      for(i=0; i<format.length; ++i) {
        c = format.charAt(i);

        if (c === '%') {
          if(++i >= format.length) {
            throw new Error("date format string ends with %");
          }
          c = format.charAt(i);

          if (c === '%') { // literal '%'
            sb += '%';
          } else if (c === 'Y') {  //4-digit year
            sb += zeroPad(f.year, 4);
          } else if (c === 'y') {  //2-digit year
            sb += zeroPad(f.year, 4).substring(2);
          } else if (c === 'm') {  //0-padded month
            sb += zeroPad(f.month, 2);
          } else if (c === 'n') {  //numeric month
            sb += f.month;
          } else if (c === 'b') {  //short text month
            sb += MONTHS[f.month - 1];
          } else if (c === 'd') {  //0-padded day of month
            sb += zeroPad(f.day, 2);
          } else if (c === 'e') {  //day of month
            sb += f.day;
          } else if (c === 'H') {  //0-padded hour (24-hr time)
            sb += zeroPad(f.hour, 2);
          } else if (c === 'h') {  //hour (24-hr time)
            sb += f.hour;
          } else if (c === 'M') {  //0-padded minute
            sb += zeroPad(f.minute, 2);
          } else if (c === 'S') {  //0-padded second
            sb += zeroPad(f.second, 2);
          } else if (c === '3') {  //0-padded millisecond ticks (000-999)
            sb += zeroPad(f.secTicks, 3);
          } else if (c === 'a') {  //Three letter short text day
            sb += DAYS[f.dow - 1];
          } else if (c === 'Z' || c === 'A' || c === 'B') {
            throw new Error('unsupported escape in date format string [%' + c + ']');
          } else {
            throw new Error('unrecognized escape in date format string [%' + c + ']');
          }
        } else {
          sb += c;
        }
      }

      return sb;
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
      },
      temp = {};

  e = e.trim();

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
    return xpathResult.dateString(new Date());
  }

  // Handle infix operators

  // TODO these operators should almost certainly be handled by the underlying
  // xpath implementation.  We should evaluate each side, and then defer to the
  // underlying implementation.
  match = infix.exec(e);
  if(match) {
    var lhs = recurse(match[1]),
        operator = match[2],
        rhs = recurse(match[3]),
        bool = xpathResult.boolean,
        num = xpathResult.number,
        str = xpathResult.string;
    switch(operator) {
      case '<':
      case '&lt;':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          return bool(lhs.numberValue < rhs.numberValue);
        } else {
          return bool(textVal(lhs) < textVal(rhs));
        }
        break;
      case '<=':
      case '&lt;=':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          return bool(lhs.numberValue <= rhs.numberValue);
        } else {
          return bool(textVal(lhs) <= textVal(rhs));
        }
        break;
      case '>':
      case '&gt;':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          return bool(lhs.numberValue > rhs.numberValue);
        } else {
          return bool(textVal(lhs) > textVal(rhs));
        }
        break;
      case '>=':
      case '&gt;=':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          return bool(lhs.numberValue >= rhs.numberValue);
        } else {
          return bool(textVal(lhs) >= textVal(rhs));
        }
        break;
      case '=':
      case '==':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          return bool(lhs.numberValue == rhs.numberValue);
        } else {
          return bool(textVal(lhs) == textVal(rhs));
        }
        break;
      case '!=':
        if(lhs.resultType === XPathResult.NUMBER_TYPE &&
            rhs.resultType === XPathResult.NUMBER_TYPE) {
          return bool(lhs.numberValue != rhs.numberValue);
        } else {
          return bool(textVal(lhs) != textVal(rhs));
        }
        break;
      case '+':
      case '-':
      case '*':
      case 'mod':
      case 'div':
        return overriden.call(doc, textVal(lhs) + ' ' + operator + ' ' + textVal(rhs),
            contextNode, namespaceResolver, resultType, result);
    }
    return xpathResult.string('Not yet implemented');
  }

  // Handle function-style operators

  match = raw_number.exec(e);
  if(match) {
    return xpathResult.number(parseFloat(match[1]));
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
    res = recurse(match[1], XPathResult.STRING_TYPE).stringValue;
    return xpathResult.number(parseInt(res, 10));
  }

  match = date.exec(e);
  if(match) {
    match = recurse(match[1], XPathResult.STRING_TYPE).stringValue;
    if(raw_number.test(match)) {
      var tempDate = new Date(0);
      tempDate.setDate(1 + parseInt(match, 10));
      return xpathResult.dateString(tempDate);
    } else if(date_string.test(match)) {
      return xpathResult.string(match.substring(0, 10));
    } else {
      return xpathResult.string('Invalid Date');
    }
  }

  match = decimal_date.exec(e);
  if(match) {
    match = recurse(match[1], XPathResult.STRING_TYPE).stringValue;
    return xpathResult.number(Date.parse(match) / MILLIS_PER_DAY);
  }

  match = format_date.exec(e);
  if(match) {
    temp.date = recurse(match[1], XPathResult.STRING_TYPE).stringValue,
    temp.pattern = match[2];
    return xpathResult.string(_format_date(temp.date, temp.pattern));
  }

  match = boolean_from_string.exec(e);
  if(match) {
    res = recurse(match[1], XPathResult.STRING_TYPE).stringValue;
    return xpathResult.boolean(res === '1' || res === 'true');
  }

  match = selected.exec(e);
  if(match) {
    var haystack = recurse(match[1], XPathResult.STRING_TYPE).stringValue.split(' '),
        needle = recurse(match[2], XPathResult.STRING_TYPE).stringValue;
    return xpathResult.boolean(haystack.indexOf(needle) !== -1);
  }

  match = concat.exec(e);
  if(match) {
    val = recurse(match[1], XPathResult.STRING_TYPE).stringValue +
        recurse(match[2], XPathResult.STRING_TYPE).stringValue;
    return xpathResult.string(val);
  }

  match = pow.exec(e);
  if(match) {
    res = recurse(match[1], XPathResult.STRING_TYPE).stringValue;
    val = Math.pow(parseInt(res, 10), parseInt(match[2], 10));
    return xpathResult.number(val);
  }

  match = regex.exec(e);
  if(match) {
    val = recurse(match[1], XPathResult.STRING_TYPE).stringValue;
    r = recurse(match[2], XPathResult.STRING_TYPE).stringValue;
    return xpathResult.boolean(new RegExp(r).test(val));
  }

  match = coalesce.exec(e);
  if(match) {
    res = recurse(match[1], XPathResult.STRING_TYPE);
    if(res.stringValue) return res;
    res = recurse(match[2], XPathResult.STRING_TYPE);
    return res;
  }

  match = substr.exec(e);
  if(match) {
    res = recurse(match[1], XPathResult.STRING_TYPE).stringValue;
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

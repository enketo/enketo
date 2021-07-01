require('./date-extensions');
const { asGeopoints, area, distance } = require('./geo');
const digest = require('./digest');
const { randomToken } = require('./random-token');
const { DATE_STRING, dateStringToDays, isValidDate } = require('./utils/date');
const shuffle = require('./utils/shuffle');
const { asBoolean, asNumber, asString } = require('./utils/xpath-cast');
const sortByDocumentOrder = require('./utils/sort-by-document-order');
const XPR = require('./xpr');

const RAW_NUMBER = /^-?[0-9]+(\.[0-9]+)?$/;

// Operator constants copied from extended-xpath.js
const EQ    = 0b01000;
const GTE   = 0b01111;
const PLUS  = 0b10000;
const MINUS = 0b10001;

const openrosa_xpath_extensions = function() {
  const
      TOO_MANY_ARGS = new Error('too many args'),
      TOO_FEW_ARGS = new Error('too few args'),
      MILLIS_PER_DAY = 1000 * 60 * 60 * 24,
      _round = function(num) {
        if(num < 0) {
          return -Math.round(-num);
        }
        return Math.round(num);
      },
      format_date = function(date, format) {
        date = asDate(date);
        format = asString(format);
        if(isNaN(date)) return 'Invalid Date';
        let c, i, sb = '';
        const year = 1900 + date.getYear();
        const month = 1 + date.getMonth();
        const day = date.getDate();
        const hour = date.getHours();
        const locale = window ? window.enketoFormLocale : undefined;

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
              sb += _zeroPad(year, 4);
            } else if (c === 'y') {  //2-digit year
              sb += _zeroPad(year, 4).substring(2);
            } else if (c === 'm') {  //0-padded month
              sb += _zeroPad(month, 2);
            } else if (c === 'n') {  //numeric month
              sb += month;
            } else if (c === 'b') {  //short text month
              sb += date.toLocaleDateString(locale, { month: 'short' });
            } else if (c === 'd') {  //0-padded day of month
              sb += _zeroPad(day, 2);
            } else if (c === 'e') {  //day of month
              sb += day;
            } else if (c === 'H') {  //0-padded hour (24-hr time)
              sb += _zeroPad(hour, 2);
            } else if (c === 'h') {  //hour (24-hr time)
              sb += hour;
            } else if (c === 'M') {  //0-padded minute
              sb += _zeroPad(date.getMinutes(), 2);
            } else if (c === 'S') {  //0-padded second
              sb += _zeroPad(date.getSeconds(), 2);
            } else if (c === '3') {  //0-padded millisecond ticks (000-999)
              sb += _zeroPad(date.getMilliseconds(), 3);
            } else if (c === 'a') {  //Three letter short text day
              sb += date.toLocaleDateString(locale, { weekday: 'short' });
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
      },
      ret = {};

  const func = {
    abs: function(r) { return XPR.number(Math.abs(asNumber(r))); },
    acos: function(r) { return XPR.number(Math.acos(asNumber(r))); },
    asin: function(r) { return XPR.number(Math.asin(asNumber(r))); },
    atan: function(r) { return XPR.number(Math.atan(asNumber(r))); },
    atan2: function(r) {
      if(arguments.length > 1) {
        const y = asNumber(arguments[0]);
        const x = asNumber(arguments[1]);
        return XPR.number(Math.atan2(y, x));
      }
      return XPR.number(Math.atan2(asNumber(r)));
    },
    boolean: function(r) {
      if(arguments.length === 0) throw new Error('too few args');
      if(arguments.length > 1) throw new Error('too few args');
      return XPR.boolean(asBoolean(r));
    },
    'boolean-from-string': function(r) {
      if(r.t === 'num' && r.v > 0 && !r.decimal) {
        return XPR.boolean(true);
      }
      r = asString(r);
      return XPR.boolean(r === '1' || r === 'true');
    },
    area: function(r) {
      if(arguments.length === 0) throw TOO_FEW_ARGS;
      return XPR.number(area(asGeopoints(r)));
    },
    checklist: function(min, max, ...list) {
      min = asNumber(min);
      max = asNumber(max);
      const trues = mapFn(asBoolean, ...list).reduce((acc, v) => v ? acc + 1 : acc, 0);
      return XPR.boolean((min < 0 || trues >= min) && (max < 0 || trues <= max));
    },
    coalesce: function(a, b) { return XPR.string(asString(a) || asString(b)); },
    concat: function(...args) {
      return XPR.string(mapFn(asString, ...args).join(''));
    },
    cos: function(r) { return XPR.number(Math.cos(asNumber(r))); },
    count: function(selecter) {
      // count() is part of XPath 1.0, but Chrome and Firefox disagree on how it should work.
      if(arguments.length === 0) throw new Error('too few args');
      if(arguments.length > 1) throw new Error('too few args');
      if(selecter.t !== 'arr') throw new Error("Unpexpected arg type: '" + selecter.t + "'");
      return XPR.number(selecter.v.length);
    },
    'count-non-empty': function(r) {
      if(!arguments.length === 0) throw new Error('too few args');
      if(arguments.length > 1) throw new Error('too many args');
      if(r.t !== 'arr') throw new Error('wrong arg type:' + JSON.stringify(r));
      return XPR.number(mapFn(asString, r).reduce((acc, v) => v ? acc + 1 : acc, 0));
    },
    'count-selected': function(s) {
      const parts = asString(s).split(' ');
      let i = parts.length,
          count = 0;
      while(--i >= 0) if(parts[i].length) ++count;
      return XPR.number(count);
    },
    date: function(it) {
      return XPR.date(asDate(it));
    },
    'decimal-date-time': function(date) {
      if(arguments.length > 1) throw TOO_MANY_ARGS;
      const res = Date.parse(asString(date)) / MILLIS_PER_DAY;
      return XPR.number(res);
    },
    'decimal-time': function(r) {
      if(arguments.length > 1) throw TOO_MANY_ARGS;
      if(r.t === 'num') return XPR.number(NaN);
      const time = asString(r);
      // There is no Time type, and so far we don't need it so we do all validation
      // and conversion here, manually.
      const m = time.match(/^(\d\d):(\d\d):(\d\d)(\.\d\d?\d?)?(\+|-)(\d\d):(\d\d)$/);
      let dec;
      if (m &&
        m[1] < 24 && m[1] >= 0 &&
        m[2] < 60 && m[2] >= 0 &&
        m[3] < 60 && m[3] >= 0 &&
        m[6] < 24 && m[6] >= 0 && // this could be tighter
        m[7] < 60 && m[7] >= 0 // this is probably either 0 or 30
      ) {
        const today = new Date(); // use today to cater to daylight savings time.
        const d = new Date(today.getFullYear() + '-' + _zeroPad(today.getMonth() + 1) + '-' + _zeroPad(today.getDate()) + 'T' + time);
        if(d.toString() === 'Invalid Date'){
          dec = NaN;
        } else {
          dec = (d.getSeconds()/3600 + d.getMinutes()/60 + d.getHours()) / 24;
        }
      } else {
        dec = NaN;
      }
      return XPR.number(dec);
    },
    digest: function(msg, algo, encoding) {
      return XPR.string(digest(msg, algo, encoding));
    },
    distance: function(r) {
      if(arguments.length === 0) throw TOO_FEW_ARGS;
      return XPR.number(distance(asGeopoints(r)));
    },
    exp: function(r) { return XPR.number(Math.exp(asNumber(r))); },
    exp10: function(r) { return XPR.number(Math.pow(10, asNumber(r))); },
    'false': function() {
      if(arguments.length) throw TOO_MANY_ARGS;
      return XPR.boolean(false);
    },
    'format-date': function(date, format) {
      if(arguments.length < 2) throw new Error('format-date() :: not enough args');
      return XPR.string(format_date(date, format)); },
    if: function(con, a, b) {
      return asBoolean(con) ? a : b;
    },
    'ends-with': function(a, b) {
      if(arguments.length > 2) throw TOO_MANY_ARGS;
      if(arguments.length < 2) throw TOO_FEW_ARGS;
      return XPR.boolean(asString(a).endsWith(asString(b)));
    },
    int: function(v) {
      return XPR.number(asInteger(v));
    },
    join: function(delim, ...args) {
      return XPR.string(mapFn(asString, ...args).join(asString(delim)));
    },
    last: function() {
      if(arguments.length) throw new Error(`last() does not take arguments`);
      return XPR.number(this.contextSize);
    },
    'local-name': function(r) {
      // This is actually supported natively, but currently it's simpler to implement
      // ourselves than convert the supplied nodeset into a single node and pass this
      // somehow to the native implementation.
      //
      // See: https://www.w3.org/TR/1999/REC-xpath-19991116/#function-local-name
      const name = getNodeName(this, r);
      return XPR.string(name.match(/^(?:[^:]*:)?(.*)/)[1]);
    },
    name: function(r) {
      // This is actually supported natively, but currently it's simpler to implement
      // ourselves than convert the supplied nodeset into a single node and pass this
      // somehow to the native implementation.
      //
      // See: https://www.w3.org/TR/1999/REC-xpath-19991116/#function-name
      return XPR.string(getNodeName(this, r));
    },
    log: function(r) { return XPR.number(Math.log(asNumber(r))); },
    log10: function(r) { return XPR.number(Math.log10(asNumber(r))); },
    max: function(...args) {
      const nums = mapFn(asNumber, ...args);
      if(!nums.length || nums.some(v => isNaN(v))) return XPR.number(NaN);
      return XPR.number(Math.max(...nums));
    },
    min: function(...args) {
      const nums = mapFn(asNumber, ...args);
      if(!nums.length || nums.some(v => isNaN(v))) return XPR.number(NaN);
      return XPR.number(Math.min(...nums));
    },
    'namespace-uri': function(r) {
      // This is actually supported natively, but currently it's simpler to implement
      // ourselves than convert the supplied nodeset into a single node and pass this
      // somehow to the native implementation.
      //
      // See: https://www.w3.org/TR/1999/REC-xpath-19991116/#function-namespace-uri
      const node = getNode(this, r);
      return XPR.string(node && node.namespaceURI || '');
    },
    'normalize-space': function(r) {
      // TODO this seems to do a lot more than the spec at https://www.w3.org/TR/1999/REC-xpath-19991116/#function-normalize-space
      // I think we should just be able to return: XPR.string(asString(r || this.cN).replace(/[\t\r\n ]+/g, ' ').trim());
      if(arguments.length > 1) throw new Error('too many args');

      let res = asString(r || this.cN);

      res = res.replace(/\f/g, '\\f');
      res = res.replace(/\r\v/g, '\v');
      res = res.replace(/\v/g, '\\v');
      res = res.replace(/\s+/g, ' ');
      res = res.replace(/^\s+|\s+$/g, '');
      res = res.replace(/\\v/g, '\v');
      res = res.replace(/\\f/g, '\f');

      return XPR.string(res);
    },
    /*
     * As per https://github.com/alxndrsn/openrosa-xpath-evaluator/issues/15,
     * the pass-through to the wrapped implementation always requests
     * XPathResult.STRING_TYPE.  This seems to cause an issue with the response
     * from `not()` calls, which should ideally be handled by the built-in
     * XPath implementation.  The following method is supplied as a workaround,
     * and ideally would be unnecessary.
     */
    not: function(r) {
      if(arguments.length === 0) throw TOO_FEW_ARGS;
      if(arguments.length > 1) throw TOO_MANY_ARGS;
      return XPR.boolean(!asBoolean(r));
    },
    now: function() {
      return XPR.date(new Date());
    },
    number: function(r) {
      if(arguments.length > 1) throw new Error(`number() passed wrong arg count (expected 0 or 1, but got ${arguments.length})`);
      let arg = arguments.length ? r : this.cN;
      const str = asString(arg);
      if(DATE_STRING.test(str)) { // TODO cleanup regex and splitting
        return XPR.number(dateStringToDays(str));
      }
      return XPR.number(asNumber(arg));
    },
    today: function() {
      return XPR.date(ret._now());
    },
    /**
     * The once function returns the value of the parameter if its own value
     * is not empty, NaN, [Infinity or -Infinity]. The naming is therefore misleading!
     * Also note that the parameter expr is always evaluated.
     * This function simply decides whether to return the new result or the old value.
     */
    once: function(r) {
      const current = asString(this.cN);
      return XPR.string(current || asString(r));
    },
    pi: function() { return XPR.number(Math.PI); },
    position: function(r) {
      // N.B.: I suspect there is a bug here - this will return position within the parent node, rather than the evaluation context.
      // I suspect this is contrary to the spec, which reads:
      // > The position function returns a number equal to the context position from the expression evaluation context.
      //   - https://www.w3.org/TR/1999/REC-xpath-19991116/#function-position
      // I'd have thought e.g. a union of all first-children in a doc would not all have position()=1 within that nodeset
      if(arguments.length > 1) throw new Error('too many args');
      if(r && r.t !== 'arr') throw new Error('wrong arg type for position() - expected nodeset, but got: ' + r.t);
      if(r && !r.v.length) throw new Error('cannot call position() on an empty nodeset');

      if(!r) return XPR.number(this.contextPosition);

      let position = 1;
      let node = r.v[0];
      const nodeName = node.tagName;
      while (node.previousElementSibling && node.previousElementSibling.tagName === nodeName) {
        node = node.previousElementSibling;
        position++;
      }

      return XPR.number(position);
    },
    pow: function(x, y) { return XPR.number(Math.pow(asNumber(x), asNumber(y))); },
    random: function() { return XPR.number(parseFloat(Math.random().toFixed(15))); },
    randomize: function(r, seed) {
      if(!arguments.length) throw TOO_FEW_ARGS;//only rT passed
      if(arguments.length > 2) throw TOO_MANY_ARGS;
      if(!r || r.t !== 'arr') throw new Error('randomize() must be called on a nodeset');


      seed = seed && asNumber(seed);

      return { t:'arr', v:shuffle(r.v, seed) };
    },
    regex: function(haystack, pattern) {
        return XPR.boolean(new RegExp(asString(pattern)).test(asString(haystack))); },
    round: function(number, num_digits) {
      if(arguments.length === 0) throw TOO_FEW_ARGS;
      if(arguments.length > 2) throw TOO_MANY_ARGS;
      number = asNumber(number);
      if(!num_digits) {
        return XPR.number(_round(number));
      }
      num_digits = asInteger(num_digits);
      const pow = Math.pow(10, Math.abs(num_digits));
      if(num_digits > 0) {
        return XPR.number(_round(number * pow) / pow);
      } else {
        return XPR.number(pow * _round(number / pow));
      }
    },
    selected: function(haystack, needle) {
      return XPR.boolean(asString(haystack).split(' ').indexOf(asString(needle).trim()) !== -1);
    },
    'selected-at': function(list, index) {
      if(!index) throw new Error('No index provided for selected-at() [index=' + index + '; list=' + JSON.stringify(list));
      return XPR.string(asString(list).split(' ')[asInteger(index)] || '');
    },
    sin: function(r) { return XPR.number(Math.sin(asNumber(r))); },
    sqrt: function(r) { return XPR.number(Math.sqrt(asNumber(r))); },
    string: function(r) {
      if(arguments.length > 1) throw new Error(`string() passed wrong arg count (expected 0 or 1, but got ${arguments.length})`);
      return XPR.string(asString(r || this.cN));
    }, // TODO this is not an extension - should be a "native" function
    'string-length': function(r) {
      if(arguments.length > 1) throw new Error('too many args');
      const str = asString(r || this.cN);
      // implemented as per https://www.w3.org/TR/1999/REC-xpath-19991116/#function-string-length, rather than the restricted ODK implementation
      return XPR.number(str.length);
    },
    substr: function(s, startIndex, endIndex) {
      return XPR.string(asString(s).slice(asNumber(startIndex), endIndex && asNumber(endIndex)));
    },
    sum: function(r) {
      if(!r || r.t !== 'arr') throw new Error('sum() must be called on a nodeset');
      let sum = 0, i = r.v.length;
      while(i--) sum += asNumber(r.v[i]);
      return XPR.number(sum);
    },
    tan: function(r) { return XPR.number(Math.tan(asNumber(r))); },
    'true': function() {
      if(arguments.length) throw TOO_MANY_ARGS;
      return XPR.boolean(true);
    },
    uuid: function(r) {
      if(r) return XPR.string(randomToken(asNumber(r)));
      return XPR.string(uuid());
    },
    'weighted-checklist': function(min, max, ...list) {
      min = asNumber(min);
      max = asNumber(max);
      let values = [], weights = [], weightedTrues = 0;
      for(let i=0; i<list.length; i+=2) {
        const v = list[i];
        const w = list[i+1];
        if(v && w) {
          // value or weight might be a nodeset
          values  = values. concat(mapFn(asBoolean, v));
          weights = weights.concat(mapFn(asNumber,  w));
        }
      }
      for(let i=0; i < values.length; i++) {
        if(values[i]) {
          weightedTrues += weights[i] || 0;
        }
      }
      return XPR.boolean((min < 0 || weightedTrues >= min) && (max < 0 || weightedTrues <= max));
    }
  };

  // function aliases
  func['date-time'] = func.date;
  func['format-date-time'] = func['format-date'];

  const process = {
      toExternalResult: function(r, resultType) {
        if(r.t === 'arr' && resultType === XPathResult.NUMBER_TYPE) {
          const str = asString(r);
          if(DATE_STRING.test(str)) {
            return { resultType, numberValue:dateStringToDays(str) };
          }
        }
        if(r.t === 'date') {
          switch(resultType) {
            case XPathResult.BOOLEAN_TYPE: return { resultType, booleanValue:!isNaN(r.v) };
            case XPathResult.NUMBER_TYPE:  return { resultType, numberValue:asNumber(r) };
            case XPathResult.ANY_TYPE:
            case XPathResult.STRING_TYPE:
              return { resultType, stringValue:asString(r) };
            default: throw new Error(`toExternalResult() doesn't know how to convert a date to ${resultType}`);
          }
        }
      },
      typefor: function(val) {
        if(val instanceof Date) return 'date';
      },
      handleInfix: function(err, lhs, op, rhs) {
        if(lhs.t === 'date' || rhs.t === 'date') {
          if(lhs.t === 'bool' || rhs.t === 'bool') {
            // date comparisons with booleans should be coerced to boolean
            return;
          }

          // For comparisons, we must make sure that both values are numbers
          // Dates would be fine, except for equality!
          if(op >= EQ && op <= GTE) {
            if(lhs.t === 'arr' || lhs.t === 'str') lhs = XPR.date(asDate(lhs));
            if(rhs.t === 'arr' || rhs.t === 'str') rhs = XPR.date(asDate(rhs));
            if(lhs.t !== 'date' || rhs.t !== 'date') {
              return op === '!=';
            } else {
              lhs = { t:'num', v:lhs.v.getTime() };
              rhs = { t:'num', v:rhs.v.getTime() };
            }
          } else if(op === PLUS || op === MINUS) {
            // for math operators, we need to do it ourselves
            if(lhs.t === 'date' && rhs.t === 'date') err('No handling for simple arithmetic with two dates.');
            const d = lhs.t === 'date'? lhs.v: rhs.v,
                res = new Date(d.getTime());
            let n = lhs.t !== 'date'? asInteger(lhs): asInteger(rhs);
            if(op === MINUS) n = -n;
            res.setDate(d.getDate() + n);
            return res;
          }
          return { t:'continue', lhs:lhs, op:op, rhs:rhs };
        }

        // try to coerce non-dates into dates :o
        if(op === PLUS || op === MINUS) {
          const lStr = asString(lhs);
          if(DATE_STRING.test(lStr)) {
            const lDays = dateStringToDays(lStr);
            const rDays = asNumber(rhs);
            const delta = op === PLUS ? lDays + rDays : lDays - rDays;
            const date = new Date(1970, 0, 1);
            date.setDate(date.getDate() + delta);
            return date;
          }

          const rStr = asString(rhs);
          if(DATE_STRING.test(rStr)) {
            const rDays = dateStringToDays(rStr);
            const lDays = asNumber(lhs);
            const delta = op === PLUS ? lDays + rDays : lDays - rDays;
            const date = new Date(1970, 0, 1);
            date.setDate(date.getDate() + delta);
            return date;
          }
        } else if(op >= EQ && op <= GTE) {
          const lStr = asString(lhs);
          if(DATE_STRING.test(lStr)) lhs = XPR.number(dateStringToDays(lStr));

          const rStr = asString(rhs);
          if(DATE_STRING.test(rStr)) rhs = XPR.number(dateStringToDays(rStr));

          return { t:'continue', lhs, op, rhs };
        }

      },
  };

  ret.func = func;
  ret.process = process;
  ret.XPR = XPR;
  ret._now = function() { // This is exposed in ret to allow for unit testing, although this is not currently utilised.
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  };

  return ret;
};

module.exports = openrosa_xpath_extensions;

function mapFn(fn) {
  const res = [];
  for(let i=1; i<arguments.length; ++i) {
    if(arguments[i].t === 'arr') {
      for(let j=0; j<arguments[i].v.length; ++j) {
        res.push(fn(arguments[i].v[j]));
      }
    } else res.push(fn(arguments[i]));
  }
  return res;
}

function asInteger(r) {
  const num = asNumber(r);
  return num > 0 ? Math.floor(num) : Math.ceil(num);
}

function asDate(r) {
  let temp;
  switch(r.t) {
    case 'bool': return new Date(NaN);
    case 'date': return r.v;
    case 'num':  temp = new Date(1970, 0, 1); temp.setDate(temp.getDate() + r.v); return temp;
    case 'arr':
    case 'str':
      r = asString(r);
      if(RAW_NUMBER.test(r)) {
        // Create a date at 00:00:00 1st Jan 1970 _in the current timezone_
        temp = new Date(1970, 0, 1);
        temp.setDate(1 + parseInt(r, 10));
        return temp;
      } else if(DATE_STRING.test(r)) {
        temp = r.indexOf('T');
        if(temp !== -1) r = r.substring(0, temp);
        temp = r.split('-');
        if(isValidDate(temp[0], temp[1], temp[2])) {
          const time = `${_zeroPad(temp[0])}-${_zeroPad(temp[1])}-${_zeroPad(temp[2])}`+
            'T00:00:00.000' + (new Date(r)).getTimezoneOffsetAsTime();
          return new Date(time);
        }
      }
      return new Date(r);
    default: throw new Error(`asDate() can't handle ${r.t}s yet :-(`);
  }
}

function _zeroPad(n, len) {
  len = len || 2;
  n = n.toString();
  while(n.length < len) n = '0' + n;
  return n;
}

function getNodeName(ctx, r) {
  const node = getNode(ctx, r);
  return node ? node.nodeName : '';
}

/**
 * If r is supplied, returns the first Element or Attribute in r by document order.
 * If r is not supplied, returns the ctx iff it is an Element or Attribute.
 */
function getNode(ctx, r) {
  if(arguments.length > 2) throw new Error('too many args');
  if(!r) return isNodeish(ctx.cN) ? ctx.cN : null;
  if(r.t !== 'arr') throw new Error('wrong arg type');
  if(!r.v.length) return;
  sortByDocumentOrder({ t:'arr', v:r.v.filter(isNodeish) });
  return r.v[0];
}

/**
 * I can't decode what a QName is from the spec, but it seems like only the
 * following nodeTypes are considered by XPath:
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
 */
const NODEISH = {
  [Node.ELEMENT_NODE               ]: true,
  [Node.ATTRIBUTE_NODE             ]: true,
  [Node.PROCESSING_INSTRUCTION_NODE]: true,
  [Node.DOCUMENT_TYPE_NODE         ]: true,
};
function isNodeish({ nodeType }) {
  return NODEISH[nodeType];
}

/**
 * Implementation from https://stackoverflow.com/a/2117523, added in revision
 * https://stackoverflow.com/revisions/2117523/11, licensed under CC by SA 3.0
 * (https://creativecommons.org/licenses/by-sa/3.0/), see
 * https://stackoverflow.com/posts/2117523/timeline.  Formatting may have been
 * changed.
 */
function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

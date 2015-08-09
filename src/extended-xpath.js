var ExtendedXpathEvaluator = function(wrapped, extendedFuncs) {
  var
    zeroPad = function(n) {
      n = n.toString();
      if(n.length < 2) n = '0' + n;
      return n;
    },
    dateToString = function(d) {
          return d.getFullYear() + '-' + zeroPad(d.getMonth()+1) + '-' +
              zeroPad(d.getDate());
    },
    num = function(o) {
      return o.t === 'num'? o.v: parseFloat(o.v);
    },
    toInternalResult = function(r) {
      if(r.resultType === XPathResult.NUMBER_TYPE) return { t:'num', v:r.numberValue };
      if(r.resultType === XPathResult.BOOLEAN_TYPE) return {  t:'bool', v:r.booleanValue };
      return { t:'str', v:r.stringValue };
    },
    toExternalResult = function(r) {
      if(r.t === 'num') return { resultType:XPathResult.NUMBER_TYPE, numberValue:r.v, stringValue:r.v.toString() };
      if(r.t === 'bool') return { resultType:XPathResult.BOOLEAN_TYPE, booleanValue:r.v, stringValue:r.v.toString() };
      if(r.t === 'date') return { resultType:XPathResult.STRING_TYPE, stringValue:dateToString(r.v) };
      return { resultType:XPathResult.STRING_TYPE, stringValue:r.v.toString() };
    },
    callFn = function(name, args) {
      if(extendedFuncs.hasOwnProperty(name)) {
        return callExtended(name, args);
      }
      return callNative(name, args);
    },
    callExtended = function(name, args) {
      var argVals = [], argString, res, i;
      for(i=0; i<args.length; ++i) argVals.push(args[i].v);
      res = extendedFuncs[name].apply(null, argVals);
      return res;
    },
    callNative = function(name, args) {
      var argString = '', arg, quote, i;
      for(i=0; i<args.length; ++i) {
        arg = args[i];
        if(arg.t !== 'num' && arg.t !== 'bool') {
          quote = arg.v.indexOf('"') === -1 ? '"' : "'";
          argString += quote;
        }
        argString += arg.v;
        if(arg.t === 'bool') argString += '()';
        if(arg.t !== 'num' && arg.t !== 'bool') argString += quote;
        if(i < args.length - 1) argString += ', ';
      }
      return toInternalResult(wrapped(name + '(' + argString + ')'));
    },
    typefor = function(val) {
      if(val instanceof Date) return 'date';
      if(typeof val === 'boolean') return 'bool';
      if(typeof val === 'number') return 'number';
      return 'str';
    },
  ___end_vars___;

  this.evaluate = function(input) {
    var cur, stack = [{ t:'root', tokens:[] }],
      peek = function() { return stack.slice(-1)[0]; },
      err = function(message) { throw new Error((message||'') + ' [stack=' + JSON.stringify(stack) + '] [cur=' + JSON.stringify(cur) + ']'); },
      newCurrent = function() { cur = { t:'?', v:'' }; },
      backtrack = function() {
        // handle infix operators
        var res, len, tokens, lhs, rhs, op;
        tokens = peek().tokens;
        len = tokens.length;
        if(len >= 3) {
          lhs = tokens[len - 3];
          op  = tokens[len - 2];
          rhs = tokens[len - 1];

          // TODO this date stuff is openrosa-specific, so should be moved
          // to the openrosa_xpath_extensions object
          if(lhs.t === 'date' || rhs.t === 'date') {
            (function() {
              /*var d = lhs.t === 'date' ? lhs.v : rhs.v;
              var i = lhs.t !== 'date' ? lhs.v : rhs.v;
              if(       op.t === '+') {
                res = new Date();
                res.setUTCDate(d.getDate + i);
              } else if(op.t === '-') {
                res = new Date();
                res.setUTCDate(d.getDate - i);
              }*/

              // For comparisons, we must make sure that both values are numbers
              // Dates would be fine, except for quality!
              if( op.t === '=' ||
                  op.t === '<' ||
                  op.t === '>' ||
                  op.t === '<=' ||
                  op.t === '>=' ||
                  op.t === '!=') {
                if(lhs.t === 'str') lhs = extendedFuncs.date(lhs.v);
                if(rhs.t === 'str') rhs = extendedFuncs.date(rhs.v);
                if(lhs.t !== 'date' || rhs.t !== 'date') {
                  res = op.t === '!=';
                } else {
                  lhs = { t:'num', v:lhs.v.getTime() };
                  rhs = { t:'num', v:rhs.v.getTime() };
                }
              } else if(op.t === '+' || op.t === '-') {
                // for math operators, we need to do it ourselves
                (function() {
                  if(lhs.t === 'date' && rhs.t === 'date') err();
                  var d = lhs.t === 'date'? lhs.v: rhs.v,
                      n = lhs.t !== 'date'? num(lhs): num(rhs);
                  if(op.t === '-') n = -n;
                  res = new Date(d.getTime());
                  res.setUTCDate(d.getDate() + n);
                }());
              }
            }());
          }

          if(typeof res === 'undefined') {
            if(     op.t === '+') res = lhs.v + rhs.v;
            else if(op.t === '-') res = lhs.v - rhs.v;
            else if(op.t === '*') res = lhs.v * rhs.v;
            else if(op.t === '/') res = lhs.v / rhs.v;
            else if(op.t === '%') res = lhs.v % rhs.v;
            else if(op.t === '=') res = lhs.v === rhs.v;
            else if(op.t === '<') res = lhs.v < rhs.v;
            else if(op.t === '>') res = lhs.v > rhs.v;
            else if(op.t === '<=') res = lhs.v <= rhs.v;
            else if(op.t === '>=') res = lhs.v >= rhs.v;
            else if(op.t === '!=') res = lhs.v != rhs.v;
          }

          if(typeof res !== 'undefined') {
            tokens = tokens.slice(0, -3);
            tokens.push({ t:typefor(res), v:res });
            peek().tokens = tokens;
          }
        }
      },
      handleXpathExpr = function() {
        var evaluated, v = cur.v.trim();
        if(/^-?[0-9]+(\.[0-9]+)?$/.test(v)) {
          evaluated = { t:'num', v:parseFloat(v) };
        } else {
          evaluated = toInternalResult(wrapped(cur.v));
        }
        peek().tokens.push(evaluated);
        newCurrent();
        backtrack();
      },
      lastChar = function() {
        if(i > 0) return input.charAt(i-1);
      },
      nextChar = function() {
        if(i < input.length -1) return input.charAt(i+1);
      },
      ___end_vars___;

    newCurrent();

    for(i=0; i<input.length; ++i) {
      c = input.charAt(i);
      if(cur.t === 'str') {
        if(c === cur.quote) {
          peek().tokens.push(cur);
          backtrack();
          newCurrent();
        } else cur.v += c;
      } else switch(c) {
        case "'":
        case '"':
          if(cur.t === '?' && cur.v === '') {
            cur = { t:'str', quote:c, v:'' };
          } else err('Not sure how to handle: ' + c);
          break;
        case '(':
          if(cur.t === '?' && cur.v !== '') {
            cur.t = 'fn';
            cur.tokens = [];
            stack.push(cur);
            newCurrent();
          } else err();
          break;
        case ')':
          if(cur.t === '?') {
            if(cur.v !== '') handleXpathExpr();
            var fn = stack.pop();
            if(fn.t !== 'fn') err();
            peek().tokens.push(callFn(fn.v, fn.tokens));
            backtrack();
            newCurrent();
          } else err();
          break;
        case ',':
          if(cur.t === '?') {
            if(cur.v !== '') handleXpathExpr();
            if(peek().t !== 'fn') err();
          } else err();
          break;
        case '-':
          if(/[0-9]/.test(nextChar()) ||
              (nextChar() !== ' ' && lastChar() !== ' ')) {
            // -ve number or function name expr
            cur.v += c;
            break;
          } // else it's `-` operator
          /* falls through */
        case '=':
          if(c === '=' && (cur.v === '<' || cur.v === '&lt;' ||
              cur.v === '>' || cur.v === '&gt;' || cur.v === '!')) {
            cur.v += c; break;
          }
          /* falls through */
        case '>':
        case '<':
          if((c === '<' || c === '>') && nextChar() === '=') {
            cur.v += c; break;
          }
          /* falls through */
        case '+':
        case '*':
          if(cur.t === '?') {
            if(cur.v !== '') handleXpathExpr();
            peek().tokens.push({ t:c });
          } else err();
          break;
        case ' ':
          if(cur.t === '?') {
            if(cur.v !== '') {
              if(cur.v === 'mod') {
                peek().tokens.push({ t:'%' });
                newCurrent();
              } else if(cur.v === 'div') {
                peek().tokens.push({ t:'/' });
                newCurrent();
              } else if(cur.v === '&lt;') {
                peek().tokens.push({ t:'<' });
                newCurrent();
              } else if(cur.v === '&gt;') {
                peek().tokens.push({ t:'>' });
                newCurrent();
              } else if(cur.v === '<=' || cur.v === '&lt;=') {
                peek().tokens.push({ t:'<=' });
                newCurrent();
              } else if(cur.v === '>=' || cur.v === '&gt;=') {
                peek().tokens.push({ t:'>=' });
                newCurrent();
              } else if(cur.v === '!=') {
                peek().tokens.push({ t:'!=' });
                newCurrent();
              } else {
                handleXpathExpr();
              }
            }
            break;
          }
          /* falls through */
        default:
          cur.v += c;
      }
    }

    if(cur.t === '?' && cur.v !== '') handleXpathExpr();

    if(cur.t !== '?' || cur.v !== '' || (cur.tokens && current.tokens.length)) err('Current item not evaluated!');
    if(stack.length > 1) err('Stuff left on stack.');
    if(stack[0].t !== 'root') err('Weird stuff on stack.');
    if(stack[0].tokens.length === 0) err('No tokens.');
    if(stack[0].tokens.length > 1) err('Too many tokens.');

    return toExternalResult(stack[0].tokens[0]);
  };
};

if(typeof define === 'function') {
  define(function() { return ExtendedXpathEvaluator; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ExtendedXpathEvaluator;
}

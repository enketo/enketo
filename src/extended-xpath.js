var ExtendedXpathEvaluator = function(wrapped, extendedFuncs) {
  var
    TYPE = XPathResult ? {
      num: XPathResult.NUMBER_TYPE,
      str: XPathResult.STRING_TYPE,
    } : {
      num: 1,
      str: 2,
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
      return extendedFuncs[name].apply(null, argVals);
    },
    callNative = function(name, args) {
      var argString = '', arg, quote, i;
      for(i=0; i<args.length; ++i) {
        arg = args[i];
        if(arg.t !== 'num') {
          quote = arg.v.indexOf('"') === -1 ? '"' : "'";
          argString += quote;
        }
        argString += arg.v;
        if(arg.t !== 'num') argString += quote;
        if(i < args.length - 1) argString += ', ';
      }
      return wrapped({ t:'str', v:name + '(' + argString + ')' });
    },
    typefor = function(val) {
      switch(typeof val) {
        case 'boolean': return 'bool';
        case 'number': return 'num';
        default: return 'str';
      }
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

          if(   op.t === '+') res = lhs.v + rhs.v;
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

          if(typeof res !== 'undefined') {
            tokens = tokens.slice(0, -3);
            tokens.push({ t:typefor(res), v:res });
            peek().tokens = tokens;
          }
        }
      },
      handleXpathExpr = function() {
        peek().tokens.push(wrapped(cur));
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
    cur = stack[0].tokens[0];
    // TODO these will disappear when we start using XPathResult internally
    if(cur.t === 'num') {
      return { numberValue: cur.v, stringValue: cur.v.toString(), };
    }
    if(cur.t === 'bool') {
      return { booleanValue: cur.v, stringValue: cur.v.toString(), };
    }
    return {
      stringValue: cur.v.toString(),
    };
  };
};

if(typeof define === 'function') {
  define(function() { return ExtendedXpathEvaluator; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ExtendedXpathEvaluator;
}

/*
 * From http://www.w3.org/TR/xpath/#section-Expressions XPath infix
 * operator precedence is left-associative, and as follows:
 */
var OP_PRECEDENCE = [
  ['|'],
  ['&'],
  ['=', '!='],
  ['<', '<=', '>=', '>'],
  ['+', '-'],
  ['*', '/', '%']
];

var DIGIT = /[0-9]/;
var FUNCTION_NAME = /^[a-z]/;

// TODO remove all the checks for cur.t==='?' - what else woudl it be?
var ExtendedXpathEvaluator = function(wrapped, extensions) {
  var
    extendedFuncs = extensions.func || {},
    extendedProcessors = extensions.process || {},
    toInternalResult = function(r) {
      if(r.resultType === XPathResult.NUMBER_TYPE) return { t:'num', v:r.numberValue };
      if(r.resultType === XPathResult.BOOLEAN_TYPE) return {  t:'bool', v:r.booleanValue };
      return { t:'str', v:r.stringValue };
    },
    toExternalResult = function(r) {
      if(extendedProcessors.toExternalResult) {
        var res = extendedProcessors.toExternalResult(r);
        if(res) return res;
      }
      if(r.t === 'num') return { resultType:XPathResult.NUMBER_TYPE, numberValue:r.v, stringValue:r.v.toString() };
      if(r.t === 'bool') return { resultType:XPathResult.BOOLEAN_TYPE, booleanValue:r.v, stringValue:r.v.toString() };
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
      if(extendedProcessors.typefor) {
        var res = extendedProcessors.typefor(val);
        if(res) return res;
      }
      if(typeof val === 'boolean') return 'bool';
      if(typeof val === 'number') return 'num';
      return 'str';
    },
  ___end_vars___;

  this.evaluate = function(input) {
    var cur, stack = [{ t:'root', tokens:[] }],
      peek = function() { return stack[stack.length-1]; },
      err = function(message) { throw new Error((message||'') + ' [stack=' + JSON.stringify(stack) + '] [cur=' + JSON.stringify(cur) + ']'); },
      newCurrent = function() { cur = { t:'?', v:'' }; },
      pushOp = function(t) {
        peek().tokens.push({ t:'op', v:t });
        newCurrent();
      },
      evalOp = function(lhs, op, rhs) {
        if(extendedProcessors.handleInfix) {
          var res = extendedProcessors.handleInfix(lhs, op, rhs);
          if(res && res.t === 'continue') {
            lhs = res.lhs; op = res.op; rhs = res.rhs; res = null;
          }

          if(typeof res !== 'undefined' && res !== null) return res;
        }

        switch(op.v) {
          case '+':  return lhs.v + rhs.v;
          case '-':  return lhs.v - rhs.v;
          case '*':  return lhs.v * rhs.v;
          case '/':  return lhs.v / rhs.v;
          case '%':  return lhs.v % rhs.v;
          case '=':  return lhs.v === rhs.v;
          case '<':  return lhs.v < rhs.v;
          case '>':  return lhs.v > rhs.v;
          case '<=': return lhs.v <= rhs.v;
          case '>=': return lhs.v >= rhs.v;
          case '!=': return lhs.v != rhs.v;
          case '&':  return lhs.v && rhs.v;
          case '|':  return lhs.v || rhs.v;
        }
      },
      evalOpAt = function(tokens, opIndex) {
        res = evalOp(
            tokens[opIndex - 1],
            tokens[opIndex],
            tokens[opIndex + 1]);

        if(typeof res !== 'undefined' && res !== null) {
          tokens.splice(opIndex, 2);
          tokens[opIndex - 1] = { t:typefor(res), v:res };
        }
      },
      backtrack = function() {
        // handle infix operators
        var i, ops, tokens;
        tokens = peek().tokens;

        for(j=OP_PRECEDENCE.length-1; j>=0; --j) {
          ops = OP_PRECEDENCE[j];
          i = 1;
          while(i < tokens.length-1) {
            if(tokens[i].t === 'op' && ops.indexOf(tokens[i].v) !== -1) {
              evalOpAt(tokens, i);
            } else ++i;
          }
        }
      },
      handleXpathExpr = function() {
        var v = cur.v.trim(),
            evaluated = toInternalResult(wrapped(cur.v));
        peek().tokens.push(evaluated);
        newCurrent();
      },
      lastChar = function() {
        if(i > 0) return input.charAt(i-1);
      },
      nextChar = function() {
        if(i < input.length -1) return input.charAt(i+1);
      },
      finaliseNum = function() {
        cur.v = parseFloat(cur.string);
        peek().tokens.push(cur);
        newCurrent();
      },
      ___end_vars___;

    newCurrent();

    for(i=0; i<input.length; ++i) {
      c = input.charAt(i);
      if(cur.t === 'str') {
        if(c === cur.quote) {
          peek().tokens.push(cur);
          newCurrent();
        } else cur.v += c;
        continue;
      }
      if (cur.t === 'num') {
        if(DIGIT.test(c)) {
          cur.string += c;
          continue;
        } else if(c === '.' && !cur.decimal) {
          cur.decimal = 1;
          cur.string += c;
        } else finaliseNum();
      }
      switch(c) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if(cur.v === '') {
            cur = { t:'num', string:c };
          } else cur.v += c;
          break;
        case "'":
        case '"':
          if(cur.v === '') {
            cur = { t:'str', quote:c, v:'' };
          } else err('Not sure how to handle: ' + c);
          break;
        case '(':
          cur.t = 'fn';
          cur.tokens = [];
          stack.push(cur);
          newCurrent();
          break;
        case ')':
          if(cur.v !== '') handleXpathExpr();
          backtrack();
          cur = stack.pop();
          if(cur.t !== 'fn') err();
          if(cur.v) {
            peek().tokens.push(callFn(cur.v, cur.tokens));
          } else {
            if(cur.tokens.length !== 1) err();
            peek().tokens.push(cur.tokens[0]);
          }
          newCurrent();
          break;
        case ',':
          if(cur.v !== '') handleXpathExpr();
          if(peek().t !== 'fn') err();
          break;
        case ';':
          if(nextChar() !== '=') {
            switch(cur.v) {
              case '&lt': pushOp('<'); continue;
              case '&gt': pushOp('>'); continue;
            }
          }
          /* falls through */
        case '-':
          if(cur.v !== '') {
            // function name expr
            cur.v += c;
            break;
          } else if(peek().tokens.length === 0) {
            // -ve number
            cur = { t:'num', string:'-' };
            break;
          } // else it's `-` operator
          /* falls through */
        case '=':
          if(c === '=' && (cur.v === '<' || cur.v === '&lt;' ||
              cur.v === '>' || cur.v === '&gt;' || cur.v === '!')) {
            cur.v += c;
            switch(cur.v) {
              case '<=': case '&lt;=': pushOp('<='); break;
              case '>=': case '&gt;=': pushOp('>='); break;
              case '!=':               pushOp('!='); break;
            }
            break;
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
          // > If there is a preceding token and the preceding token is not one
          // > of @, ::, (, [, , or an Operator, then a * must be recognized as
          // > a MultiplyOperator and an NCName must be recognized as an
          // > OperatorName.
          // > – https://www.w3.org/TR/xpath/#exprlex
          if(cur.v !== '') {
            switch(cur.v.charAt(cur.v.length-1)) {
              case ':':
                if(cur.v.length < 2 || cur.v.charAt(cur.v.length-2) != ':') {
                  // * is a MultiplyOperator!
                  break;
                }
                /* falls through */
              case '/':
                cur.v += c;
                continue;
            }
            // * is a MultiplyOperator!
            handleXpathExpr();
          }
          peek().tokens.push({ t:'op', v:c });
          break;
        case ' ':
          switch(cur.v) {
            case '': break; // trim leading whitespace
            case 'mod': pushOp('%'); break;
            case 'div': pushOp('/'); break;
            case 'and': pushOp('&'); break;
            case 'or':  pushOp('|'); break;
            default: if(!FUNCTION_NAME.test(cur.v)) handleXpathExpr();
          }
          break;
        default:
          cur.v += c;
      }
    }

    if(cur.t === 'num') finaliseNum();

    if(cur.t === '?' && cur.v !== '') handleXpathExpr();

    if(cur.t !== '?' || cur.v !== '' || (cur.tokens && current.tokens.length)) err('Current item not evaluated!');
    if(stack.length > 1) err('Stuff left on stack.');
    if(stack[0].t !== 'root') err('Weird stuff on stack.');
    if(stack[0].tokens.length === 0) err('No tokens.');
    if(stack[0].tokens.length >= 3) backtrack();
    if(stack[0].tokens.length > 1) err('Too many tokens.');

    return toExternalResult(stack[0].tokens[0]);
  };
};

if(typeof define === 'function') {
  define(function() { return ExtendedXpathEvaluator; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ExtendedXpathEvaluator;
}

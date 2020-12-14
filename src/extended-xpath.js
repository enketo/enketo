var config = require('./config');
var shuffle = require('./utils/shuffle');
var {isNamespaceExpr, handleNamespaceExpr} = require('./utils/ns');
var {handleOperation} = require('./utils/operation');
var {isNativeFunction, preprocessNativeArgs} = require('./utils/native');
var {DATE_STRING, dateToDays} = require('./utils/date');
var {toNodes, toSnapshotResult} = require('./utils/result');
var {inputArgs, preprocessInput} = require('./utils/input');
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
var NUMERIC_COMPARATOR = /(>|<)/;
var BOOLEAN_COMPARATOR = /(=)/;
var BOOLEAN_FN_COMPARATOR = /(true\(\)|false\(\))/;
var COMPARATOR = /(=|<|>)/;

var INVALID_ARGS = new Error('invalid args');
var TOO_FEW_ARGS = new Error('too few args');

// TODO remove all the checks for cur.t==='?' - what else woudl it be?
var ExtendedXPathEvaluator = function(wrapped, extensions) {
  var
    extendedFuncs = extensions.func || {},
    extendedProcessors = extensions.process || {},
    toInternalResult = function(r) {
      var n, v;
      if(r.resultType === XPathResult.NUMBER_TYPE) return { t:'num', v:r.numberValue };
      if(r.resultType === XPathResult.BOOLEAN_TYPE) return {  t:'bool', v:r.booleanValue };
      if(r.resultType === XPathResult.UNORDERED_NODE_ITERATOR_TYPE) {
        v = [];
        while((n = r.iterateNext())) v.push(n.textContent);
        return { t:'arr', v:v };
      }
      return { t:'str', v:r.stringValue };
    },
    toExternalResult = function(r, rt) {
      if(extendedProcessors.toExternalResult) {
        var res = extendedProcessors.toExternalResult(r);
        if(res) return res;
      }

      if((r.t === 'arr' && rt === XPathResult.NUMBER_TYPE && DATE_STRING.test(r.v[0])) ||
          (r.t === 'str' && rt === XPathResult.NUMBER_TYPE && DATE_STRING.test(r.v))) {
        var val = r.t === 'arr' ? r.v[0] : r.v;
        var days = dateToDays(val);
        return {
          resultType:XPathResult.NUMBER_TYPE,
          numberValue:days,
          stringValue:days
        };
      }

      if(r.t === 'num') return { resultType:XPathResult.NUMBER_TYPE, numberValue:r.v, stringValue:r.v.toString() };
      if(r.t === 'bool')return { resultType:XPathResult.BOOLEAN_TYPE, booleanValue:r.v, stringValue:r.v.toString() };

      if(rt > 3) {
        r = shuffle(r[0], r[1]);
        return toSnapshotResult(r, rt);
      }

      if(!r.t && Array.isArray(r)) {
        if(rt === XPathResult.NUMBER_TYPE) {
          var v = parseInt(r[0].textContent);
          return { resultType:XPathResult.NUMBER_TYPE, numberValue:v, stringValue:v.toString() };
        } else if(rt === XPathResult.STRING_TYPE) {
          return { resultType:XPathResult.STRING_TYPE, stringValue: r.length ? r[0] : '' };
        }
      }

      return { resultType:XPathResult.STRING_TYPE, stringValue: r.v===null ? '' : r.v.toString() };
    },
    callFn = function(name, supplied, rt) {
      // Every second arg should be a comma, but we allow for a trailing comma.
      // From the spec, this looks valid, if you assume that ExprWhitespace is a
      // valid Expr.
      // see: https://www.w3.org/TR/1999/REC-xpath-19991116/#section-Function-Calls
      var args = [], i;
      for(i=0; i<supplied.length; ++i) {
        if(i % 2) {
          if(supplied[i] !== ',') throw new Error('Weird args (should be separated by commas):' + JSON.stringify(supplied));
        } else args.push(supplied[i]);
      }

      if(extendedFuncs.hasOwnProperty(name)) {
        // if(rt && (/^(date|true|false|now$|today$|randomize$)/.test(name))) args.push(rt);
        if(rt && (/^(date|now$|today$|randomize$)/.test(name))) args.push(rt);
        if(/^(true$|false$)/.test(name)) args.push(rt || XPathResult.BOOLEAN_TYPE);
        return callExtended(name, args);
      }

      if(name === 'normalize-space' && args.length) {
        var res = args[0].v;
        res = res.replace(/\f/g, '\\f');
        res = res.replace(/\r\v/g, '\v');
        res = res.replace(/\v/g, '\\v');
        res = res.replace(/\s+/g, ' ');
        res = res.replace(/^\s+|\s+$/g, '');
        res = res.replace(/\\v/g, '\v');
        res = res.replace(/\\f/g, '\f');
        return {t: 'str', v: res};
      }

      if(name === 'string' && args.length > 0 && (
        args[0].v === Number.POSITIVE_INFINITY ||
        args[0].v === Number.NEGATIVE_INFINITY ||
        args[0].v !== args[0].v )) {//NaN
        return { t:'str', v: args[0].v };
      }
      return callNative(name, preprocessNativeArgs(name, args));
    },
    callExtended = function(name, args) {
      var argVals = [], res, i;
      for(i=0; i<args.length; ++i) argVals.push(args[i]);
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
    };

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate
   */
  this.evaluate = function(input, cN, nR, rT) {
    input = preprocessInput(input, rT);
    if(isNamespaceExpr(input)) return handleNamespaceExpr(input, cN);

    if(isNativeFunction(input) &&
      input.indexOf('[selected(') < 0 &&
      !(input.startsWith('/') && input.indexOf(' ')>0) &&
      input !== '/') {
      var args = inputArgs(input);
      if(args.length && args[0].length && !isNaN(args[0])) { throw INVALID_ARGS; }
      if(input === 'lang()') throw TOO_FEW_ARGS;
      if(/^lang\(/.test(input) && cN.nodeType === 2) cN = cN.ownerElement;
      var res = wrapped(input, cN);
      if(rT === XPathResult.NUMBER_TYPE &&
        (res.resultType === XPathResult.UNORDERED_NODE_ITERATOR_TYPE ||
         res.resultType === XPathResult.UNORDERED_NODE_ITERATOR_TYPE)) {
        var val = parseInt(res.iterateNext().textContent);
        return {
          resultType: XPathResult.NUMBER_TYPE,
          numberValue: val,
          stringValue: val
        };
      }

      if(rT === XPathResult.STRING_TYPE &&
        res.resultType === XPathResult.STRING_TYPE &&
        res.stringValue.startsWith('<xpath:')) {
        return {
          resultType: XPathResult.STRING_TYPE,
          stringValue: res.stringValue.substring(7, res.stringValue.length-1)
        };
      }
      if(rT === XPathResult.STRING_TYPE && res.resultType >= 6) {
        if(res.snapshotLength) {
          return { resultType: rT, stringValue: res.snapshotItem(0).textContent };
        }
        return { resultType: rT, stringValue: '' };
      }
      if(rT === XPathResult.STRING_TYPE && res.resultType === XPathResult.NUMBER_TYPE) {
        return { resultType: rT, numberValue: res.numberValue, stringValue: res.numberValue.toString() };
      }
      if(rT === XPathResult.STRING_TYPE && res.resultType >= 4) {
        var firstNode = res.iterateNext();
        var firstNodeValue =  firstNode ? firstNode.textContent : '';
        return { resultType: rT, stringValue: firstNodeValue };
      }
      if(rT === XPathResult.BOOLEAN_TYPE && res.resultType >= 4) {
        return { resultType: rT, booleanValue: !!res.iterateNext() };
      }
      return res;
    }

    if(rT > 3 && !input.startsWith('randomize')) {
      if(input === '/') cN = cN.ownerDocument || cN;

      var selectedExprIdx = input.indexOf('[selected(');
      if(selectedExprIdx > 0) {
        var selectedExpr = input.substring(0, selectedExprIdx);
        var selection = input.substring(selectedExprIdx+10, input.indexOf(')]'));
        var selectionExpr = selection.split(',').map(s => s.trim());
        var selectionResult = wrapped(`${selectionExpr[0]}/text()`);
        if(selectionResult.snapshotLength) {
          var values = selectionResult.snapshotItem(0)
            .textContent.split(' ').map(v => `${selectionExpr[1]}="${v}"`);
          return wrapped(`${selectedExpr}[${values.join(' or ')}]`);
        }
        return toSnapshotResult([], rT);
      }

      var wrappedResult = wrapped(input, cN, nR, rT);
      // Native count always returns Number even when result type is asking
      // for a string.
      if(rT === XPathResult.STRING_TYPE &&
        wrappedResult.resultType === XPathResult.NUMBER_TYPE) {
        return {
          type: XPathResult.STRING_TYPE,
          stringValue: wrappedResult.numberValue.toString()
        };
      }
      return wrappedResult;
    }

    if(rT === XPathResult.BOOLEAN_TYPE && input.indexOf('(') < 0 &&
        input.indexOf('/') < 0 && input.indexOf('=') < 0 &&
        input.indexOf('!=') < 0) {
      input = input.replace(/(\n|\r|\t)/g, '');
      input = input.replace(/"(\d)"/g, '$1');
      input = input.replace(/'(\d)'/g, '$1');
      input = `boolean-from-string(${input})`;
    }

    if(rT === XPathResult.NUMBER_TYPE && input.indexOf('string-length') < 0) {
      input = input.replace(/(\n|\r|\t)/g, '');
    }

    var i, cur, stack = [{ t:'root', tokens:[] }],
      peek = function() { return stack[stack.length-1]; },
      err = function(message) { throw new Error((message||'') + ' [stack=' + JSON.stringify(stack) + '] [cur=' + JSON.stringify(cur) + ']'); },
      newCurrent = function() { cur = { t:'?', v:'' }; },
      pushOp = function(t) {
        peek().tokens.push({ t:'op', v:t });
        newCurrent();
      },
      evalOp = function(lhs, op, rhs) {
        if(extendedProcessors.handleInfix) {
          var res = extendedProcessors.handleInfix(err, lhs, op, rhs);
          if(res && res.t === 'continue') {
            lhs = res.lhs; op = res.op; rhs = res.rhs; res = null;
          }

          if(typeof res !== 'undefined' && res !== null) return res;
        }
        return handleOperation(lhs, op, rhs, config);
      },
      evalOpAt = function(tokens, opIndex) {
        var res = evalOp(
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
        var i, j, ops, tokens;
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
      handleXpathExpr = function(returnType) {
        var expr = cur.v;
        var evaluated;
        if(['position'].includes(peek().v)) {
          evaluated = wrapped(expr);
        } else {
          if(rT > 3 || (cur.v.indexOf('position()=') >= 0 &&
            stack.length === 1 && !/^[a-z]*[(|[]{1}/.test(cur.v))) {
            evaluated = toNodes(wrapped(expr, cN, nR, returnType));
          } else {
            if(expr.startsWith('$')) {
              evaluated = expr;
            } else {
              evaluated = toInternalResult(wrapped(expr, cN, nR, returnType));
            }
          }
        }
        peek().tokens.push(evaluated);
        newCurrent();
      },
      nextChar = function() {
        return input.charAt(i+1);
      },
      finaliseNum = function() {
        cur.v = parseFloat(cur.string);
        peek().tokens.push(cur);
        newCurrent();
      },
      prevToken = function() {
        var peeked = peek().tokens;
        return peeked[peeked.length - 1];
      },
      isNum = function(c) {
        return c >= '0' && c <= '9';
      };

    newCurrent();

    for(i=0; i<input.length; ++i) {
      var c = input.charAt(i);
      if(cur.sq) {
        cur.v += c;
        if(c === ']') --cur.sq;
        else if(c === '[') ++cur.sq;
        continue;
      }
      if(cur.t === 'str') {
        if(c === cur.quote) {
          peek().tokens.push(cur);
          newCurrent();
        } else cur.v += c;
        continue;
      }
      if(cur.t === 'num') {
        if(DIGIT.test(c) || c === 'e' ||
            (c === '-' && input[i-1] === 'e')) {
          cur.string += c;
          continue;
        } else if(c === ' ' && cur.string === '-') {
          continue;
        } else if(c === '.' && !cur.decimal) {
          cur.decimal = 1;
          cur.string += c;
        } else finaliseNum();
      }
      if(isNum(c)) {
        if(cur.v === '') {
          cur = { t:'num', string:c };
        } else cur.v += c;
      } else switch(c) {
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
          if(cur.v === 'once') {
            // TODO once() should be a custom function, and we should pass the
            // context node to all custom functions, or offer a way to access it
            newCurrent();
            cur.v = '.';
            handleXpathExpr();
            peek().tokens.push(',');
          }
          newCurrent();

          break;
        case ')':
          if(nextChar() === '[') {
            // collapse the stack, and let the native evaluator handle this...
            var tail = stack.pop();
            tail.v = tail.v + '(' + cur.v + c;
            tail.t = '?';
            cur = tail;
            break;
          }

          if(cur.v !== '') {
            handleXpathExpr(input.startsWith('randomize') ? 4 : null);
          }
          backtrack();
          cur = stack.pop();

          if(cur.t !== 'fn') err('")" outside function!');
          if(cur.v) {
            var expectedReturnType = rT;
            if(rT === XPathResult.BOOLEAN_TYPE) {
              if(NUMERIC_COMPARATOR.test(input) && !BOOLEAN_FN_COMPARATOR.test(input)) expectedReturnType = XPathResult.NUMBER_TYPE;
              if(BOOLEAN_COMPARATOR.test(input)) expectedReturnType = XPathResult.BOOLEAN_TYPE;
              if(COMPARATOR.test(input) && cur.t === 'fn' && /^(date|date-time)$/.test(cur.v)) {
                expectedReturnType = XPathResult.STRING_TYPE;
              }
            }
            const res = callFn(cur.v, cur.tokens, expectedReturnType);
            if(cur.v === 'node' && res.t === 'arr' && res.v.length > 0)
              res.v = [res.v[0]]; // only interested in first element
            peek().tokens.push(res);
          } else {
            if(cur.tokens.length !== 1) err('Expected one token, but found: ' + cur.tokens.length);
            peek().tokens.push(cur.tokens[0]);
          }
          newCurrent();
          break;
        case ',':
          if(peek().t !== 'fn') err('Unexpected comma outside function arguments.');
          if(cur.v !== '') handleXpathExpr();
          peek().tokens.push(',');
          break;
        case '*':
          if(c === '*' && (cur.v !== '' || peek().tokens.length === 0)) {
            cur.v += c;
            if(cur.v === './*') handleXpathExpr();
          } else if(cur.v === '' &&
            ([')', ''].includes(nextChar()) ||
            input.substring(i+1).trim() === ')')) {
            cur.v = c;
            handleXpathExpr();
          } else {
            pushOp(c);
          }
          break;
        case '-':
          var prev = prevToken();
          if(cur.v !== '' && nextChar() !== ' ' && input.charAt(i-1) !== ' ') {
            // function name expr
            cur.v += c;
          } else if(cur.v === '' && (
              !prev ||
              // ...+-1
              prev.t === 'op' ||
              // previous XXX
              prev === ',')) {
            // -ve number
            cur = { t:'num', string:'-' };
          } else {
            if(cur.v !== '') { // TODO could just be if(!cur.v)
              if(!DIGIT.test(cur.v) && input[i-1] !== ' ') throw INVALID_ARGS;
              peek().tokens.push(cur);
            }
            pushOp(c);
          }
          break;
        case '=':
          if(cur.v === '<' || cur.v === '&lt;' ||
              cur.v === '>' || cur.v === '&gt;' || cur.v === '!') {
            cur.v += c;
            switch(cur.v) {
              case '<=': case '&lt;=': pushOp('<='); break;
              case '>=': case '&gt;=': pushOp('>='); break;
              case '!=':               pushOp('!='); break;
            }
          } else {
            if(cur.v) handleXpathExpr();
            pushOp(c);
          }
          break;
        case ';':
          switch(cur.v) {
            case '&lt': cur.v = ''; c = '<'; break;
            case '&gt': cur.v = ''; c = '>'; break;
            default: cur.v += c; continue;
          }
          /* falls through */
        case '>':
        case '<':
          if(cur.v) handleXpathExpr();
          if(nextChar() === '=') {
            cur.v = c; break;
          }
          /* falls through */
        case '+':
          pushOp(c);
          break;
        case ' ':
          if(cur.v === '') break; // trim leading whitespace
          // trim trailing space from function names:
          if(!FUNCTION_NAME.test(cur.v)) handleXpathExpr();
          break;
        case 'v':
          // Mad as it seems, according to https://www.w3.org/TR/1999/REC-xpath-19991116/#exprlex,
          // there is no requirement for ExprWhitespace before or after any
          // ExprToken, including OperatorName.
          if(cur.v === 'di') { // OperatorName: 'div'
            pushOp('/');
          } else cur.v += c;
          break;
        case 'r':
          // Mad as it seems, according to https://www.w3.org/TR/1999/REC-xpath-19991116/#exprlex,
          // there is no requirement for ExprWhitespace before or after any
          // ExprToken, including OperatorName.
          if(cur.v === 'o') { // OperatorName: 'or'
            pushOp('|');
          } else cur.v += c;
          break;
        case 'd':
          // Mad as it seems, according to https://www.w3.org/TR/1999/REC-xpath-19991116/#exprlex,
          // there is no requirement for ExprWhitespace before or after any
          // ExprToken, including OperatorName.
          if(cur.v === 'an') { // OperatorName: 'and'
            pushOp('&');
          } else if(cur.v === 'mo') { // OperatorName: 'mod'
            pushOp('%');
          } else cur.v += c;
          break;
        case '[':
          cur.sq = (cur.sq || 0) + 1;
          /* falls through */
        case '.':
          if(cur.v === '' && nextChar() === ')') {
            cur.v = c;
            handleXpathExpr();
            break;
          }
          if(cur.v === '' && isNum(nextChar())) {
            cur = { t:'num', string:c };
            break;
          }
          /* falls through */
        default:
          cur.v += c;
      }
    }
    if(cur.t === 'num') finaliseNum();
    if(cur.t === '?' && cur.v !== '') handleXpathExpr();
    if(cur.t !== '?' || cur.v !== '' || (cur.tokens && cur.tokens.length)) err('Current item not evaluated!');
    if(stack.length > 1) err('Stuff left on stack.');
    if(stack[0].t !== 'root') err('Weird stuff on stack.');
    if(stack[0].tokens.length === 0) err('No tokens.');
    if(stack[0].tokens.length >= 3) backtrack();
    if(stack[0].tokens.length > 1) err('Too many tokens.');
    return toExternalResult(stack[0].tokens[0], rT);
  };
};

module.exports = ExtendedXPathEvaluator;

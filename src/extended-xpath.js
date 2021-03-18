const { handleOperation } = require('./utils/operation');
const { preprocessNativeArgs } = require('./utils/native');
const { toSnapshotResult } = require('./utils/result');
const { asBoolean, asNumber, asString } = require('./utils/xpath-cast');
/*
 * From http://www.w3.org/TR/xpath/#section-Expressions XPath infix operator
 * precedence is left-associative.  In the constants that follow, all but the
 * bottom two bits indicate precedence, and the entire value represents the
 * unique ID of the operator.
 *
 * These values are defined here rather than imported in an object so that they
 * can be inlined.  Copy/paste the definitions into other files where they are
 * used.
 */
const OR    = 0b00000;
// --- precedence group separator
const AND   = 0b00100;
// --- precedence group separator
const EQ    = 0b01000;
const NE    = 0b01001;
// --- precedence group separator
const LT    = 0b01100;
const LTE   = 0b01101;
const GT    = 0b01110;
const GTE   = 0b01111;
// --- precedence group separator
const PLUS  = 0b10000;
const MINUS = 0b10001;
// --- precedence group separator
const MULT  = 0b10100;
const DIV   = 0b10101;
const MOD   = 0b10110;
// --- precedence group separator
const UNION = 0b11000;
// --- end operators

const FUNCTION_NAME = /^[a-z]/;
const D = 0xDEAD; // dead-end marker for the unevaluated side of a lazy expression

module.exports = function(wrapped, extensions) {
  const
    extendedFuncs = extensions.func || {},
    extendedProcessors = extensions.process || {},
    toInternalResult = function(r) {
      let v, i, ordrd;
      switch(r.resultType) {
        case XPathResult.NUMBER_TYPE:  return { t:'num',  v:r.numberValue  };
        case XPathResult.BOOLEAN_TYPE: return { t:'bool', v:r.booleanValue };
        case XPathResult.STRING_TYPE:  return { t:'str',  v:r.stringValue  };
        case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
          ordrd = true;
          /* falls through */
        case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
          v = [];
          while((i = r.iterateNext())) v.push(i);
          return { t:'arr', v, ordrd };
        case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
          ordrd = true;
          /* falls through */
        case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
          v = [];
          for(i=0; i<r.snapshotLength; ++i) {
            v.push(r.snapshotItem(i));
          }
          return { t:'arr', v, ordrd };
        case XPathResult.ANY_UNORDERED_NODE_TYPE:
        case XPathResult.FIRST_ORDERED_NODE_TYPE:
          return { t:'arr', v:[r.singleNodeValue] };
        default:
          throw new Error(`no handling for result type: ${r.resultType}`);
      }
    },
    toExternalResult = function(r, rt) {
      if(extendedProcessors.toExternalResult) {
        const res = extendedProcessors.toExternalResult(r, rt);
        if(res) return res;
      }

      switch(rt) {
        case null:
        case undefined:
        case XPathResult.ANY_TYPE:
          // don't convert
          switch(r.t) {
            case 'num':  return { resultType:XPathResult.NUMBER_TYPE,  numberValue:r.v,  stringValue:r.v.toString() };
            case 'str':  return { resultType:XPathResult.BOOLEAN_TYPE, stringValue:r.v };
            case 'bool': return { resultType:XPathResult.BOOLEAN_TYPE, booleanValue:r.v, stringValue:r.v.toString() };
            case 'arr':  return toSnapshotResult(r, XPathResult.UNORDERED_NODE_ITERATOR_TYPE);
            default: throw new Error('unrecognised internal type: ' + r.t);
          }
        case XPathResult.NUMBER_TYPE:  return { resultType:rt, numberValue: asNumber(r),  stringValue:r.v.toString() };
        case XPathResult.STRING_TYPE:  return { resultType:rt, stringValue: asString(r) };
        case XPathResult.BOOLEAN_TYPE: return { resultType:rt, booleanValue:asBoolean(r), stringValue:r.v.toString() };
        case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
        case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
        case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
        case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
        case XPathResult.ANY_UNORDERED_NODE_TYPE:
        case XPathResult.FIRST_ORDERED_NODE_TYPE:
          return toSnapshotResult(r, rt);
        default: throw new Error('unrecognised return type:', rt);
      }
    },
    typefor = function(val) {
      if(extendedProcessors.typefor) {
        const res = extendedProcessors.typefor(val);
        if(res) return res;
      }
      if(typeof val === 'boolean') return 'bool';
      if(typeof val === 'number')  return 'num';
      return 'str';
    };

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate
   */
  const evaluate = this.evaluate = function(input, cN, nR, rT, _, contextSize=1, contextPosition=1) {
    let i, cur;
    const stack = [{ t:'root', tokens:[] }],
      peek = () => stack[stack.length-1],
      err = m => { throw new Error((m||'') + JSON.stringify({ stack, cur })); },      
      newCurrent = function() { cur = { v:'' }; },
      pushOp = function(t) {
        const peeked = peek();
        const { tokens } = peeked;
        let prev;

        if(t <= AND) {
          evalOps(t);
          prev = asBoolean(tokens[tokens.length-1]);
          if((t === OR ? prev : !prev) && peeked.t !== 'fn') peeked.dead = true;
        }

        tokens.push({ t:'op', v:t });

        if(t <= AND) {
          if(t === OR ? prev : !prev) tokens.push(D);
        }

        newCurrent();
      },
      callFn = function(name, supplied) {
        // Every second arg should be a comma, but we allow for a trailing comma.
        // From the spec, this looks valid, if you assume that ExprWhitespace is a
        // valid Expr.
        // see: https://www.w3.org/TR/1999/REC-xpath-19991116/#section-Function-Calls
        const args = [];
        for(let i=0; i<supplied.length; ++i) {
          if(i % 2) {
            if(supplied[i] !== ',') throw new Error('Weird args (should be separated by commas):' + JSON.stringify(supplied));
          } else args.push(supplied[i]);
        }

        if(Object.prototype.hasOwnProperty.call(extendedFuncs, name)) {
          return extendedFuncs[name].apply({ cN, contextSize, contextPosition }, args);
        }

        return callNative(name, preprocessNativeArgs(name, args));
      },
      callNative = function(name, args) {
        let argString = name + '(';
        for(let i=0; i<args.length; ++i) {
          if(i) argString += ',';
          const arg = args[i];
          switch(arg.t) {
            case 'arr': throw new Error(`callNative() can't handle nodeset functions yet for ${name}()`);
            case 'bool': argString += arg.v + '()'; break;
            case 'num':
              if     (arg.v ===  Infinity) argString += '( 1 div 0)';
              else if(arg.v === -Infinity) argString += '(-1 div 0)';
              else                         argString += arg.v;
              break;
            case 'str': {
              const quote = arg.quote || (arg.v.indexOf('"') === -1 ? '"' : "'");
              // Firefox's native XPath implementation is 3.0, but Chrome's is 1.0.
              // XPath 1.0 has no support for escaping quotes in strings, so:
              if(arg.v.indexOf(quote) !== -1) throw new Error('Quote character found in String Literal: ' + JSON.stringify(arg.v));
              argString += quote + arg.v + quote;
            }
            // there aren't any other native types TODO do we need a hook for allowing date conversion?
          }
        }
        return toInternalResult(wrapped.evaluate(argString + ')', cN, nR, XPathResult.ANY_TYPE, null));
      },
      evalOp = function(lhs, op, rhs) {
        if(op > AND && (lhs === D || rhs === D)) {
          return D;
        }
        if(extendedProcessors.handleInfix) {
          let res = extendedProcessors.handleInfix(err, lhs, op, rhs);
          if(res && res.t === 'continue') {
            lhs = res.lhs; op = res.op; rhs = res.rhs; res = null;
          }

          if(typeof res !== 'undefined' && res !== null) return res;
        }
        return handleOperation(lhs, op, rhs);
      },
      evalOps = function(lastOp) {
        const { tokens } = peek();

        if(tokens.length < 2) return;

        if(tokens[2] === D && tokens[1].v >= lastOp) {
          const endExpr = tokens.indexOf(',', 2);
          tokens.splice(0, endExpr === -1 ? tokens.length : endExpr, { t:'bool', v:asBoolean(tokens[0]) });
        }

        for(let j=UNION; j>=lastOp; j-=0b100) {
          let i = 1;
          while(i < tokens.length-1) {
            if(tokens[i].t === 'op' && tokens[i].v >= j) {
              const res = evalOp(tokens[i-1], tokens[i].v, tokens[i+1]);
              tokens.splice(i, 2);
              tokens[i-1] = { t:typefor(res), v:res };
            } else ++i;
          }
        }
      },
      handleXpathExpr = function() {
        if(peek().dead) {
          newCurrent();
          return;
        }
        let expr = cur.v;
        const { tokens } = peek();
        if(tokens.length && tokens[tokens.length-1].t === 'arr') {
          // chop the leading slash from expr
          if(expr.charAt(0) !== '/') err(`not sure how to handle expression called on nodeset that doesn't start with a '/': ${expr}`);
          // prefix a '.' to make the expression relative to the context node:
          expr = wrapped.createExpression('.' + expr, nR);
          const newNodeset = [];
          tokens[tokens.length-1].v.map(node => {
            const res = toInternalResult(expr.evaluate(node));
            newNodeset.push(...res.v);
          });
          tokens[tokens.length-1].v = newNodeset;
        } else {
          peek().tokens.push(toInternalResult(wrapped.evaluate(expr, cN, nR, XPathResult.ANY_TYPE, null)));
        }

        newCurrent();
      },
      nextChar = function() {
        return input.charAt(i+1);
      },
      finaliseNum = function() {
        cur.v = parseFloat(cur.str);
        peek().tokens.push(cur);
        newCurrent();
      },
      prevToken = function() {
        const peeked = peek().tokens;
        return peeked[peeked.length - 1];
      },
      isDeadFnArg = () => {
        const peeked = peek();
        if(peeked.t === 'fn') {
          const { tokens } = peeked;
          for(let i=tokens.length-1; i>=0 && tokens[i] !== ','; --i) {
            if(tokens[i] === D) {
              return true;
            }
          }
        }
      },
      isNum = function(c) {
        return c >= '0' && c <= '9';
      };

    newCurrent();

    for(i=0; i<input.length; ++i) {
      const c = input.charAt(i);
      if(cur.t === 'sq') {
        // Build the entire expression found within the square brackets:
        //
        // > A predicate filters a node-set with respect to an axis to produce a
        // > new node-set. For each node in the node-set to be filtered, the
        // > PredicateExpr is evaluated with that node as the context node, with
        // > the number of nodes in the node-set as the context size, and with
        // > the proximity position of the node in the node-set with respect to
        // > the axis as the context position; if PredicateExpr evaluates to
        // > true for that node, the node is included in the new node-set;
        // > otherwise, it is not included.
        //   - https://www.w3.org/TR/1999/REC-xpath-19991116/#predicates
        //
        // Note because the ']' character is allowed within a Literal (string),
        // there is special handling for tracking when we're within a string.
        if(cur.inString) {
          if(cur.inString === c) delete cur.inString;
        } else if(c === '[') {
          ++cur.depth;
        } else if(c === '\'' || c === '"') {
          cur.inString = c;
        } else if(c === ']') {
          if(--cur.depth) {
            cur.v += c;
          } else {
            const head = peek();
            const { tokens } = head;
            if(head.dead || tokens[2] === D) {
              newCurrent();
              continue;
            }
            let contextNodes;
            if(tokens.length && tokens[tokens.length-1].t === 'arr') {
              contextNodes = tokens[tokens.length-1].v;
            } else throw new Error('Not sure how to handle context node for predicate in this situation.');

            // > A PredicateExpr is evaluated by evaluating the Expr and converting
            // > the result to a boolean. If the result is a number, the result will
            // > be converted to true if the number is equal to the context position
            // > and will be converted to false otherwise; if the result is not a
            // > number, then the result will be converted as if by a call to the
            // > boolean function. Thus a location path para[3] is equivalent to
            // > para[position()=3].
            //   - https://www.w3.org/TR/1999/REC-xpath-19991116/#predicates
            const expr = cur.v;
            const filteredNodes = contextNodes
              .filter((cN, i) => {
                const res = toInternalResult(evaluate(expr, cN, nR, XPathResult.ANY_TYPE, null, contextNodes.length, i+1));
                return res.t === 'num' ? asNumber(res) === 1+i : asBoolean(res);
              });

            tokens[tokens.length-1].v = filteredNodes;
            newCurrent();
          }
          continue;
        }
        cur.v += c;
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
        if(isNum(c) || c === 'e' ||
            (c === '-' && input[i-1] === 'e')) {
          cur.str += c;
          continue;
        } else if(c === ' ' && cur.str === '-') {
          continue;
        } else if(c === '.' && !cur.decimal) {
          cur.decimal = 1;
          cur.str += c;
        } else finaliseNum();
      }
      if(isNum(c)) {
        if(cur.v === '') {
          cur = { t:'num', str:c };
        } else cur.v += c;
      } else switch(c) {
        case "'":
        case '"':
          if(cur.v === '') {
            cur = { t:'str', quote:c, v:'' };
          } else err('Not sure how to handle: ' + c);
          break;
        case '(':
          cur.dead = peek().dead;
          cur.t = 'fn';
          cur.tokens = [];
          stack.push(cur);
          newCurrent();
          break;
        case ')':
          if(cur.v !== '') handleXpathExpr();
          evalOps(OR);
          cur = stack.pop();

          if(cur.t !== 'fn') err('")" outside function!');
          if(peek().dead) {
            peek().tokens.push(D);
          } else if(isDeadFnArg()) {
            /* do nothing */
          } else if(cur.v) {
            peek().tokens.push(callFn(cur.v, cur.tokens));
          } else {
            if(cur.tokens.length !== 1) err('Expected one token, but found: ' + cur.tokens.length);
            peek().tokens.push(cur.tokens[0]);
          }
          newCurrent();
          break;
        case ',':
          if(peek().t !== 'fn') err('Unexpected comma outside function arguments.');
          if(cur.v) handleXpathExpr();
          peek().tokens.push(',');
          break;
        case '*': {
          // check if part of an XPath expression
          const prev = prevToken();
          if(!prev || prev === ',' || prev.t === 'op' || cur.v) {
            cur.v += c;
            break;
          }
          pushOp(MULT);
        } break;
        case '-': {
          const prev = prevToken();
          if(cur.v !== '' && nextChar() !== ' ' && input.charAt(i-1) !== ' ') {
            // function name expr
            cur.v += c;
          } else if(cur.v === '' && (
              !prev ||
              // match case: ...+-1
              prev.t === 'op' ||
              // previous was a separate function arg
              prev === ',')) {
            // -ve number
            cur = { t:'num', str:'-' };
          } else {
            // TODO do we need to check for cur.v here?
            pushOp(MINUS);
          }
        } break;
        case '=':
          switch(cur.v) {
            case '<': pushOp(LTE); break;
            case '>': pushOp(GTE); break;
            case '!': pushOp(NE);  break;
            default:
              if(cur.v) handleXpathExpr();
              pushOp(EQ);
          }
          break;
        case '>':
        case '<':
          if(cur.v) handleXpathExpr();
          if(nextChar() === '=') {
            cur.v = c;
          } else {
            pushOp(c === '>' ? GT : LT);
          }
          break;
        case '+':
          if(cur.v) handleXpathExpr();
          pushOp(PLUS);
          break;
        case '|':
          if(cur.v) handleXpathExpr();
          pushOp(UNION);
          break;
        case '\n':
        case '\r':
        case '\t':
        case ' ':
          // whitespace, as defined at https://www.w3.org/TR/REC-xml/#NT-S
          if(cur.v === '') break; // trim leading whitespace
          if(!FUNCTION_NAME.test(cur.v)) handleXpathExpr();
          break;
        case 'v':
          // Mad as it seems, according to https://www.w3.org/TR/1999/REC-xpath-19991116/#exprlex,
          // there is no requirement for ExprWhitespace before or after any
          // ExprToken, including OperatorName.
          if(cur.v === 'di') { // OperatorName: 'div'
            pushOp(DIV);
          } else cur.v += c;
          break;
        case 'r':
          // Mad as it seems, according to https://www.w3.org/TR/1999/REC-xpath-19991116/#exprlex,
          // there is no requirement for ExprWhitespace before or after any
          // ExprToken, including OperatorName.
          if(cur.v === 'o') { // OperatorName: 'or'
            pushOp(OR);
          } else cur.v += c;
          break;
        case 'd':
          // Mad as it seems, according to https://www.w3.org/TR/1999/REC-xpath-19991116/#exprlex,
          // there is no requirement for ExprWhitespace before or after any
          // ExprToken, including OperatorName.
          if(cur.v === 'an') { // OperatorName: 'and'
            pushOp(AND);
          } else if(cur.v === 'mo') { // OperatorName: 'mod'
            pushOp(MOD);
          } else cur.v += c;
          break;
        case '[':
          // evaluate previous part if there is any
          if(cur.v) {
            handleXpathExpr();
            newCurrent();
          }
          cur.t = 'sq';
          cur.depth = 1;
          break;
        case '.':
          if(cur.v === '' && isNum(nextChar())) {
            cur = { t:'num', str:c };
            break;
          }
          /* falls through */
        default:
          cur.v += c;
      }
    }

    if(cur.t === 'num') finaliseNum();
    if(cur.v) handleXpathExpr();
    if(stack.length !== 1) err('Stuff left on stack.');
    if(stack[0].t !== 'root') err('Weird stuff on stack.');
    if(stack[0].tokens.length === 0) err('No tokens.');
    evalOps(OR);
    if(stack[0].tokens.length !== 1) err('Too many tokens.');

    return toExternalResult(stack[0].tokens[0], rT);
  };
};

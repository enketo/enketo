const { asNumber, asString } = require('./xpath-cast');
const xpr = require('../xpr');

module.exports = { preprocessNativeArgs };

const cast = { num:asNumber, str:asString };

const fns = {
  'ceiling':          { min:1, max:1, cast:['num'] },
  'contains':         { min:2, max:2, cast:['str', 'str'] },
  'floor':            { min:1, max:1, cast:['num'] },
  'id':               { min:1, max:1, conv:r => [ xpr.string(r.t === 'arr' ? r.v.map(asString).join(' ') : asString(r)) ] },
  'lang':             { min:1, max:1, cast:['str'] },
  'starts-with':      { min:2, max:2, cast:['str', 'str'] },
  'substring':        { min:2, max:3, conv:convertSubstringArgs },
  'substring-after':  { min:2, max:2, cast:['str', 'str'] },
  'substring-before': { min:2, max:2, cast:['str', 'str'] },
  'translate':        { min:3, max:3, cast:['str', 'str', 'str'] },
};

function preprocessNativeArgs(name, args) {
  const def = fns[name];
  if(!def) return args;
  if(args.length < def.min) throw new Error('too few args');
  if(args.length > def.max) throw new Error('too many args');
  if(def.conv) {
    return def.conv(...args);
  } else if(def.cast) {
    return args
      .map((v, i) => {
        const t = def.cast[i];
        return { t, v:cast[t](v) };
      });
  }
  return args;
}

function convertSubstringArgs(str, start, len) {
  // special cases explicitly defined in the spec
  //
  // - substring("12345",      1.5,     2.6) returns "234"
  // - substring("12345",        0,       3) returns "12"
  // - substring("12345",  0 div 0,       3) returns ""
  // - substring("12345",        1, 0 div 0) returns ""
  // - substring("12345",      -42, 1 div 0) returns "12345"
  // - substring("12345", -1 div 0, 1 div 0) returns ""
  //
  // see: https://www.w3.org/TR/1999/REC-xpath-19991116/#function-substring
  //
  // Try digesting this:
  //
  // > The returned substring contains those characters for which the position
  // > of the character is greater than or equal to the rounded value of the
  // > second argument and, if the third argument is specified, less than the
  // > sum of the rounded value of the second argument and the rounded value
  // > of the third argument.
  //
  // The apparent contradictory nature of the final two examples hinges on
  // IEEE 754-1985 section 7.1 "Invalid Operation" which states:
  //
  // > The invalid operation exception is signaled if an operand is invalid
  // > for the operation on to be performed.  The result, when the exception
  // > occurs without a trap, shall be a quiet NaN...
  // > ...
  // > 2) Addition or subtraction—magnitude subtraction of infinites such as, (+∞) + (−∞)
  //
  // Firefox and Chrome XPath implementations agree that
  // (Infinity + -Infinity) evaluates to NaN.
  //
  // And here's an extra special example not defined in the spec:
  //
  // - substring("12345", -1 div 0)
  //
  // IEEE 754-1985 section 6.1 "Infinity Arithmetic" states:
  //
  // > Infinites shall be interpreted in the affine sense, that is,
  // > −∞ < (every finite number) < +∞
  //
  // By my reading, this means substring("12345", -1 div 0) should return
  // "12345".  Firefox and Chrome XPath implementations disagree with this,
  // but here we have special handling for it:

  str = xpr.string(asString(str));
  start = asNumber(start);
  if(len === undefined) {
    return [ str, xpr.number(Math.max(0, start)) ];
  }

  return [ str, xpr.number(start), xpr.number(asNumber(len)) ];
}

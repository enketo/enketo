var { asBoolean, asNumber, asString } = require('./xpath-cast');

module.exports = {
  handleOperation:handleOperation,
};

// Operator constants copied from extended-xpath.js
const OR    = 0b00000;
const AND   = 0b00100;
const EQ    = 0b01000;
const NE    = 0b01001;
const LT    = 0b01100;
const LTE   = 0b01101;
const GT    = 0b01110;
const GTE   = 0b01111;
const PLUS  = 0b10000;
const MINUS = 0b10001;
const MULT  = 0b10100;
const DIV   = 0b10101;
const MOD   = 0b10110;
const UNION = 0b11000;

function handleOperation(lhs, op, rhs) {
  // comparison operators as per: https://www.w3.org/TR/1999/REC-xpath-19991116/#booleans
  switch(op) {
    case OR:    return asBoolean(lhs) || asBoolean(rhs);
    case AND:   return asBoolean(lhs) && asBoolean(rhs);
    case EQ:    return equalityCompare(lhs, rhs, (a, b) => a === b);
    case NE:    return equalityCompare(lhs, rhs, (a, b) => a !== b);
    case LT:    return relationalCompare(lhs, rhs, (a, b) => a <  b);
    case LTE:   return relationalCompare(lhs, rhs, (a, b) => a <= b);
    case GT:    return relationalCompare(lhs, rhs, (a, b) => a >  b);
    case GTE:   return relationalCompare(lhs, rhs, (a, b) => a >= b);

    case PLUS:  return asNumber(lhs) + asNumber(rhs);
    case MINUS: return asNumber(lhs) - asNumber(rhs);
    case MULT:  return asNumber(lhs) * asNumber(rhs);
    case DIV:   return asNumber(lhs) / asNumber(rhs);
    case MOD:   return asNumber(lhs) % asNumber(rhs);

    case UNION: return [...lhs.v, ...rhs.v];
    default: throw new Error(`No handling for op ${op}`);
  }
}

function bothOf(lhs, rhs, t) {
  return lhs.t === t && rhs.t === t;
}

function oneOf(lhs, rhs, t) {
  return lhs.t === t || rhs.t === t;
}

function castFor(r) {
  switch(r.t) {
    case 'num': return asNumber;
    case 'str': return asString;
    default: throw new Error(`No cast for type: ${r.t}`);
  }
}


function relationalCompare(lhs, rhs, compareFn) {
  var i, j;
  if(bothOf(lhs, rhs, 'arr' )) {
    for(i=lhs.v.length-1; i>=0; --i) {
      for(j=rhs.v.length-1; j>=0; --j) {
        if(compareFn(asNumber(lhs.v[i]), asNumber(rhs.v[j]))) return true;
      }
    }
    return false;
  }
  if(lhs.t === 'arr') {
    rhs = asNumber(rhs);
    return lhs.v.map(asNumber).some(v => compareFn(v, rhs));
  }
  if(rhs.t === 'arr') {
    lhs = asNumber(lhs);
    return rhs.v.map(asNumber).some(v => compareFn(lhs, v));
  }
  return compareFn(asNumber(lhs), asNumber(rhs));
}

function equalityCompare(lhs, rhs, compareFn) {
  var i, j;
  if(bothOf(lhs, rhs, 'arr' )) {
    for(i=lhs.v.length-1; i>=0; --i) {
      for(j=rhs.v.length-1; j>=0; --j) {
        if(compareFn(lhs.v[i].textContent, rhs.v[j].textContent)) return true;
      }
    }
    return false;
  }
  if(oneOf(lhs, rhs, 'bool')) return compareFn(asBoolean(lhs), asBoolean(rhs));
  if(lhs.t === 'arr') {
    const cast = castFor(rhs);
    rhs = cast(rhs);
    return lhs.v.map(cast).some(v => compareFn(v, rhs));
  }
  if(rhs.t === 'arr') {
    const cast = castFor(lhs);
    lhs = cast(lhs);
    return rhs.v.map(cast).some(v => compareFn(v, lhs));
  }
  if(oneOf(lhs, rhs, 'num')) return compareFn(asNumber(lhs), asNumber(rhs));
  if(oneOf(lhs, rhs, 'str')) return compareFn(asString(lhs), asString(rhs));
  throw new Error('not handled yet for these types: ' + compareFn.toString());
}

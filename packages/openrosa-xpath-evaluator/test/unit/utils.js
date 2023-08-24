const { assert } = require('chai');

// Operator constants copied from extended-xpath.js
const opVals = {
  OR   : 0b00000,
  AND  : 0b00100,
  EQ   : 0b01000,
  NE   : 0b01001,
  LT   : 0b01100,
  LTE  : 0b01101,
  GT   : 0b01110,
  GTE  : 0b01111,
  PLUS : 0b10000,
  MINUS: 0b10001,
  MULT : 0b10100,
  DIV  : 0b10101,
  MOD  : 0b10110,
  UNION: 0b11000,
};

module.exports = {
  assertVal,
  encodeOp,
  opVals,
  wrapVal,
};

function assertVal({ v:actual }, expected) {
  if(isNaN(expected)) {
    assert.isNaN(actual);
  } else {
    assert.equal(actual, expected);
  }
}

function encodeOp(op) {
  switch(op) {
    case '|':     return opVals.OR;
    case '&':     return opVals.AND;
    case '=':     return opVals.EQ;
    case '!=':    return opVals.NE;
    case '<':     return opVals.LT;
    case '<=':    return opVals.LTE;
    case '>':     return opVals.GT;
    case '>=':    return opVals.GTE;
    case '+':     return opVals.PLUS;
    case '-':     return opVals.MINUS;
    case '*':     return opVals.MULT;
    case '/':     return opVals.DIV;
    case '%':     return opVals.MOD;
    case 'union': return opVals.UNION;
  }
}

function wrapVal(v) {
  switch(typeof v) {
    case 'boolean': return { t:'bool', v };
    case 'number':  return { t:'num',  v };
    case 'string':  return { t:'str',  v };
    case 'object':
      if(Array.isArray(v)) {
        return { t:'arr', v:v.map(text => new Node(text)) };
      }
      if(v instanceof Date) {
        return { t:'date', v };
      }
      /* falls through */
    default: throw new Error(`No handling for type: ${typeof v}`);
  }
}

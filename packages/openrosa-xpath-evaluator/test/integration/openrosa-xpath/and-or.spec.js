const { initDoc, assert, assertBoolean, assertTrue, assertFalse} = require('../helpers');

describe('and/or operators', () => {

  it('and works without spacing', () => {
    assertTrue("1and1");
  });

  it('and works without spacing AFTER and', () => {
    assertTrue("1 and1");
  });

  it('and works with linebreak/tab spacing', () => {
    assertTrue("1 and\r\n\t1");
  });

  it('and works without spacing BEFORE and', () => {
    assertTrue("1and 1");
  });

  it('and works with numbers-as-string', () => {
    assertTrue("'1'and'1'");
  });

  it('And (capitalized) fails miserably', () => {
    const doc = initDoc('');
    assert.throw(() => doc.xEval("1 And 1", null, XPathResult.BOOLEAN_TYPE));//does not throw instance of error
  });

  describe('and without potential spacing issues works', () => {
    [
      [ 'true() and true()', true, ],
      [ 'false() and true()', false, ],
      [ 'true() and false()', false, ],
      [ 'false() and false()', false, ],
      [ '1 and 1', true, ],
      [ '0 and 1', false, ],
      [ '-1 and 0', false, ],
      [ '0 and 0', false, ],
      [ '1 and -1', true, ],
      [ '1 and (1 div 0)', true, ],
      [ '(-1 div 0) and 1', true, ],
      [ 'number("") and 1', false, ],
      [ 'number("") and 0', false, ],
      [ '1 and 1 and 0', false, ],
      [ '1 and 1 and true()', true, ],
      [ 'false() and 1 and true()', false, ],
    ].forEach(([ expr, expected ]) => {
      it(`should evaluate '${expr}' as ${expected}`, () => assertBoolean(expr, expected));
    });
  });

  describe('and laziness', () => {
    [
      'false() and substring()',
      'false() and substring() and true()',
      'true() and false() and substring()',
    ].forEach(expr => {
      it(`should evaluate '${expr}' as FALSE`, () => assertFalse(expr));
    });
  });

  it('or works without spacing', () => {
    assertTrue("1or1");
  });

  it('or works without spacing AFTER or', () => {
    assertTrue("1 or1");
  });

  it('or works with newline/tab spacing', () => {
    assertTrue("1 or\r\n\t1");
  });

  it('or works without spacing BEFORE or', () => {
    assertTrue("1or 1");
  });

  it('or works with numbers-as-string', () => {
    assertTrue("'1'or'1'");
  });

  it('And (capitalized) fails miserably', () => {
    const doc = initDoc('');
    assert.throw(() => doc.xEval("1 OR 1", null, XPathResult.BOOLEAN_TYPE)); // does not throw instance of error
  });

  describe('or without potential spacing issues works', () => {
    [
      [ "true() or true()", true ],
      [ "false() or true()", true ],
      [ "true() or false()", true ],
      [ "false() or false()", false ],
      [ "1 or 1", true ],
      [ "0 or 1", true ],
      [ "0 or -1", true ],
      [ "0 or 0", false ],
      [ "1 or -1", true ],
      [ "1 or (1 div 0)", true ],
      [ "(-1 div 0) or 1", true ],
      [ "number('') or 1", true ],
      [ "number('') or 0", false ],
      [ "1 or 1 or 0", true ],
      [ "1 or 1 or true()", true ],
      [ "false() or 0 or 0", false ]
    ].forEach(([expr, expected]) => {
      it(`should evaluate '${expr}' as ${expected}`, () => assertBoolean(expr, expected));
    });
  });

  describe('or laziness', () => {
    [
      [ "true() or substring()", true ],
      [ "true() or substring() and true()", true ],
      [ "false() or true() or substring()", true ]
    ].forEach(([expr, expected]) => {
      it(`should evaluate '${expr}' as ${expected}`, () => assertBoolean(expr, expected));
    });
  });

  describe('or/and precedence rules are applied correctly', () => {
    [
      [ 'false() or  false() or  false()', false ],
      [ 'false() or  false() and false()', false ],
      [ 'false() and false() or  false()', false ],
      [ 'false() and false() and false()', false ],
      [ 'false() or  false() or   true()', true  ],
      [ 'false() or  false() and  true()', false ],
      [ 'false() and false() or   true()', true  ],
      [ 'false() and false() and  true()', false ],
      [ 'false() or   true() or  false()', true  ],
      [ 'false() or   true() and false()', false ],
      [ 'false() and  true() or  false()', false ],
      [ 'false() and  true() and false()', false ],
      [ 'false() or   true() or   true()', true  ],
      [ 'false() or   true() and  true()', true  ],
      [ 'false() and  true() or   true()', true  ],
      [ 'false() and  true() and  true()', false ],
      [ ' true() or  false() or  false()', true  ],
      [ ' true() or  false() and false()', true  ],
      [ ' true() and false() or  false()', false ],
      [ ' true() and false() and false()', false ],
      [ ' true() or  false() or   true()', true  ],
      [ ' true() or  false() and  true()', true  ],
      [ ' true() and false() or   true()', true  ],
      [ ' true() and false() and  true()', false ],
      [ ' true() or   true() or  false()', true  ],
      [ ' true() or   true() and false()', true  ],
      [ ' true() and  true() or  false()', true  ],
      [ ' true() and  true() and false()', false ],
      [ ' true() or   true() or   true()', true  ],
      [ ' true() or   true() and  true()', true  ],
      [ ' true() and  true() or   true()', true  ],
      [ ' true() and  true() and  true()', true  ],
      [ 'false() or (false() and false())', false ],
      [ '(false() and false()) or false()', false ],
      [ 'false() or (false() and true())', false ],
      [ '(false() and false()) or true()', true ],
      [ 'false() or (true() and false())', false ],
      [ '(false() and true()) or false()', false ],
      [ 'false() or (true() and true())', true ],
      [ '(false() and true()) or true()', true ],
      [ ' true() or (false() and false())', true ],
      [ ' (true() and false()) or false()', false ],
      [ ' true() or (false() and true())', true ],
      [ ' (true() and false()) or true()', true ],
      [ ' true() or (true() and false())', true ],
      [ ' (true() and true()) or false()', true ],
      [ ' true() or (true() and true())', true ],
      [ ' (true() and true()) or true()', true ],
      [ "0 or 1 and 0", false ],
      [ "0 or 1 and 0+1", true ],
      [ "0 and explode() + 1", false ],
      [ "0 and 1 + explode()", false ],
      [ "0 and explode() + explode()", false ],
      [ "0 and explode(explode()) + explode(explode(explode(1, 2, 3, explode(), explode())))", false ],
      [ "0 and /explode + 1", false ],
      [ "0 and 1 + /explode", false ],
      [ "0 and /explode + /explode", false ],
      [ "0 and explode(/explode) + explode(explode(explode(1, 2, 3, explode(), /explode)))", false ],
      [ "0 and /explode[/explode]", false ],
      [ "0 and fn(/explode)", false ],
      [ "0 and 1 + explode(/explode)", false ],
    ].forEach(([expr, expected]) => {
      it(`should evaluate ${expr} as ${expected}`, () => {
        assertBoolean(expr, expected);
      });
    });

  });
});

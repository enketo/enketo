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

  it('and without potential spacing issues works', () => {
    assertTrue("true() and true()");
    assertFalse("false() and true()");
    assertFalse("true() and false()");
    assertFalse("false() and false()");
    assertTrue("1 and 1");
    assertFalse("0 and 1");
    assertFalse("-1 and 0");
    assertFalse("0 and 0");
    assertTrue("1 and -1");
    assertTrue("1 and (1 div 0)");
    assertTrue("(-1 div 0) and 1");
    assertFalse("number('') and 1");
    assertFalse("number('') and 0");
    assertFalse("1 and 1 and 0");
    assertTrue("1 and 1 and true()");
    assertFalse("false() and 1 and true()");
  });

  it('and laziness', () => {
    assertFalse("false() and substring()");
    assertFalse("false() and substring() and true()");
    assertFalse("true() and false() and substring()");
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

  it('or without potential spacing issues works', () => {
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
    ].forEach(([expr, value]) => {
      assertBoolean(expr, value);
    });
  });

  it('or laziness', () => {
    [
      [ "true() or substring()", true ],
      [ "true() or substring() and true()", true ],
      [ "false() or true() or substring()", true ]
    ].forEach(([expr, value]) => {
      assertBoolean(expr, value);
    });
  });

  describe('or/and precendence rules are applied correctly', () => {
    [
      [ "true() or true() and false()", true ],
      [ "true() and false() or true()", true ],
      [ "false() and false() or false()", false ],
      [ "0 or 1 and 0", false ],
      [ "0 or 1 and 0+1", true ]
    ].forEach(([expr, expected]) => {
      it(`should evaluate ${expr} as ${expected}`, () => {
        assertBoolean(expr, expected);
      });
    });
  });
});

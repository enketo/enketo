const { assertThrow, assertTrue, assertFalse } = require('../../helpers');

describe('not', () => {
  it('not()', () => {
    assertFalse('not(true())');
    assertTrue('not(false())');
    assertTrue('not(not(true()))');
    assertFalse('not(not(false()))');
    assertFalse('not(1)');
  });

  it('not() fails when too few arguments are provided', () => {
    assertThrow('not()');
  });

  it('not() fails when too many arguments are provided', () => {
    assertThrow('not(1, 2)');
  });
});

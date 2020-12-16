const { assertTrue, assertFalse, assertThrow } = require('../helpers');

describe('ends-with', () => {
  it('ends-with', () => {
    assertTrue('ends-with("", "")');
    assertTrue('ends-with("a", "")');
    assertTrue('ends-with("a", "a")');
    assertFalse('ends-with("a", "b")');
    assertTrue('ends-with("ba", "a")');
    assertFalse('ends-with("", "b")');
  });

  it('ends-with() fails when too many arguments are provided', () => {
    assertThrow('ends-with(1, 2, 3)');
  });

  it('ends-with() fails when not enough arguments are provided', () => {
    assertThrow('ends-with()');
    assertThrow('ends-with(1)');
  });
});

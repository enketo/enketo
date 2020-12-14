const {assertThrow, assertFalse} = require('../../helpers');

describe('#false()', () => {
  it('should evaluate to false', () => {
    assertFalse('false()');
  });

  it('false() fails when too many arguments are provided', () => {
    assertThrow('false("a")');
  });
});

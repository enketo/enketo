const { assertThrow, assertNumberValue } = require('../../helpers');

describe('#floor()', () => {
  it('should convert', () => {
    assertNumberValue('floor("3")', 3);
    assertNumberValue('floor(12.5)', 12);
    assertNumberValue('floor(-3.75)', -4);
    assertNumberValue('floor(-1.55)', -2);
    assertNumberValue('floor(2.44)', 2);
    assertNumberValue('floor(0.001)', 0);
    assertNumberValue('floor(1.5)', 1);
    assertNumberValue('floor(5)', 5);
    assertNumberValue('floor(1.00)', 1);
    assertNumberValue('floor(-1.005)', -2);
  });

  it('floor() fails when too many arguments are provided', () => {
    assertThrow('floor(1, 2)');
  });

  it('floor fails when too few arguments are provided', () => {
    assertThrow('floor()');
  });
});

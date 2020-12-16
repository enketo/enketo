const { assertThrow, assertNumberValue } = require('../helpers');

describe('ceiling', () => {
  it('ceiling()', () => {
    assertNumberValue("ceiling(-1.55)", -1);
    assertNumberValue("ceiling(2.44)", 3);
    assertNumberValue("ceiling(0.001)", 1);
    assertNumberValue("ceiling(1.5)", 2);
    assertNumberValue("ceiling(5)", 5);
    assertNumberValue("ceiling(1.00)", 1);
    assertNumberValue("ceiling(-1.05)", -1);
  });

  it('ceiling() fails when too many arguments are provided', () => {
    assertThrow("ceiling(1, 2)");
  });

  it('ceiling() fails when not enough arguments are provided', () => {
    assertThrow("ceiling()");
  });
});

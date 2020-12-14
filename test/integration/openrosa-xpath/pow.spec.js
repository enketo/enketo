const { assertNumberValue } = require('../../helpers');

describe('#pow()', () => {
  describe('should return power of text values', () => {
    it('3^0', () => {
      assertNumberValue('3', 'pow(/simple/xpath/to/node, 0)', 1);
    });
    it('1^3', () => {
      assertNumberValue('1', 'pow(/simple/xpath/to/node, 3)', 1);
    });
    it('4^2', () => {
      assertNumberValue('4', 'pow(/simple/xpath/to/node, 2)', 16);
    });
    it('no input pow', () => {
      assertNumberValue('pow(2, 2)', 4);
      assertNumberValue('pow(2, 0)', 1);
      assertNumberValue('pow(0, 4)', 0);
      assertNumberValue('pow(2.5, 2)', 6.25);
      assertNumberValue('pow(0.5, 2)', 0.25);
      assertNumberValue('pow(-1, 2)', 1);
      assertNumberValue('pow(-1, 3)', -1);
      assertNumberValue('pow(4, 0.5)', 2);
      assertNumberValue('pow(16, 0.25)', 2);
    });
  });
});

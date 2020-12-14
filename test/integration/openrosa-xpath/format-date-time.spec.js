const { assertStringValue } = require('../../helpers');

describe('#format-date-time()', () => {
  [
    ['format-date-time("2001-12-31", "%b %e, %Y")', 'Dec 31, 2001']
  ].forEach(([expr, expected]) => {
    it(expr + ' should evaluate to ' + expected, () => {
      assertStringValue(expr, expected);
    });
  });
});

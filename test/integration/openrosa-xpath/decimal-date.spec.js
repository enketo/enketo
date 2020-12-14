const {assertNumberValue } = require('../../helpers');

describe('#decimal-date()', () => {
  [
    ['decimal-date("1970-01-01")', 0],
    ['decimal-date("1970-01-02")', 1],
    ['decimal-date("1969-12-31")', -1]
  ].forEach( ([expr, expectedDaysSinceEpoch]) => {
    it('should convert ' + expr + ' into ' + expectedDaysSinceEpoch, () => {
      assertNumberValue(expr, expectedDaysSinceEpoch);
    });
  });
});

const { assertThrow, assertNumberValue } = require('../helpers');

describe('#decimal-date-time()', () => {
  describe('with full date + timestamp', () => {
    [
      ['decimal-date-time("1970-01-01T00:00:00Z")', 0],
      ['decimal-date-time("1970-01-02T00:00:00Z")', 1],
      ['decimal-date-time("1969-12-31T00:00:00Z")', -1],
    ].forEach(([expr, expectedDaysSinceEpoch]) => {
      it('should convert ' + expr + ' into ' + expectedDaysSinceEpoch, () => {
        assertNumberValue(expr, expectedDaysSinceEpoch);
      });
    });
  });

  describe('with date only', () => {
    [
      ['decimal-date-time("1970-01-01")', 0],
      ['decimal-date-time("1970-01-02")', 1],
      ['decimal-date-time("1969-12-31")', -1]
    ].forEach( ([expr, expectedDaysSinceEpoch]) => {
      it('should convert ' + expr + ' into ' + expectedDaysSinceEpoch, () => {
        assertNumberValue(expr, expectedDaysSinceEpoch);
      });
    });
  });

  it('with invalid args, throws an error', () => {
    assertThrow('decimal-date-time("1970-01-01T00:00:00.000Z", 2)');
  });

  it('different format', () => {
    // assertNumberRounded('decimal-date-time("2018-04-24T15:30:00.000+06:00")', 17645.396, 1000);
    assertNumberValue('decimal-date-time("2018-04-24T15:30:00.000+06:00")', 17645.395833333332);
  });
});

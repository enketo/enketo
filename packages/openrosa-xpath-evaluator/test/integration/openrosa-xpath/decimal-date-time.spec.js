const { assertThrow, assertNumberValue, assertNumberRounded } = require('../helpers');

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
      ['decimal-date-time("1970-01-01")', 0.291667],
      ['decimal-date-time("1970-01-02")', 1.291667],
      ['decimal-date-time("1969-12-31")', -0.708333],
      ['decimal-date-time("2021-10-06")', 18906.291667],
    ].forEach( ([expr, expectedDaysSinceEpoch]) => {
      it('should convert ' + expr + ' into ' + expectedDaysSinceEpoch, () => {
        assertNumberRounded(expr, expectedDaysSinceEpoch, 1000000);
      });
    });
  });

  describe('with no offset specified', () => {
    [
      ['decimal-date-time("1970-01-01T00:00:00")', 0.291667],
      ['decimal-date-time("1970-01-02T00:00:00.000")', 1.291667],
      ['decimal-date-time("1969-12-31T00:00:00")', -0.708333],
      ['decimal-date-time("2021-10-06T00:00:00.000")', 18906.291667],
    ].forEach( ([expr, expectedDaysSinceEpoch]) => {
      it('should convert ' + expr + ' into ' + expectedDaysSinceEpoch, () => {
        assertNumberRounded(expr, expectedDaysSinceEpoch, 1000000);
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

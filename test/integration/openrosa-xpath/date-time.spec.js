const { assertStringValue } = require('../helpers');

describe('#date-time()', () => {
  describe('valid date string', () => {
    it('should be left alone', () => {
      assertStringValue("date-time('1970-01-01')", '1970-01-01');
    });
  });

  describe('valid date-time string', () => {
    it('should be converted to date string', () => {
      assertStringValue("date-time('1970-01-01T21:50:49Z')", '1970-01-01');
    });
  });

  describe('positive number', () => {
    it('should be converted', () => {
      assertStringValue('date-time(0)', '1970-01-01');
      assertStringValue('date-time(1)', '1970-01-02');
    });
  });

  describe('invalid date-time', () => {
    it('should not parse, but instead should return a String', () => {
      assertStringValue("date-time('nonsense')", 'Invalid Date');
    });
  });
});

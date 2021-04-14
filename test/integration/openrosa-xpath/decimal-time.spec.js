const {assertThrow, assertNumberValue, initDoc} = require('../helpers');

describe('decimal-time()', () => {
  it('decimates times', () => {
    assertNumberValue('decimal-time("06:00:00.000-07:00")', 0.250);
    assertNumberValue('decimal-time("06:00:00.000-01:00")', 0.000);
    assertNumberValue('decimal-time("06:00:59.000-07:00")', 0.25068287037037035);
    assertNumberValue('decimal-time("23:59:00.000-07:00")', 0.9993055555555556);
    assertNumberValue('decimal-time("23:59:00.000-13:00")', 0.24930555555555556);
    assertNumberValue('decimal-time("a")', NaN);
    assertNumberValue('decimal-time("24:00:00.000-07:00")', NaN);
    assertNumberValue('decimal-time("06:00:00.000-24:00")', NaN);
    assertNumberValue('decimal-time("06:60:00.000-07:00")', NaN);
    assertNumberValue('decimal-time("06:00:60.000-07:00")', NaN);
    assertNumberValue('decimal-time("23:59:00.000-07:60")', NaN);
    assertNumberValue('decimal-time("now()")', NaN);
  });

  it('decimates times provided with a node parameter', () => {
    const doc = initDoc(`
      <data>
        <a>06:00:00.000-07:00</a>
      </data>`);
      assertNumberValue(doc, null, 'decimal-time( /data/a )', 0.250);
  });

  it('facilitates time calculations and evaluates', () => {
    assertNumberValue('decimal-time("12:00:00.000-07:00") - decimal-time("06:00:00.000-07:00")', 0.250);
  });

  it('with invalid args throws an error', () => {
    assertThrow('decimal-time("06:00:00.000-07:00", 2)');
  });
});

const { assertThrow, assertNumberValue } = require('../helpers');

describe('#round()', () => {
  describe('with a single argument', () => {
    it('with a single argument', () => {
      assertNumberValue('round(1)', 1);
      assertNumberValue('round(1.1)', 1);
      assertNumberValue('round(1.5)', 2);
      assertNumberValue('round(-1)', -1);
      assertNumberValue('round(-1.1)', -1);
      assertNumberValue('round(-1.5)', -2);
      assertNumberValue('round(-1.55)', -2);
      assertNumberValue('round(2.44)', 2);
      assertNumberValue('round(0.001)', 0);
      assertNumberValue('round(1.5)', 2);
      assertNumberValue('round(5)', 5);
      assertNumberValue('round(1.000)', 1);
      assertNumberValue('round(-1.05)', -1);
    });
  });

  describe('with two arguments', () => {
    it('with num_digits = 0', () => {
      assertNumberValue('round(1, 0)', 1);
      assertNumberValue('round(1.1, 0)', 1);
      assertNumberValue('round(1.5, 0)', 2);
      assertNumberValue('round(-1, 0)', -1);
      assertNumberValue('round(-1.1, 0)', -1);
      assertNumberValue('round(-1.5, 0)', -2);
    });

    describe('with num_digits > 0', () => {
      [
        [ '0', 1, '0' ],
        [ '1', 1, '1' ],
        [ '1', 2, '1' ],
        [ '23.7825', 2, '23.78' ],
        [ '23.7825', 1, '23.8' ],
        [ '2.15', 1, '2.2' ],
        [ '2.149', 1, '2.1' ],
        [ '-1.475', 2, '-1.48' ],
      ].forEach(([number, numDigits, expected]) => {

        var expr = 'round("{1}", "{2}")'
            .replace('{1}', number)
            .replace('{2}', numDigits);

        it('should evaluate ' + expr + ' to ' + expected, () => {
          assertNumberValue(expr, expected);
        });
      });
    });

    describe('with num_digits < 0', () => {
      [
        [ '0', -1, 0 ],
        [ '1', -1, 0 ],
        [ '1', -2, 0 ],
        [ '23.7825', -2, 0 ],
        [ '23.7825', -1, 20 ],
        [ '2.15', -1, 0 ],
        [ '2.149', -1, 0 ],
        [ '-1.475', -2, 0 ],
        [ '21.5', -1, 20 ],
        [ '626.3', -3, 1000 ],
        [ '1.98', -1, 0 ],
        [ '-50.55', -2, -100 ],
      ].forEach(([number, numDigits, expected]) => {
        var expr = 'round("{1}", "{2}")'
            .replace('{1}', number)
            .replace('{2}', numDigits);

        it('should evaluate ' + expr + ' to ' + expected, () => {
          assertNumberValue(expr, expected);
        });
      });
    });
  });

  it('round() fails when too few arguments are provided', () => {
      assertThrow('round()');
  });

  it('round()', () => {
    assertNumberValue('round(1.234)', 1);
    assertNumberValue('round(1.234, 2)', 1.23);
    assertNumberValue('round(1.234, 5)', 1.234);
    assertNumberValue('round(1.234, 0)', 1);
    assertNumberValue('round(33.33, -1)', 30);
    assertNumberValue('round(1 div 47999799999)', 0); //(2.08e-11)
    assertNumberValue('round("a")', NaN);
  });

  it('round() with too many args throws exception', () => {
    assertThrow('round(1, 2, 3)');
  });
});

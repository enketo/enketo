const { assert } = require('chai');
const { assertVal, encodeOp, opVals, wrapVal } = require('./utils');

const extensions = require('../../src/openrosa-extensions')({});

describe('openrosa-extensions', () => {
  it('should have expected functions', () => {
    assert.containsAllKeys(extensions.func, [
      'max', 'randomize',
    ]);
  });

  describe('process', () => {
    const { process } = extensions;

    describe('handleInfix', () => {
      const { handleInfix } = process;

      it('should be defined', () => assert.isFunction(handleInfix));

      [
        // addition
        [  1, '+', new Date(1970, 0,  1), { t:'continue', lhs:wrapVal(1), op:opVals.PLUS,  rhs:wrapVal(0.2916666666666667) } ], // correctness of decimals tbd later
        [  1, '+', '1970-1-1',            1.2916666666666667 ], // correctness of decimals tbd later
        [  1, '+', [ '1970-1-1' ],        1.2916666666666667 ], // correctness of decimals tbd later
        [ 10, '+', new Date(2012, 6, 24), { t:'continue', lhs:wrapVal(10), op:opVals.PLUS, rhs:wrapVal(15545.2916666666666667) } ], // correctness of decimals tbd later
        [ new Date(1970, 0, 1), '+', 1,   { t:'continue', lhs:wrapVal(0.2916666666666667), op:opVals.PLUS,  rhs:wrapVal(1) } ], // correctness of decimals tbd later
        [ '1970-1-1',           '+', 1,   1.2916666666666667 ], // correctness of decimals tbd later
        [ [ '1970-1-1' ],       '+', 1,   1.2916666666666667 ], // correctness of decimals tbd later

        // inequality
        [ true, '!=', new Date(), undefined ],

        // equality
        [ true, '=', new Date(), undefined ],
        [ '2018-06-25', '=', '2018-06-25T00:00:00.000-07:00', { t:'continue', lhs:wrapVal(17707.291666666668), op:opVals.EQ,  rhs:wrapVal(17707.291666666668) } ],

        // comparison
        [ '2018-06-25', '<', '2018-06-25T00:00:00.001-07:00', { t:'continue', lhs:wrapVal(17707.291666666668), op:opVals.LT, rhs:wrapVal(17707.29166667824) } ],
      ].forEach(([ lhs, op, rhs, expected ]) => {
        it(`should evaluate ${lhs} ${op} ${rhs} as ${expected}`, () => {
          // when
          const res = handleInfix(null, wrapVal(lhs), encodeOp(op), wrapVal(rhs));

          // then
          if(expected instanceof Date) {
            assert.equal(res.toISOString(), expected.toISOString());
          } else {
            assert.deepEqual(res, expected);
          }
        });
      });
    });
  });

  describe('func', () => {
    const { date, 'date-time':dateTime, min, max, number } = extensions.func;

    describe('date()', () => {
      [ 'asdf', 123, true ].forEach(arg => {
        it(`should convert a ${typeof arg} to a Date`, () => {
          // when
          const result = date(wrapVal(arg));

          // then
          assert.isTrue(result.v instanceof Date);
        });
      });

      [ true, false, 'some string' ].forEach(arg => {
        it(`should convert ${arg} to an Invalid date`, () => {
          // when
          const res = date(wrapVal(arg));

          // then
          assert.isTrue(isNaN(res.v));
          assert.equal(res.v.toString(), 'Invalid Date');
          assert.isNaN(res.v.valueOf());
        });
      });

      it('should convert zero to 1 Jan 1970 UTC', () => {
        // when
        const res = date(wrapVal(0));

        // then
        assert.equal(res.v.toISOString(), '1970-01-01T00:00:00.000Z');
      });
    });

    describe('date-time()', () => {
      [ 'asdf', 123, true ].forEach(arg => {
        it(`should convert a ${typeof arg} to a Date`, () => {
          // when
          const result = dateTime(wrapVal(arg));

          // then
          assert.isTrue(result.v instanceof Date);
        });
      });

      [ true, false, 'some string' ].forEach(arg => {
        it(`should convert ${arg} to an Invalid date`, () => {
          // when
          const res = dateTime(wrapVal(arg));

          // then
          assert.isTrue(isNaN(res.v));
          assert.equal(res.v.toString(), 'Invalid Date');
          assert.isNaN(res.v.valueOf());
        });
      });

      it('should convert zero to 1 Jan 1970 UTC', () => {
        // when
        const res = dateTime(wrapVal(0));

        // then
        assert.equal(res.v.toISOString(), '1970-01-01T00:00:00.000Z');
      });
    });

    describe('min()', () => {
      [
        [   1, [ 1, 2, 3 ] ],
        [ NaN, [ 1, 2, NaN ] ],
        [ NaN, [] ],
        [   1, [], 1, 4 ],
        [   1, [], [ 1, 4 ] ],
      ].forEach(([ expected, ...args ]) => {
        it(`should convert ${JSON.stringify(args)} to ${expected}`, () => {
          // when
          const actual = min(...args.map(wrapVal));

          // then
          assertVal(actual, expected);
        });
      });
    });

    describe('max()', () => {
      [
        [   3, [ 1, 2, 3 ] ],
        [ NaN, [ 1, 2, 3, NaN ] ],
        [ NaN, [], NaN ],
        [   4, [], 1, 4 ],
        [   4, [], [ 1, 4 ] ],
      ].forEach(([ expected, ...args ]) => {
        it(`should convert ${JSON.stringify(args)} to ${expected}`, () => {
          // when
          const actual = max(...args.map(wrapVal));

          // then
          assertVal(actual, expected);
        });
      });
    });

    describe('number()', () => {
      [
        [      0.2916666666666667, '1970-01-01' ],
        [      0.2916666666666667, new Date(1970, 1-1, 1) ],
        [  15555.291666666666,     new Date(2012, 7, 3) ],
        [      1.2916666666666667, '1970-01-02' ],
        [     -0.7083333333333334, '1969-12-31' ],
        [  14127.291666666666,     '2008-09-05' ],
        [ -10251.708333333334,     '1941-12-07' ],
        [  15544.291666666666,     '2012-07-23' ],
        [  15572,                  '2012-08-20T00:00:00.00+00:00' ],
      ].forEach(([ expected, ...args ]) => {
        it(`should convert ${JSON.stringify(args)} to ${expected}`, () => {
          // when
          const actual = number(...args.map(wrapVal));

          // then
          assertVal(actual, expected);
        });
      });
    });
  });
});

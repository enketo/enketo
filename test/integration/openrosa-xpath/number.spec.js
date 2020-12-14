const { assert, assertThrow, assertNumberValue,
  assertNumberRounded, initDoc } = require('../../helpers');

describe('#number()', () => {
  const doc = initDoc('');

  describe('called on a boolean', () => {
    _.forEach({
      'number(true())': '1',
      'number(false())': '0',
      'number(1 = 1)': '1',
      'number(1 = 2)': '0',
    }, (expectedResult, expr) => {
      it(`${expr} should be ${expectedResult}`, () => {
        assertNumberValue(expr, expectedResult);
      });
    });
  });

  describe('called on a number', () => {
    _.forEach({
      'number("0")': '0',
      'number("1")': '1',
      'number("-1")': '-1',
      'number(-1.0)': -1,
      'number(1)': 1,
      'number(0.199999)': 0.199999,
      'number(-0.199999)': -0.199999,
      'number(- 0.199999)': -0.199999,
      'number(0.0)': 0,
      'number(.0)': 0,
      'number(0.)': 0
    }, (expectedResult, expr) => {
      it(`${expr} should be ${expectedResult}`, () => {
        assertNumberValue(expr, expectedResult);
      });
    });
  });
  describe('called on a string', () => {
    _.forEach({
      'number("-1.0")': -1,
      'number("1")': 1,
      'number("0.199999")': 0.199999,
      'number("-0.9991")': -0.9991,
      'number("0.0")': 0,
      'number(".0")': 0,
      'number(".112")': 0.112,
      'number("0.")': 0,
      'number("  1.1")': 1.1,
      'number("1.1   ")': 1.1 ,
      'number("1.1   \n ")': 1.1,
      'number("  1.1 \n\r\n  ")': 1.1
    }, (expectedResult, expr) => {
      it(`${expr} should be ${expectedResult}`, () => {
        assertNumberValue(expr, expectedResult);
      });
    });
  });

  describe('called on a date string', () => {
    _.forEach({
      'number("1970-01-01")': 0.29,
      'number("1970-01-02")': 1.29,
      'number("1969-12-31")': -0.71,
      'number("2008-09-05")': 14127.29,
      'number("1941-12-07")': -10251.71,
    }, (expected, expr) => {
      it(expr + ' should be ' + expected + ' days since the epoch', () => {
        assertNumberRounded(expr, expected, 100);
      });
    });
  });

  describe('number() conversions returns NaN if not convertible', () => {
    it('number() conversions returns NaN if not convertible', () => {
      [
        [ 'number("asdf")', NaN ],
        [ 'number("1asdf")', NaN ],
        [ 'number("1.1sd")', NaN ],
        [ 'number(".1sd")', NaN ],
        [ 'number(" . ")', NaN ]
      ].forEach(t => {
        const result = doc.xEval(t[0]);
        assert.typeOf(result.numberValue, 'number');
        assert.isNaN(result.numberValue);
      });
    });

    it('number() conversion of nodesets', () => {
      const doc = initDoc(`
        <div id="FunctionNumberCase">
          <div id="FunctionNumberCaseNumber">123</div>
          <div id="FunctionNumberCaseNotNumber">  a a  </div>
          <div id="FunctionNumberCaseNumberMultiple">
            <div>-10</div>
            <div>11</div>
            <div>99</div>
          </div>
          <div id="FunctionNumberCaseNotNumberMultiple">
            <div>-10</div>
            <div>11</div>
            <div>a</div>
          </div>
        </div>`);

      let node = doc.getElementById('FunctionNumberCaseNumber');
      assertNumberValue(node, null, 'number(self::node())', 123);
      assertNumberValue(node, null, 'number()', 123);

      node = doc.getElementById('FunctionNumberCaseNumberMultiple');
      assertNumberValue(node, null, 'number(*)', -10);

      node = doc.getElementById('FunctionNumberCaseNotNumber');
      assertNumberValue(node, null, 'number()', NaN);
    });

    it('number() conversion fails when too many arguments are provided', () => {
      assertThrow('number(1, 2)');
    });
  });
});

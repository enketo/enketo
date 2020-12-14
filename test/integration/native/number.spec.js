const { initDoc, assertThrow, assertNumber } = require('../../helpers');

describe('native number functions', () => {
  it('number() conversion of convertible numbers, strings, booleans', () => {
    // of numbers
    assertNumber('number(-1.0)', -1);
    assertNumber('number(1)', 1);
    assertNumber('number(0.199999)', 0.199999);
    assertNumber('number(-0.199999)', -0.199999);
    assertNumber('number(- 0.199999)', -0.199999),
    assertNumber('number(0.0)', 0);
    assertNumber('number(.0)', 0);
    assertNumber('number(0.)', 0);

    // of booleans
    assertNumber('number(true())', 1);
    assertNumber('number(false())', 0);

    // of strings
    assertNumber('number("-1.0")', -1);
    assertNumber('number("1")', 1);
    assertNumber('number("0.199999")', 0.199999);
    assertNumber('number("-0.9991")', -0.9991);
    assertNumber('number("0.0")', 0);
    assertNumber('number(".0")', 0);
    assertNumber('number(".112")', 0.112);
    assertNumber('number("0.")', 0);
    assertNumber('number("  1.1")', 1.1);
    assertNumber('number("1.1   ")', 1.1);
    assertNumber('number("1.1   \n ")', 1.1);
    assertNumber('number("  1.1 \n\r\n  ")', 1.1);
  });

  it('number() conversions returns NaN if not convertible', () => {
    assertNumber('number("asdf")', NaN);
    assertNumber('number("1asdf")', NaN);
    assertNumber('number("1.1sd")', NaN);
    assertNumber('number(".1sd")', NaN);
    assertNumber('number(" . ")', NaN);
  });

  describe('conversion of nodesets', () => {
    let doc;

    beforeEach(() => {
      doc = initDoc(`
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
          <div id="FunctionSumCaseJavarosa">
            <div>-10</div>
            <div>15</div>
            <div></div>
          </div>
        </div>`);
    });

    it('number() ', () => {
      let node = doc.getElementById('FunctionNumberCaseNumber');
      assertNumber(node, null, 'number(self::node())', 123);
      assertNumber(node, null, 'number()', 123);
      node = doc.getElementById('FunctionNumberCaseNumberMultiple');
      assertNumber(node, null, 'number(*)', -10);
      node = doc.getElementById('FunctionNumberCaseNotNumber');
      assertNumber(node, null, 'number()', NaN);
    });

    it('number() conversion fails when too many arguments are provided', () => {
      assertThrow('number(1, 2)');
    });

    it('sum()', () => {
      let node = doc.getElementById('FunctionNumberCaseNumber');
      assertNumber(node, null, 'sum(self::*)', 123);

      node = doc.getElementById('FunctionNumberCaseNumberMultiple');
      assertNumber(node, null, 'sum(*)', 100);

      node = doc.getElementById('FunctionNumberCaseNotNumberMultiple');
      assertNumber(node, null, 'sum(node())', NaN);
      node = doc.getElementById('FunctionSumCaseJavarosa');
      assertNumber(node, null, 'sum(*)', NaN);
    });
  });

  it('sum() fails when too many arguments are provided', () => {
    assertThrow('sum(1, 2)');
  });

  it('sum() fails when too few arguments are provided', () => {
    assertThrow('sum()');
  });

  it('ceiling()', () => {
    assertNumber("ceiling(-1.55)", -1);
    assertNumber("ceiling(2.44)", 3);
    assertNumber("ceiling(0.001)", 1);
    assertNumber("ceiling(1.5)", 2);
    assertNumber("ceiling(5)", 5);
    assertNumber("ceiling(1.00)", 1);
    assertNumber("ceiling(-1.05)", -1);
  });

  it('ceiling() fails when too many arguments are provided', () => {
    assertThrow("ceiling(1, 2)");
  });

  it('ceiling() fails when not enough arguments are provided', () => {
    assertThrow("ceiling()");
  });

  it('round()', () => {
    assertNumber("round(-1.55)", -2);
    assertNumber("round(2.44)", 2);
    assertNumber("round(0.001)", 0);
    assertNumber("round(1.5)", 2);
    assertNumber("round(5)", 5);
    assertNumber("round(1.00)", 1);
    assertNumber("round(-1.05)", -1);
    assertNumber("round(33.33, -1)", 30);
  });

  it('round() fails when too many arguments are provided', () => {
    assertThrow("round(1, 2, 3)");
  });

  it('round() fails when too few arguments are provided', () => {
    assertThrow("round()");
  });
});

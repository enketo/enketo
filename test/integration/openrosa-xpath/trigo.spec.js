const { assert } = require('chai');
const { assertNumberValue, assertNumberRounded, initDoc, nsResolver } = require('../helpers');

describe('math functions', () => {

  it('sin()', () => {
    assertNumberValue('sin(2)', 0.9092974268256817);
    assertNumberValue('sin("a")', NaN);
  });

  it('sin() for node', () => {
    initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <body class="yui3-skin-sam" id="body">
          <div id="testFunctionNodeset">
            <div id="testFunctionNodeset2">
              <p>1</p>
              <p>2</p>
              <p>3</p>
              <p>4</p>
            </div>
          </div>
        </body>
      </html>`, nsResolver);
    assertNumberValue('sin(//xhtml:div[@id="testFunctionNodeset2"]/xhtml:p[2])', 0.9092974268256817);
  });

  it('cos()', () => {
    assertNumberValue('cos(2)', -0.4161468365471424);
    assertNumberValue('cos("NaN")', NaN);
  });

  it('tan()', () => {
    assertNumberValue('tan(2)', -2.185039863261519);
    assertNumberValue('tan("a")', NaN);
    assertNumberValue('tan("NaN")', NaN);
  });

  it('acos()', () => {
    assertNumberRounded('acos(0.5)', 1.047197551196598, 10**15);
    assertNumberRounded('acos(-1)', 3.141592653589793, 10**15);
    assertNumberValue('acos(2)', NaN);
    assertNumberValue('acos("a")', NaN);
    assertNumberValue('acos("NaN")', NaN);
  });

  it('asin()', () => {
    assertNumberRounded('asin(0.5)', 0.523598775598299, 10**15);
    assertNumberRounded('asin(-1)', -1.570796326794896, 10**15);
    assertNumberValue('asin(2)', NaN);
    assertNumberValue('asin("a")', NaN);
    assertNumberValue('asin("NaN")', NaN);
  });

  it('atan()', () => {
    assertNumberRounded('atan(0.5)', 0.463647609000806, 10**15);
    assertNumberRounded('atan(-1)', -0.785398163397448, 10**15);
    assertNumberValue('atan("a")', NaN);
    assertNumberValue('atan("NaN")', NaN);
  });

  it('atan2()', () => {
    assertNumberValue('atan2(2,3)', 0.5880026035475675);
    assertNumberValue('atan2(2, "NaN")', NaN);
    assertNumberValue('atan2(2, "a")', NaN);
    assertNumberValue('atan2("NaN", 2)', NaN);
  });

  it('log()', () => {
    assertNumberValue('log(2)', 0.6931471805599453);
    assertNumberValue('log("NaN")', NaN);
    assertNumberValue('log("a")', NaN);
  });

  it('log10()', () => {
    assertNumberValue('log10(2)', 0.3010299956639812);
    assertNumberValue('log10("NaN")', NaN);
    assertNumberValue('log10("a")', NaN);
  });

  it('pi()', () => {
    assertNumberValue('pi()', 3.141592653589793);
  });

  it('exp()', () => {
    assertNumberValue('exp(2)', 7.38905609893065);
    assertNumberValue('exp("NaN")', NaN);
  });

  it('exp10()', () => {
    assertNumberValue('exp10(2)', 100);
    assertNumberValue('exp10(-2)', 0.01);
    assertNumberValue('exp10("NaN")', NaN);
  });

  it('sqrt()', () => {
    assertNumberValue('sqrt(4)', 2);
    assertNumberValue('sqrt(-2)', NaN);
    assertNumberValue('sqrt("NaN")', NaN);
  });

  describe('referencing nodesets', () => {
    const doc = initDoc(`
      <numbers>
        <minusone>-1</minusone>
        <minuspointfive>-0.5</minuspointfive>
        <zero>0</zero>
        <pointfive>0.5</pointfive>
        <one>1</one>
        <nan>nonsense</nan>
      </numbers>
    `);

    [
      [ 'sin(/numbers/minusone)', -0.8414709848078965 ],
      [ 'sin(/numbers/minuspointfive)', -0.479425538604203 ],
      [ 'sin(/numbers/zero)', 0 ],
      [ 'sin(/numbers/pointfive)', 0.479425538604203 ],
      [ 'sin(/numbers/one)', 0.8414709848078965 ],
      [ 'sin(/numbers/nan)', NaN ],
      [ 'sin(/numbers/missing)', NaN ],

      [ 'cos(/numbers/minusone)', 0.5403023058681398 ],
      [ 'cos(/numbers/minuspointfive)', 0.8775825618903728 ],
      [ 'cos(/numbers/zero)', 1 ],
      [ 'cos(/numbers/pointfive)', 0.8775825618903728 ],
      [ 'cos(/numbers/one)', 0.5403023058681398 ],
      [ 'cos(/numbers/nan)', NaN ],
      [ 'cos(/numbers/missing)', NaN ],

      [ 'tan(/numbers/minusone)', -1.5574077246549023 ],
      [ 'tan(/numbers/minuspointfive)', -0.5463024898437905 ],
      [ 'tan(/numbers/zero)', 0 ],
      [ 'tan(/numbers/pointfive)', 0.5463024898437905 ],
      [ 'tan(/numbers/one)', 1.5574077246549023 ],
      [ 'tan(/numbers/nan)', NaN ],
      [ 'tan(/numbers/missing)', NaN ],

      [ 'asin(/numbers/minusone)', -1.5707963267948966 ],
      [ 'asin(/numbers/minuspointfive)', -0.5235987755982989 ],
      [ 'asin(/numbers/zero)', 0 ],
      [ 'asin(/numbers/pointfive)', 0.5235987755982989 ],
      [ 'asin(/numbers/one)', 1.5707963267948966 ],
      [ 'asin(/numbers/nan)', NaN ],
      [ 'asin(/numbers/missing)', NaN ],

      [ 'acos(/numbers/minusone)', 3.141592653589793 ],
      [ 'acos(/numbers/minuspointfive)', 2.0943951023931957 ],
      [ 'acos(/numbers/zero)', 1.5707963267948966 ],
      [ 'acos(/numbers/pointfive)', 1.0471975511965979 ],
      [ 'acos(/numbers/one)', 0 ],
      [ 'acos(/numbers/nan)', NaN ],
      [ 'acos(/numbers/missing)', NaN ],

      [ 'atan(/numbers/minusone)', -0.7853981633974483 ],
      [ 'atan(/numbers/minuspointfive)', -0.4636476090008061 ],
      [ 'atan(/numbers/zero)', 0 ],
      [ 'atan(/numbers/pointfive)', 0.4636476090008061 ],
      [ 'atan(/numbers/one)', 0.7853981633974483 ],
      [ 'atan(/numbers/nan)', NaN ],
      [ 'atan(/numbers/missing)', NaN ],

      [ 'log(/numbers/minusone)', NaN ],
      [ 'log(/numbers/minuspointfive)', NaN ],
      [ 'log(/numbers/zero)', -Infinity ],
      [ 'log(/numbers/pointfive)', -0.6931471805599453 ],
      [ 'log(/numbers/one)', 0 ],
      [ 'log(/numbers/nan)', NaN ],
      [ 'log(/numbers/missing)', NaN ],

      [ 'log10(/numbers/minusone)', NaN ],
      [ 'log10(/numbers/minuspointfive)', NaN ],
      [ 'log10(/numbers/zero)', -Infinity ],
      [ 'log10(/numbers/pointfive)', -0.3010299956639812 ],
      [ 'log10(/numbers/one)', 0 ],
      [ 'log10(/numbers/nan)', NaN ],
      [ 'log10(/numbers/missing)', NaN ],

      [ 'exp(/numbers/minusone)', 0.36787944117144233 ],
      [ 'exp(/numbers/minuspointfive)', 0.6065306597126334 ],
      [ 'exp(/numbers/zero)', 1 ],
      [ 'exp(/numbers/pointfive)', 1.6487212707001282 ],
      [ 'exp(/numbers/one)', 2.718281828459045 ],
      [ 'exp(/numbers/nan)', NaN ],
      [ 'exp(/numbers/missing)', NaN ],

      [ 'exp10(/numbers/minusone)', 0.1 ],
      [ 'exp10(/numbers/minuspointfive)', 0.31622776601683794 ],
      [ 'exp10(/numbers/zero)', 1 ],
      [ 'exp10(/numbers/pointfive)', 3.1622776601683795 ],
      [ 'exp10(/numbers/one)', 10 ],
      [ 'exp10(/numbers/nan)', NaN ],
      [ 'exp10(/numbers/missing)', NaN ],

      [ 'sqrt(/numbers/minusone)', NaN ],
      [ 'sqrt(/numbers/minuspointfive)', NaN ],
      [ 'sqrt(/numbers/zero)', 0 ],
      [ 'sqrt(/numbers/pointfive)', 0.7071067811865476 ],
      [ 'sqrt(/numbers/one)', 1 ],
      [ 'sqrt(/numbers/nan)', NaN ],
      [ 'sqrt(/numbers/missing)', NaN ],
    ].forEach(([ expr, expected ]) => {
      it(`should evaluate '${expr}' as '${expected}'`, () => {
        // when
        const actual = doc.xEval(expr).numberValue;

        // then
        if(isNaN(expected)) assert.isNaN(actual);
        else                assert.equal(actual, expected);
      });
    });
  });
});

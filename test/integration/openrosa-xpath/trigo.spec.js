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
});

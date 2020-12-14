const { assert, assertNumberValue, initDoc } = require('../../helpers');

describe('#min()', () => {

  it('simple value', () => {
    assertNumberValue('min(1, 2, 3)', 1);
    assertNumberValue('min(1, 2, 0)', 0);
    assertNumberValue('min(0, 2, 3)', 0);
    assertNumberValue('min(-1, 2, 3)', -1);
    assertNumberValue('min("")', NaN);
    assertNumberValue('min(//nonexisting)', NaN);
    assertNumberValue('min(//nonexisting)', NaN);
  });

  it('should return NaN if no numerical nodes are matched', () => {
    assertNumberValue('min(/simple)', NaN);
  });

  it('should return value of a single node if only one matches', () => {
    assertNumberValue('3', 'min(/simple/xpath/to/node)', 3);
  });

  it('should return NaN if any node evaluates to NaN', () => {
    const doc = initDoc(`
      <root>
        <item>3</item>
        <item>17</item>
        <item>-32</item>
        <item>cheese</item>
      </root>`);
    assert.isNaN(doc.xEval('min(/root/item)').numberValue);
  });

  it('should return the min value in a node set', () => {
    initDoc(`
      <root>
        <item>3</item>
        <item>-17</item>
        <item>32</item>
      </root>`);
    assertNumberValue('min(/root/item)', -17);
  });

  it('should return the min value in a node set of negative numbers', () => {
    initDoc(`
        <root>
          <item>-3</item>
          <item>-17</item>
          <item>-32</item>
        </root>`);
    assertNumberValue('min(/root/item)', -32);
  });

  it('min(self::*) & min(*)', () => {
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
    assertNumberValue(node, null, 'min(self::*)',  123);

    node = doc.getElementById('FunctionNumberCaseNumberMultiple');
    assertNumberValue(node, null, 'min(*)',  -10);
  });

  it('min()', () => {
    const doc = initDoc(`
      <div>
        <div id="FunctionMinCase">
          <div>5</div>
          <div>0</div>
          <div>15</div>
          <div>10</div>
        </div>

        <div id="FunctionMaxCase">
          <div>-5</div>
          <div>0</div>
          <div>-15</div>
          <div>-10</div>
        </div>

        <div id="FunctionMaxMinCaseEmpty"></div>

        <div id="FunctionMaxMinWithEmpty">
          <div>-5</div>
          <div>-15</div>
          <div></div>
        </div>

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
        </div>

      </div>`);

    let node = doc.getElementById('FunctionMaxMinCaseEmpty');
    assertNumberValue(node, null, 'min(self::*)', NaN);

    node = doc.getElementById('FunctionMaxMinWithEmpty');
    assertNumberValue(node, null, 'min(*)', NaN);

    node = doc.getElementById('FunctionMinCase');
    assertNumberValue(node, null, 'min(*)', 0);

    node = doc.getElementById('FunctionNumberCaseNotNumberMultiple');
    assertNumberValue(node, null, 'min(node())', NaN);

    assertNumberValue('min(//*[@id="FunctionMinCase"]/*[position()=1], //*[@id="FunctionMinCase"]/*[position()=2], //*[@id="FunctionMinCase"]/*[position()=3])', 0);
  });
});

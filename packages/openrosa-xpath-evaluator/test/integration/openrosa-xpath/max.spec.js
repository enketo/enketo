const { assertNumberValue, initDoc } = require('../helpers');

describe('#max()', () => {
    it('should max simple values', () => {
        assertNumberValue('max(1, 2, 3)', 3);
        assertNumberValue('max(-1, -3, 0)', 0);
        assertNumberValue('max(-1, 0, -3)', 0);
        assertNumberValue('max(-4, -1, -3)', -1);
        assertNumberValue('max("")', NaN);
        assertNumberValue('max(//nonexisting)', NaN);
    });

    it('should return NaN if no numerical nodes are matched', () => {
        assertNumberValue('', 'max(/simple)', NaN);
    });

    it('should return value of a single node if only one matches', () => {
        assertNumberValue('3', 'max(/simple/xpath/to/node)', 3);
    });

    it('should return NaN if any node evaluates to NaN', () => {
        initDoc(`
      <root>
        <item>3</item>
        <item>17</item>
        <item>-32</item>
        <item>cheese</item>
      </root>`);
        assertNumberValue('max(/root/item)', NaN);
    });

    it('should return the max value in a node set', () => {
        initDoc(`
      <root>
        <item>3</item>
        <item>17</item>
        <item>-32</item>
      </root>`);
        assertNumberValue('max(/root/item)', 17);
    });

    it('should return the max value in a node set of negative numbers', () => {
        initDoc(`
      <root>
        <item>-3</item>
        <item>-17</item>
        <item>-32</item>
      </root>`);
        assertNumberValue('max(/root/item)', -3);
    });

    it('max(self::*) & max(*)', () => {
        const doc = initDoc(`
      <root>
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
      </root>`);

        let node = doc.getElementById('FunctionMaxMinCaseEmpty');
        assertNumberValue(node, null, 'max(self::*)', NaN);

        node = doc.getElementById('FunctionMaxCase');
        assertNumberValue(node, null, 'max(*)', 0);

        node = doc.getElementById('FunctionMaxMinWithEmpty');
        assertNumberValue(node, null, 'max(*)', NaN);
    });

    it('max(self::*) & max(*)', () => {
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
        assertNumberValue(node, null, 'max(self::*)', 123);

        node = doc.getElementById('FunctionNumberCaseNumberMultiple');
        assertNumberValue(node, null, 'max(*)', 99);

        node = doc.getElementById('FunctionNumberCaseNotNumberMultiple');
        assertNumberValue(node, null, 'max(node())', NaN);

        assertNumberValue('max(//nonexisting)', NaN);
    });
});

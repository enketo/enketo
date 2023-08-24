const { assertStringValue, initDoc } = require('../helpers');

describe('once()', () => {
  const doc = initDoc(`
    <div id="FunctionSelectedCase">
      <div id="FunctionSelectedCaseEmpty"></div>
      <div id="FunctionSelectedCaseSingle">ab</div>
      <div id="FunctionSelectedCaseMultiple">ab cd ef gh</div>
      <div id="FunctionSelectedCaseMultiple">ij</div>
    </div>`);

  describe('evaluates when context node is empty', () => {
    const node = doc.getElementById('FunctionSelectedCaseEmpty');

    it('should set value to a string', () => {
      assertStringValue(node, null, 'once("aa")', 'aa');
    });

    it('should set value to NaN', () => {
      assertStringValue(node, null, 'once(. * 10)', 'NaN');
    });

    it('should set value to Inifity', () => {
      assertStringValue(node, null, 'once(1 div 0)', 'Infinity');
    });
  });

  it('does not evaluate when context node is not empty, but returns current value', () => {
    const node = doc.getElementById('FunctionSelectedCaseSingle');
    assertStringValue(node, null, 'once("aa")', 'ab');
  });
});

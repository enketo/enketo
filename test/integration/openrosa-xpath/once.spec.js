const { assertStringValue, initDoc } = require('../../helpers');

describe('once()', () => {

  it('attempt to change value of empty node', () => {
    const doc = initDoc(`
      <div id="FunctionSelectedCase">
        <div id="FunctionSelectedCaseEmpty"></div>
        <div id="FunctionSelectedCaseSingle">ab</div>
        <div id="FunctionSelectedCaseMultiple">ab cd ef gh</div>
        <div id="FunctionSelectedCaseMultiple">ij</div>
      </div>`);

    let node = doc.getElementById('FunctionSelectedCaseEmpty');
    assertStringValue(node, null, 'once("aa")', 'aa');

    // controversial: attempt to change value to NaN of empty node
    assertStringValue(node, null, 'once(. * 10)', '');

    // controversial: attempt to change value to Infinity of empty node
    assertStringValue(node, null, 'once(1 div 0)', '');

    // attempt to change value of node with existing value'
    node = doc.getElementById('FunctionSelectedCaseSingle');
    assertStringValue(node, null, 'once("aa")', 'ab');
  });
});

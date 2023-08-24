const { initDoc, assertNumberValue } = require('../helpers');

describe('#count-selected()', () => {
  it('count-selected()', () => {
    const doc = initDoc(`
      <div id="FunctionSelectedCase">
        <div id="FunctionSelectedCaseEmpty"></div>
        <div id="FunctionSelectedCaseSingle">ab</div>
        <div id="FunctionSelectedCaseMultiple">ab cd ef gh</div>
        <div id="FunctionSelectedCaseMultiple">ij</div>
      </div>`);

    let node = doc.getElementById('FunctionSelectedCaseEmpty');
    assertNumberValue(node, null, 'count-selected(self::node())', 0);

    node = doc.getElementById('FunctionSelectedCaseSingle');
    assertNumberValue(node, null, 'count-selected(self::node())', 1);

    node = doc.getElementById('FunctionSelectedCaseMultiple');
    assertNumberValue(node, null, 'count-selected(self::node())', 4);
  });
});

const { assertStringValue, initDoc } = require('../helpers');

describe('#selected-at()', () => {
    [
        { from: 'zero one two three', index: 1, expected: 'one' },
        { from: 'zero one two three', index: 4, expected: '' },
        { from: 'zero one two three', index: -1, expected: '' },
        { from: '', index: 0, expected: '' },
    ].forEach(({ from, index, expected }) => {
        it(`should select ${expected} from "${from}" at index ${index}`, () => {
            assertStringValue(`selected-at('${from}', '${index}')`, expected);
        });
    });

    it('simple', () => {
        assertStringValue('selected-at("apple baby crimson", 2)', 'crimson');
        assertStringValue('selected-at("apple baby crimson", -1)', '');
        assertStringValue('selected-at("", 1)', '');
    });

    it('with nodes', () => {
        const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="FunctionSelectedCase">
            <div id="FunctionSelectedCaseEmpty"></div>
            <div id="FunctionSelectedCaseSingle">ab</div>
            <div id="FunctionSelectedCaseMultiple">ab cd ef gh</div>
            <div id="FunctionSelectedCaseMultiple">ij</div>
          </div>
        </body>
      </html>`);
        let node = doc.getElementById('FunctionSelectedCaseEmpty');
        assertStringValue(node, null, 'selected-at(self::node(), 0)', '');

        node = doc.getElementById('FunctionSelectedCaseSingle');
        assertStringValue(node, null, 'selected-at(self::node(), 0)', 'ab');

        node = doc.getElementById('FunctionSelectedCaseSingle');
        assertStringValue(node, null, 'selected-at(self::node(), 1)', '');

        node = doc.getElementById('FunctionSelectedCaseMultiple');
        assertStringValue(node, null, 'selected-at(self::node(), 2)', 'ef');
        assertStringValue(node, null, 'selected-at(self::node(), -1)', '');
    });
});

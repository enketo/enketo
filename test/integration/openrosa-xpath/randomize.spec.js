const { initDoc, assert, assertThrow, assertTrue, nsResolver } = require('../helpers');


describe('randomize()', () => {
  let doc;
  const SELECTOR = '//xhtml:div[@id="FunctionRandomize"]/xhtml:div';

  describe('shuffles nodesets', () => {
    beforeEach(() => {
      doc = initDoc(`
        <!DOCTYPE html>
        <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <title>xpath-test</title>
          </head>
          <body class="yui3-skin-sam" id="body">
            <div id="FunctionRandomize">
              <div>A</div>
              <div>B</div>
              <div>C</div>
              <div>D</div>
              <div>E</div>
              <div>F</div>
            </div>
            <div id="testFunctionNodeset2">
              <p>1</p>
              <p>2</p>
              <p>3</p>
              <p>4</p>
            </div>
          </body>
        </html>`, nsResolver);
    });

    it('without a seed', () => {
      assertTrue(`randomize(${SELECTOR})`);
      const getNodesAndText = (expr) => {
        let result = doc.xEval(expr, doc, XPathResult.UNORDERED_NODE_ITERATOR_TYPE);
        const nodes = [];
        let text = '';
        for (let j = 0; j < result.snapshotLength; j++) {
          const node = result.snapshotItem(j);
          nodes.push(node);
          text += node.textContent;
        }
        return [nodes, text];
      };
      const [nodes, text] = getNodesAndText(`randomize(${SELECTOR})`);
      assert.equal(nodes.length, 6);
      assert.equal(text.length, 6);
      assert.equal(text !== 'ABCDEF', true); // this will not always be true
    });

    [
      [42, 'AFCBDE'],
      ['42', 'AFCBDE'],
      [-42, 'EDAFBC'],
      [1, 'BFEACD'],
      [11111111, 'ACDBFE'],
      ['int(1)', 'BFEACD'],
      ['floor(1.1)', 'BFEACD'],
      ['//xhtml:div[@id="testFunctionNodeset2"]/xhtml:p', 'BFEACD']
    ].forEach(([seed, expected]) => {
      it(`with a seed: ${seed}`, () => {
        const result = doc.xEval(`randomize(${SELECTOR}, ${seed})`, doc,
          XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE);
        let text = '';
        for (let j = 0; j < result.snapshotLength; j++) {
          text += result.snapshotItem(j).textContent;
        }
        assert.equal(text, expected);
      });
    });
  });

  it('with invalid args, throws an error', () => {
    assertThrow('randomize()');
    assertThrow(`randomize(${SELECTOR}, 'a')`);
    assertThrow(`randomize(${SELECTOR}, 1, 2)`);
  });
});

describe('randomize()', () => {
  const doc = initDoc(`
    <model>
        <instance>
            <rank id="rank">
                <s1/>
                <r1/>
                <r2/>
                <r3>foddertree beans cacao coffee foddergrass banana</r3>
                <r4/>
                <meta>
                    <instanceID/>
                </meta>
            </rank>
        </instance>
        <instance id="crop_list">
            <root>
                <item>
                    <label>Banana</label>
                    <name>banana</name>
                </item>
                <item>
                    <label>Beans</label>
                    <name>beans</name>
                </item>
                <item>
                    <label>Cacao</label>
                    <name>cacao</name>
                </item>
                <item>
                    <label>Coffee</label>
                    <name>coffee</name>
                </item>
                <item>
                    <label>Fodder Grass</label>
                    <name>foddergrass</name>
                </item>
                <item>
                    <label>Fodder Tree</label>
                    <name>foddertree</name>
                </item>
            </root>
        </instance>
      </model>`);

  it('randomizes nodes', () => {
    const expr = 'randomize(/model/instance[@id="crop_list"]/root/item)';
    const res = doc.xEval(expr, doc, 7);
    assert.equal(res.resultType, 7);
    assert.equal(res.snapshotLength, 6);
  });
});

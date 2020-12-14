const { initDoc, nsResolver, filterAttributes, assert } = require('../../helpers');

describe('XPath expression evaluation', () => {
  let doc;
  beforeEach(() => {
    doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="XPathExpressionEvaluateCase">
            <div id="testContextNodeParameter" style="display:block;">
              <div id="testContextNodeParameterText">some text</div>
              <div id="testContextNodeParameterCData"><![CDATA[aa<strong>some text</strong>]]></div>
              <div id="testContextNodeParameterComment"><!-- here is comment --></div>
              <div id="testContextNodeParameterProcessingInstruction"><?xml-stylesheet type="text/xml" href="test.xsl"?></div>
              <div id="testContextNodeParameterNamespace" xmlns:asdf="http://some-namespace/"></div>
            </div>
          </div>
        </body>
      </html>`);
  });

  it('works with different types of context parameters', () => {
    let result;
    [
      [ ".", doc, 9], // Document
      [ ".", doc.documentElement, 1], // Element
      [ ".", doc.getElementById('testContextNodeParameter'), 1], // Element
      [ ".", filterAttributes(doc.getElementById('testContextNodeParameter' ).attributes )[0], 2], // Attribute
      [ ".", doc.getElementById('testContextNodeParameterText' ).firstChild, 3], // Text
      [".", doc.getElementById('testContextNodeParameterCData').firstChild, 4], // CDATASection
      [".", doc.getElementById('testContextNodeParameterProcessingInstruction').firstChild, 7], // ProcessingInstruction
      [".", doc.getElementById('testContextNodeParameterComment').firstChild, 8] // Comment
    ].forEach(t => {
      assert.equal(t[1].nodeType, t[2]);
      result = doc.evaluate(t[0], t[1], null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
      assert.equal(result.singleNodeValue, t[1]);
    });
  });

  it('works with different context parameter namespaces', () => {
    // get a namespace node
    const node = doc.getElementById('testContextNodeParameterNamespace');
    //TODO let result = xEval("namespace::node()", node, XPathResult.ANY_UNORDERED_NODE_TYPE);
    let result = doc.xEval(".", node, XPathResult.ANY_UNORDERED_NODE_TYPE);
    const item = result.singleNodeValue;
    assert.isNotNull(item);
    //TODO chrome/firefox do not support namespace:node()
    // assert.equal(item.nodeType, 13);

    // use namespacenode as a context node
    result = doc.evaluate(".", item, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
    assert.equal(result.singleNodeValue, item);
  });

  it('fails if the context is document fragment', () => {
    const test = () => {
      doc.evaluate(".", doc.createDocumentFragment(), null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
    };
    assert.throw(test, Error);
  });
});

describe('XPath expression evaluation3', () => {
  const doc = initDoc(`<model>
      <instance>
        <nested_repeats id="nested_repeats">
          <formhub><uuid/></formhub>
          <kids>
            <has_kids>1</has_kids>
          </kids>
        </nested_repeats>
      </instance>
    </model>`);

  it('works with expected return type', () => {
    let expr = `/model/instance[1]/nested_repeats/kids/has_kids='1'`;
    let res = doc.xEval(expr, doc, 3);
    assert.equal(res.resultType, 3);
    assert.equal(res.booleanValue, true);

    expr = `/model/instance[1]/nested_repeats/kids/has_kids='2'`;
    res = doc.xEval(expr, doc, 3);
    assert.equal(res.resultType, 3);
    assert.equal(res.booleanValue, false);
  });
});


describe('XPath expression evaluation4', () => {
  const doc = initDoc(`<thedata id="thedata">
      <nodeA/>
      <nodeB>b</nodeB>
    </thedata>`);

  [
    ['/thedata/nodeA', true],
    ['/thedata/nodeB', true],
    ['/thedata/nodeC', false],
  ].forEach(([expr, expected]) => {
    it('returns correct result type', () => {
      const res = doc.xEval(expr, doc, 3);
      assert.equal(res.resultType, 3);
      assert.equal(res.booleanValue, expected);
    });
  });
});

describe('XPath expression evaluation5', () => {
  const doc = initDoc(`
    <html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml"
      xmlns:jr="http://openrosa.org/javarosa"
      xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <model>
      <instance>
        <data id="nested-repeat-v5">
          <region jr:template="">
            <livestock jr:template="">
              <type/>
              <type_other/>
            </livestock>
          </region>
          <meta>
            <instanceID/>
          </meta>
        </data>
      </instance>
    </model></html>`);

  it('returns correct result type', () => {
    const expr = '/model/instance[1]/*//*[@template] | /model/instance[1]/*//*[@jr:template]';
    const res = doc.xEval(expr, doc, 7, nsResolver);
    assert.equal(res.resultType, 7);
    assert.equal(res.snapshotLength, 0);
  });
});

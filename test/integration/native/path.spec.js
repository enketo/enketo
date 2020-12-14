const { initDoc, nsResolver, filterAttributes, assert,
  assertNodes, assertNodesNamespace } = require('../../helpers');

describe('location path', () => {
  let doc;
  let h;

  beforeEach(() => {
    doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="LocationPathCase">
            <div id="LocationPathCaseText">some text</div>
            <div id="LocationPathCaseComment"><!-- some comment --></div>
            <div id="LocationPathCaseCData"><![CDATA[some cdata]]></div>
            <div id="LocationPathCaseProcessingInstruction"><?xml-stylesheet type="text/xml" href="test.xsl"?></div>
            <div id="LocationPathCaseAttribute" class="123" width="100%"></div>
            <div id="LocationPathCaseNamespace" xmlns:asdf="http://www.123.com/"></div>

            <div id="LocationPathCaseDuplicates"></div>

            <div id="LocationPathCaseAttributeParent"><div attr="aa"></div><div attr="aa3a" attr2="sss"></div><div attr2="adda"></div><div attr4="aa"></div></div>

            <div id="LocationPathCaseNamespaceParent"><div xmlns="http://asdss/"></div><div xmlns:aa="http://saa/" xmlns:a2="hello/world" xmlns:ab="hello/world2"></div><div></div><div xmlns:aa="http://saa/"></div></div>
          </div>
        </body>
      </html>`, nsResolver);
    h = {
      oneNamespaceNode(node) {
        const result = doc.xEval("namespace::node()", node, XPathResult.ANY_UNORDERED_NODE_TYPE);
        const item = result.singleNodeValue;
        assert.isNotNull(item);
        return item;
      }
    };
  });

  it('root', () => {
    let i;
    let node;

    const input = [
      [doc, [doc]], // Document
      [doc.documentElement, [doc]], // Element
      [doc.getElementById('LocationPathCase'), [doc]], // Element
      [doc.getElementById('LocationPathCaseText').firstChild, [doc]], // Text
      [doc.getElementById('LocationPathCaseComment').firstChild, [doc]], // Comment
      // [filterAttributes(doc.getElementById('LocationPathCaseAttribute').attributes)[0], [doc]] // Attribute
   ];

    // ProcessingInstruction
    node = doc.getElementById('LocationPathCaseProcessingInstruction').firstChild;
    if (node && node.nodeType == 7) {
      input.push([node, [doc]]);
    }

    // CDATASection
    node = doc.getElementById('LocationPathCaseCData').firstChild;
    if (node && node.nodeType == 4) {
      input.push([node, [doc]]);
    }

    for (i = 0; i < input.length; i++) {
      assertNodes("/", input[i][0], input[i][1]);
    }
  });

  it('root namespace', () => {
    const node = h.oneNamespaceNode(doc.getElementById('LocationPathCaseNamespace'));
    assertNodes("/", node, [doc]);
  });

  it('root node', () => {
    assertNodes("/html", doc, []);
    assertNodes("/xhtml:html", doc, [doc.documentElement]);
    assertNodes("/xhtml:html", doc.getElementById('LocationPathCase'), [doc.documentElement]);
    assertNodes("/htmlnot", doc.getElementById('LocationPathCase'), []);
  });

  it('root node node', () => {
    assertNodes("/xhtml:html/xhtml:body", doc.getElementById('LocationPathCase'), [doc.querySelector('body')]);
  });

  it('node (node)', () => {
    assertNodes("html", doc, []);
    assertNodes("xhtml:html", doc, [doc.documentElement]);
    assertNodes("xhtml:html/xhtml:body", doc, [doc.querySelector('body')]);
  });

  it('node attribute', () => {
    const node = doc.getElementById('LocationPathCaseAttributeParent');
    assertNodes("child::*/attribute::*", node, [
      filterAttributes(node.childNodes[0].attributes)[0],
      filterAttributes(node.childNodes[1].attributes)[0],
      filterAttributes(node.childNodes[1].attributes)[1],
      filterAttributes(node.childNodes[2].attributes)[0],
      filterAttributes(node.childNodes[3].attributes)[0]
    ]);
  });

  it('duplicates handled correctly', () => {
    assertNodes("ancestor-or-self::* /ancestor-or-self::*", doc.getElementById('LocationPathCaseDuplicates'), [
      doc.documentElement,
      doc.querySelector('body'),
      doc.getElementById('LocationPathCase'),
      doc.getElementById('LocationPathCaseDuplicates')
    ]);
  });

  xit('node namespace', () => {
    const node = doc.getElementById('LocationPathCaseNamespaceParent' );

    assertNodesNamespace("child::* /namespace::*", node, [
      ['', 'http://asdss/'],
      ['ev', 'http://some-namespace.com/nss'],
      ['xml', 'http://www.w3.org/XML/1998/namespace'],
      ['', 'http://www.w3.org/1999/xhtml'],
      ['ab', 'hello/world2'],
      ['a2', 'hello/world'],
      ['aa', 'http://saa/'],
      ['ev', 'http://some-namespace.com/nss'],
      ['xml', 'http://www.w3.org/XML/1998/namespace'],
      ['', 'http://www.w3.org/1999/xhtml'],
      ['ev', 'http://some-namespace.com/nss'],
      ['xml', 'http://www.w3.org/XML/1998/namespace'],
      ['', 'http://www.w3.org/1999/xhtml'],
      ['aa', 'http://saa/'],
      ['ev', 'http://some-namespace.com/nss'],
      ['xml', 'http://www.w3.org/XML/1998/namespace']
   ], nsResolver);
  });
});

const { initDoc, nsResolver, filterAttributes,
  parseNamespacesFromAttributes, sortedNamespaces,
  assert, assertNodes, assertNodesNamespace } = require('../../helpers');

describe('node name for', () => {
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
          <div id="StepNodeTestCaseNameTest">
            <div id="StepNodeTestCaseNameTestAttribute" ev:attrib1="value" ev:attrib2="value2" xml:attrib2="something" xml:sss="something2" attrib3="asdf" xmlns:ns2="http://asdf/" ns2:attrib4="Hello world"></div>
            <div id="StepNodeTestCaseNameTestNamespace" xmlns:ns1="test-123" xmlns:ns2="http://asdf/" ev:attrib1="value" xml:attrib2="something" attrib3="asdf"></div>
            <div id="StepNodeTestCaseNameTestChild"><div xmlns="http://asdf/"></div><ev:div xmlns:ev="http://asdf/"></ev:div><ev:span xmlns:ev="http://asdf/"></ev:span>
              <div></div>
              asdf
              <!-- asdf -->
              asdf
              <div></div>

              <div></div>
              asas
              <div></div>
            </div>

            <div id="StepNodeTestCaseNameTest1">
              <div id="StepNodeTestCaseNameTest2">
                <div id="StepNodeTestCaseNameTest3"></div>
              </div>
            </div>

            <div id="StepNodeTestCaseNameTestNoNamespace"><div xmlns=""><div><div></div></div></div></div>
          </div>
        </body>
      </html>`, nsResolver);

    h = {
      filterElementNodes(nodes) {
        const elementNodes = [];
        let i;
        for(i = 0; i < nodes.length; i++) {
          if(nodes[ i ].nodeType == 1) {
            elementNodes.push(nodes[i]);
          }
        }
        return elementNodes;
      }
    };
  });

  it('any attribute', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestAttribute');
    assertNodes("attribute::*", node, filterAttributes(node.attributes));
  });

  it('any namespace', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestNamespace'),
      namespaces = [];

    namespaces.push(['', 'http://www.w3.org/1999/xhtml']);
    parseNamespacesFromAttributes(node.attributes, namespaces);
    namespaces.push(['ev', 'http://some-namespace.com/nss']);
    namespaces.push(['xml', 'http://www.w3.org/XML/1998/namespace']);

    assertNodesNamespace("namespace::*", node, sortedNamespaces(namespaces));
  });

  it('any child', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestChild');
    assertNodes("child::*", node, h.filterElementNodes(node.childNodes));
  });

  it('any ancestor-or-self', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestAttribute'),
      attributes = filterAttributes(node.attributes);

    assertNodes("ancestor-or-self::*", attributes[0], [
      doc.documentElement,
      doc.querySelector('body'),
      doc.getElementById('StepNodeTestCaseNameTest'),
      doc.getElementById('StepNodeTestCaseNameTestAttribute')
    ]);
  });

  it.skip('any attribute with specific namespace', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestAttribute');
    const attributes = filterAttributes(node.attributes);
    let i;
    let name;

    for (i = attributes.length - 1; i >= 0; i--) {
      name = attributes[ i ].nodeName.split(':');

      if (name[ 0 ] != 'ev') {
        attributes.splice(i, 1);
      }
    }

    assert.equal(attributes.length, 2);
    assertNodes("attribute::ev:*", node, attributes, nsResolver);
  });

  it('any namespace with a specific namespace (?)', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestNamespace');
    assertNodesNamespace("namespace::ns2:*", node, []);
  });

  it.skip('any child with specific namespace', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestChild');
    const nodesFinal = [
      node.childNodes[0],
      node.childNodes[1],
      node.childNodes[2]
    ];
    assertNodes("child::ns2:*", node, nodesFinal);
  });

  it.skip('attribute with a specific name and namespace', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestAttribute');
    const attributes = filterAttributes(node.attributes);
    let i;

    for (i = attributes.length - 1; i >= 0; i--) {
      const name = attributes[ i ].nodeName.split(':');
      if (name[ 0 ] != 'ev' || name[ 1 ] != 'attrib2') {
        attributes.splice(i, 1);
      }
    }

    assert.equal(attributes.length, 1);
    assertNodes("attribute::ev:attrib2", node, attributes);
  });

  it('specific namespace with a specific namespace', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestNamespace');
    assertNodesNamespace("namespace::ns2:ns2", node, []);
  });

  it.skip('specific child name with a specific namespace', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestChild');
    let nodesFinal = [];

    nodesFinal = [
      node.childNodes[ 0 ],
      node.childNodes[ 1 ]
    ];
    assertNodes("child::ns2:div", node, nodesFinal);
  });

  it('attribute with a specific name', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestAttribute');
    const attributes = filterAttributes(node.attributes);
    let i;
    let name;

    for (i = attributes.length - 1; i >= 0; i--) {
      name = attributes[ i ].nodeName.split(':');

      if(name[ 0 ] != 'attrib3') {
        attributes.splice(i, 1);
      }
    }

    assert.equal(attributes.length, 1);
    assertNodes("attribute::attrib3", node, attributes);
  });

  it('namespace with specific name', () => {
    const node = doc.getElementById('StepNodeTestCaseNameTestNamespace');
    assertNodesNamespace("namespace::ns2", node, [['ns2', 'http://asdf/']]);
  });

  it('child with specific (namespaced) name', () => {
    assertNodes("child::html", doc, []);
    assertNodes("child::xhtml:html", doc, [doc.documentElement]);
  });

  it('ancestor with specific name and namespace', () => {
    assertNodes("ancestor::xhtml:div", doc.getElementById('StepNodeTestCaseNameTest3'), [
      doc.getElementById('StepNodeTestCaseNameTest'),
      doc.getElementById('StepNodeTestCaseNameTest1'),
      doc.getElementById('StepNodeTestCaseNameTest2')
    ]);
  });

  it('ancestor with specific name without a default namespace', () => {
    assertNodes("ancestor::div", doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild.firstChild.firstChild, [
      doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild,
      doc.getElementById('StepNodeTestCaseNameTestNoNamespace').firstChild.firstChild
    ]);
  });
});

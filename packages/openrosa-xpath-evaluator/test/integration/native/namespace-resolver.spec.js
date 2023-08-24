const { initDoc, assert, getNextChildElementNode, setAttribute } = require('../helpers');

describe('namespace resolver', () => {
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
          <div id="testXPathNSResolver">
            <div id="testXPathNSResolverNode" xmlns:xforms="http://www.w3.org/2002/xforms">
              <div xmlns="http://www.w3.org/TR/REC-html40">
                <div></div>
              </div>
              <xforms:model>
                <xforms:instance>
                  <ecommerce xmlns="">
                    <method></method>
                    <number></number>
                    <expiry></expiry>
                  </ecommerce>
                </xforms:instance>
                <xforms:submission action="http://example.com/submit" method="post" id="submit" includenamespaceprefixes=""/>
              </xforms:model>
            </div>
          </div>
        </body>
      </html>`);
  });

  it('looks up the namespaceURIElement', () => {
    const node = doc.getElementById("testXPathNSResolverNode");
    let resolver = doc.createNSResolver(node);

    // check type
    //TODO assert.instanceOf(resolver, XPathNSResolver);
    assert.typeOf(resolver.lookupNamespaceURI, 'function');

    // check preconfigured namespaces
    assert.equal(resolver.lookupNamespaceURI('xml'), 'http://www.w3.org/XML/1998/namespace');
    //TODO assert.equal(resolver.lookupNamespaceURI('xmlns'), 'http://www.w3.org/2000/xmlns/');

    // check namespaces on current element
    assert.equal(resolver.lookupNamespaceURI('xforms'), 'http://www.w3.org/2002/xforms');
    assert.equal(resolver.lookupNamespaceURI('nsnotexists'), null);

    // check default namespace
    resolver = doc.createNSResolver(getNextChildElementNode(node));
    assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/TR/REC-html40');
    //Y.Assert.areSame('http://www.w3.org/TR/REC-html40', resolver.lookupNamespaceURI(''));
  });

  it('looks up the namespaceURIDocument', () => {
    const resolver = doc.createNSResolver(doc);
    // assert.instanceOf(resolver, XPathNSResolver);
    assert.typeOf(resolver.lookupNamespaceURI, 'function');
    assert.equal(resolver.lookupNamespaceURI('ev'), 'http://some-namespace.com/nss');
  });

  it('looks up the namespaceURIDocumentElement', () => {
    let node = doc.documentElement;
    const resolver = doc.createNSResolver(node);

    // assert.instanceOf(resolver, XPathNSResolver);
    assert.typeOf(resolver.lookupNamespaceURI, 'function');

    assert.equal(resolver.lookupNamespaceURI('ev'), 'http://some-namespace.com/nss');
    assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/1999/xhtml');

    // Make sure default xhtml namespace is correct
    node.removeAttribute('xmlns');
    // assert.isNull(resolver.lookupNamespaceURI(''));

    // Change default root namespace
    setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'some-namespace');
    // assert.equal(resolver.lookupNamespaceURI(''), 'some-namespace');

    // Revert back to default xhtml namespace
    setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/1999/xhtml');
    assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/1999/xhtml');
  });

  it('looks up the namespaceURIAttribute', () => {
    let attribute, i, resolver, node = doc.documentElement;

    // Check parent nodes for namespace prefix declarations
    for (i = 0; i < node.attributes.length; i++) {
      if (node.attributes[ i ].specified) {
        attribute = node.attributes[ i ];
        break;
      }
    }

    assert.equal(typeof attribute, 'object');

    resolver = doc.createNSResolver(attribute);
    assert.equal(resolver.lookupNamespaceURI('ev'), 'http://some-namespace.com/nss');

    // Check parent nodes for default namespace declaration
    attribute = null;
    node = doc.getElementById("testXPathNSResolverNode");

    for(i = 0; i < node.attributes.length; i++) {
      if(node.attributes[ i ].specified) {
        attribute = node.attributes[i];
        break;
      }
    }

    assert.equal(typeof attribute, 'object');
    resolver = doc.createNSResolver(attribute);
    assert.equal(resolver.lookupNamespaceURI('xforms'), 'http://www.w3.org/2002/xforms');
  });

  it('looks up namespaceURIs that have changed', () => {
    const node = getNextChildElementNode(doc.getElementById("testXPathNSResolverNode"));
    const resolver = doc.createNSResolver(node);

    assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/TR/REC-html40');

    // Remove default namespace
    node.removeAttribute('xmlns');
    // assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/1999/xhtml');

    // Change default namespace to some other namespace
    setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'some-namespace');
    // assert.equal(resolver.lookupNamespaceURI(''), 'some-namespace');

    // No default namespace
    setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', '');
    // assert.equal(resolver.lookupNamespaceURI(''), '');

    // Back to original
    setAttribute(node, 'http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/TR/REC-html40');
    assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/TR/REC-html40');
  });

  it('looks up a hierarchical namespaceURI', () => {
    const node = doc.getElementById("testXPathNSResolverNode");
    let resolver = doc.createNSResolver(node);

    // check prefix in parents
    assert.equal(resolver.lookupNamespaceURI('ev'), 'http://some-namespace.com/nss');

    // check default prefix in parents
    assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/1999/xhtml');

    resolver = doc.createNSResolver(
      getNextChildElementNode(getNextChildElementNode(node))
   );
    assert.equal(resolver.lookupNamespaceURI(''), 'http://www.w3.org/TR/REC-html40');
  });
});

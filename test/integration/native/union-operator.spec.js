const { initDoc, filterAttributes, snapshotToArray,
  assertNodes, assertUnorderedNodes } = require('../helpers');

describe('Union operator', () => {
  let doc;
  beforeEach(() => {
    doc = initDoc(`
      <div id="UnionOperatorTestCase">
        <div id="eee10">
          <div id="eee20">
            <div>
              <div id="eee25"></div>
            </div>
          </div>
          <div id="eee30">
            <div id="eee35"></div>
            <div id="eee40" class="sss"></div>
          </div>
        </div>
        <div id="eee50"></div>

        <div id="nss10">
          <div id="nss20">
            <div id="nss25" xmlns:asdf="http://asdf.com/" align="right"></div>
            <div xmlns:asdf="http://asdf.com/" id="nss30"></div>
          </div>
          <div id="nss40" xmlns:asdf="sss" xmlns:asdf2="sdfsdf"></div>
        </div>
      </div>`);
  });

  it('combines two elements', () => {
    assertNodes(
      "id('eee10') | id('eee20')",
      doc, [
        doc.getElementById('eee10'),
        doc.getElementById('eee20'),
      ]);
  });

  describe('without spaces around the operator', () => {
    it('should work with a simple nodeset before the operator', () => {
      assertNodes(
        "/div/div/div/div/div|id('eee20')",
        doc, [
          // these are in document order, not the order they are listed in the expression // TODO check if this is to spec
          doc.getElementById('eee20'),
          doc.getElementById('eee25'),
        ]);
    });

    it('should work with a predicated nodeset before the operator 0', () => {
      assertNodes(
        "/*[1]/*[1]|id('eee20')",
        doc, [
          doc.getElementById('eee10'),
          doc.getElementById('eee20'),
        ]);
    });

    it('should work with a predicated nodeset before the operator 1', () => {
      assertNodes(
        "/div/div[1]|id('eee20')",
        doc, [
          doc.getElementById('eee10'),
          doc.getElementById('eee20'),
        ]);
    });

    it('should work with a predicated nodeset before the operator 2', () => {
      assertNodes(
        "/div[1]/div[1]|id('eee20')",
        doc, [
          doc.getElementById('eee10'),
          doc.getElementById('eee20'),
        ]);
    });

    it('should work with a predicated nodeset before the operator 3', () => {
      assertNodes(
        "/div[1]/div[1]|id('eee20')",
        doc, [
          doc.getElementById('eee10'),
          doc.getElementById('eee20'),
        ]);
    });

    it('should work with a function call before the operator', () => {
      assertNodes(
        "id('eee10')|id('eee20')",
        doc, [
          doc.getElementById('eee10'),
          doc.getElementById('eee20'),
        ]);
    });
  });

  it('combines many elements', () => {
    assertNodes(
      "id('eee40') | id('eee20') | id('eee25') | id('eee10') | id('eee30') | id('eee50')",
      doc, [
        doc.getElementById('eee10'),
        doc.getElementById('eee20'),
        doc.getElementById('eee25'),
        doc.getElementById('eee30'),
        doc.getElementById('eee40'),
        doc.getElementById('eee50'),
      ]);
  });

  describe('general tests', () => {
    // TODO these were created while debugging UNION, but should be somewhere else
    it('combines elements and attributes', () => {
      assertNodes("id('eee40')/attribute::*[1] | id('eee30')", doc, [
        doc.getElementById('eee30'),
        filterAttributes(doc.getElementById('eee40').attributes)[0],
      ]);
    });

    it('returns indexed attributes', () => {
      assertNodes("id('eee40')/attribute::*[1]", doc, [
        filterAttributes(doc.getElementById('eee40').attributes)[0],
      ]);
    });

    it('returns all attributes', () => {
      assertNodes("id('eee40')/attribute::*", doc, filterAttributes(doc.getElementById('eee40').attributes));
    });

    it('returns root node', () => {
      assertNodes("/div", doc, [doc.getElementById('UnionOperatorTestCase')]);
    });

    it('returns doc node', () => {
      assertNodes("/", doc, [doc]);
    });
  });

  it('combines elements and attributes', () => {
    assertNodes("id('eee40')/attribute::*[1] | id('eee30')", doc, [
      doc.getElementById('eee30'),
      filterAttributes(doc.getElementById('eee40').attributes)[0],
    ]);
  });

  it('combines elements and attributes if they refer to the same element', () => {
    assertNodes("id('eee40')/attribute::*[1] | id('eee40')", doc, [
      doc.getElementById('eee40'),
      filterAttributes(doc.getElementById('eee40').attributes)[0],
    ]);
  });

  it('combines elements and attributs if they refer to different trees', () => {
    assertNodes("id('eee40')/attribute::*[1] | id('eee20')", doc, [
      doc.getElementById('eee20'),
      filterAttributes(doc.getElementById('eee40').attributes)[0],
    ]);
  });

  it('combines elements and attributes if the attribute is on a parent element in the same tree', () => {
    assertNodes("id('eee40') | id('eee30')/attribute::*[1]", doc, [
      filterAttributes(doc.getElementById('eee30').attributes)[0],
      doc.getElementById('eee40'),
    ]);
  });

  it('combines elements and attributes if both are (on) elements under the same parent', () => {
    assertNodes("id('eee40') | id('eee35')/attribute::*[1]", doc, [
      filterAttributes(doc.getElementById('eee35').attributes )[0],
      doc.getElementById('eee40'),
    ]);
  });

  it('combines attributes that live on different elements', () => {
    assertNodes("id('eee35')/attribute::*[1] | id('eee40')/attribute::*[1]", doc, [
      filterAttributes(doc.getElementById('eee35').attributes)[0],
      filterAttributes(doc.getElementById('eee40').attributes)[0],
    ]);
  });

  it('combines attributes that live on descendent elements', () => {
    assertNodes("id('eee30')/attribute::*[1] | id('eee40')/attribute::*[1]", doc, [
      filterAttributes(doc.getElementById('eee30').attributes)[0],
      filterAttributes(doc.getElementById('eee40').attributes)[0],
    ]);
  });

  it('combines attributes that live on descendent element (reversed)', () => {
    assertNodes("id('eee40')/attribute::*[1] | id('eee30')/attribute::*[1]", doc, [
      filterAttributes(doc.getElementById('eee30').attributes)[0],
      filterAttributes(doc.getElementById('eee40').attributes)[0],
    ]);
  });

  it('combines different attributes on the same element', () => {
    //TODO Is node order important? chrome vs firefox have different order.
    assertUnorderedNodes("id('eee40')/attribute::*[2] | id('eee40')/attribute::*[1]", doc,
      filterAttributes(doc.getElementById('eee40').attributes)); //firefox
    // expected
    // [class="sss", id="eee40"]

    // chrome
    // [class="sss", id="eee40"]

    // firefox -- returns attributes in the order they are found
    // [id="eee40", class="sss"]
  });

  it('combines a namespace and attribute on the same element', () => {
    const result = doc.xEval("id('nss25')/namespace::*", doc, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);

    assertNodes("id('nss25')/namespace::* | id('nss25')/attribute::*", doc,
      snapshotToArray(result).concat(
        filterAttributes(doc.getElementById('nss25').attributes)
      )
    );
  });

  it('combines two namespaces on the same element', () => {
    const result = doc.xEval("id('nss40')/namespace::*", doc, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);

    assertNodes("id('nss40')/namespace::* | id('nss40')/namespace::*", doc,
      snapshotToArray(result)
    );
  });

  it('combines a namespace and attribute', () => {
    const result = doc.xEval("id('nss40')/namespace::*", doc, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);

    //chrome vs firefox have different order.
    assertUnorderedNodes("id('nss40')/namespace::* | id('nss25')/attribute::* | id('nss25')", doc, [
      doc.getElementById('nss25')
    ].concat(
      filterAttributes(doc.getElementById('nss25').attributes)
    ).concat(
      snapshotToArray(result)
    ));
  });
});

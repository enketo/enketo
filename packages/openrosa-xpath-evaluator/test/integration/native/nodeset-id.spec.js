const { initDoc, assertNodes } = require('../helpers');

describe('nodeset id() function', () => {
  let doc;

  beforeEach(() => {
    doc = initDoc(`
      <div id="FunctionNodesetIdCase">
        <div id="FunctionNodesetIdCaseSimple"></div>
        <div id="FunctionNodesetIdCaseNoDefaultNamespaceContainer"><div id="FunctionNodesetIdCaseNoDefaultNamespace" xmlns=""></div></div>
        <div id="FunctionNodesetIdCaseXhtmlDefaultNamespaceContainer"><div id="FunctionNodesetIdCaseXhtmlDefaultNamespace" xmlns="http://www.w3.org/1999/xhtml"></div></div>
        <div id="FunctionNodesetIdCaseXhtmlNamespaceContainer"><div xhtml:id="FunctionNodesetIdCaseXhtmlNamespace" xmlns:xhtml="http://www.w3.org/1999/xhtml"></div></div>
        <div id="FunctionNodesetIdCaseXhtmlNamespaceParentContainer" xmlns:xhtml="http://www.w3.org/1999/xhtml"><div xhtml:id="FunctionNodesetIdCaseXhtmlNamespaceParent"></div></div>
        <div id="FunctionNodesetIdXmlNamespaceContainer"><div xml:id="FunctionNodesetIdXmlNamespace" xmlns=""></div></div>

        <div>
          <div id="FunctionNodesetIdCaseMultiple1"></div>
          <div id="FunctionNodesetIdCaseMultiple2"></div>
          <div id="FunctionNodesetIdCaseMultiple3"></div>
          <div id="FunctionNodesetIdCaseMultiple4"></div>
        </div>

        <div id="FunctionNodesetIdCaseNodeset"><p>FunctionNodesetIdCaseMultiple2</p><p>FunctionNodesetIdCaseMultiple1</p><p>FunctionNodesetIdCaseMultiple2 FunctionNodesetIdCaseMultiple4</p><p>FunctionNodesetIdCaseMultiple3</p></div>
      </div>`);
  });

  it('works for a simple case', () => {
    const node = doc.getElementById('FunctionNodesetIdCaseSimple');
    assertNodes("id('FunctionNodesetIdCaseSimple')", doc, [node]);
  });

  it('works if ID is provided in duplicate', () => {
    const node = doc.getElementById('FunctionNodesetIdCaseSimple');
    assertNodes("id('FunctionNodesetIdCaseSimple FunctionNodesetIdCaseSimple')",
      doc, [node]);
  });

  it('returns empty result for non-existing ID', () => {
    assertNodes("id('FunctionNodesetIdCaseSimpleDoesNotExist')", doc, []);
  });

  //TODO Browsers still return the node for this scenario when the nodes namespace is empty (xmlns='')
  xit('returns empty result if the default namespace for the node is empty', () => {
    const node = doc.getElementById('FunctionNodesetIdCaseNoDefaultNamespaceContainer').firstChild;
    assertNodes("id('FunctionNodesetIdCaseNoDefaultNamespace')", node, []);
  });

  it('works if the default namespace for the node is the XHTML namespace', () => {
    const node = doc.getElementById('FunctionNodesetIdCaseXhtmlDefaultNamespaceContainer').firstChild;
    assertNodes("id('FunctionNodesetIdCaseXhtmlDefaultNamespace')", doc, [node]);
  });

  // Browsers do not return anything in this case
  xit('works if the namespace of the id attribute is the XHTML namespace', () => {
    const node = doc.getElementById('FunctionNodesetIdCaseXhtmlNamespaceContainer').firstChild;
    assertNodes("id('FunctionNodesetIdCaseXhtmlNamespace')", doc, [node]);
  });

  // Browsers do not return anything in this case
  xit('works if the namespace of the id attribute is defined in the parent container', () => {
      const node = doc.getElementById('FunctionNodesetIdCaseXhtmlNamespaceParentContainer').firstChild;
      assertNodes("id('FunctionNodesetIdCaseXhtmlNamespaceParent')", doc, [node]);
  });

  // Browsers do not return anything in this case
  xit('works if the id attribute has the xml namespace alias', () => {
      const node = doc.getElementById('FunctionNodesetIdXmlNamespaceContainer').firstChild;
      assertNodes("id('FunctionNodesetIdXmlNamespace')", doc, [node]);
  });

  it('works if multiple space-separated IDs are provided as the parameter', () => {
    assertNodes("id('FunctionNodesetIdCaseMultiple1 FunctionNodesetIdCaseMultiple2 FunctionNodesetIdCaseMultiple3')", doc, [
      doc.getElementById('FunctionNodesetIdCaseMultiple1'),
      doc.getElementById('FunctionNodesetIdCaseMultiple2'),
      doc.getElementById('FunctionNodesetIdCaseMultiple3')
    ]);
  });

  it('works if multiple space/newline/table-separated IDs are provided as the parameter', () => {
    assertNodes("id('  FunctionNodesetIdCaseMultiple1 sss FunctionNodesetIdCaseMultiple2\r\n\tFunctionNodesetIdCaseMultiple3\t')", doc, [
      doc.getElementById('FunctionNodesetIdCaseMultiple1'),
      doc.getElementById('FunctionNodesetIdCaseMultiple2'),
      doc.getElementById('FunctionNodesetIdCaseMultiple3')
    ]);
  });

  it('works if a nodeset is provided as the argument (by using the content of the nodeset)', () => {
    assertNodes("id(.)", doc.getElementById('FunctionNodesetIdCaseNodeset'), []);

    // this test is tricky, the argument is the CONTENT of the FunctionNodesetIdCaseNodeset element!
    assertNodes("id(child::*)", doc.getElementById('FunctionNodesetIdCaseNodeset'), [
      doc.getElementById('FunctionNodesetIdCaseMultiple1'),
      doc.getElementById('FunctionNodesetIdCaseMultiple2'),
      doc.getElementById('FunctionNodesetIdCaseMultiple3'),
      doc.getElementById('FunctionNodesetIdCaseMultiple4')
    ]);
  });
});

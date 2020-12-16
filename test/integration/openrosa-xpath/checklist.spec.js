const { initDoc, assertTrue, assertFalse } = require('../helpers');

// @see https://docs.opendatakit.org/form-operators-functions/?highlight=checklist#checklist
describe('#checklist()', () => {

  it('checklist()', () => {
    assertTrue("checklist(-1, 2, 2>1)");
    assertFalse("checklist(-1, 2, 1=1, 2=2, 3=3)");
    assertFalse("checklist(1, 2, 1=1, 2=2, 3=3)");
    assertTrue("checklist(1, 1, 1=1)");
    assertTrue("checklist(1, 1, true(), false(), false())");
  });

  it('checklist(node)', () => {
    const doc = initDoc(`
      <div id="FunctionChecklistCase">
        <div id="FunctionChecklistCaseNo">no</div>
        <div id="FunctionChecklistCaseEmpty"></div>
        <div id="FunctionChecklistCase0">0</div>
      </div>`);
    let node = doc.getElementById('FunctionChecklistCase');
    assertTrue(node, null, "checklist(2, 2, * )");

    node = doc.getElementById('FunctionChecklistCaseEmpty');
    assertTrue(node, null, "checklist(-1, 2, self::node())");
    assertFalse(node, null, "checklist(1, 2, self::node())");
  });
});

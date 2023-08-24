const { assertTrue, assertFalse, initDoc } = require('../helpers');

// @see https://docs.opendatakit.org/form-operators-functions/?highlight=checklist#weighted-checklist
describe('#weighted-checklist()', () => {
  it('simple', () => {
    // Note: test for two node-set arguments done elsewhere
    assertTrue('weighted-checklist(-1, 2, 2>1, 2)');
    assertFalse('weighted-checklist(-1, 2, 2>1, 3)');
    assertFalse('weighted-checklist(-1, 2, 1=1, 1, 2=2, 1, 3=3, 1)');
    assertFalse('weighted-checklist(1, 2, 1=1, 1, 2=2, 1, 3=3, 1)');
    assertTrue('weighted-checklist(1, 1, 1=1, 1)');
    assertFalse('weighted-checklist(1, 1, 1=1, 0)');
    assertTrue('weighted-checklist(2, 2, true(), 2, false(), 5, false(), 6)');
    assertTrue('weighted-checklist(2, -1, true(), 999, false(), 5, false(), 6)');
  });

  it('with nodes', () => {
    const doc = initDoc(`
      <root>
        <div id="FunctionChecklistCase">
          <div id="FunctionChecklistCaseNo">no</div>
          <div id="FunctionChecklistCaseEmpty"></div>
          <div id="FunctionChecklistCase0">0</div>
        </div>

        <div id="FunctionChecklistCaseValues">
          <div>1</div>
          <div>1</div>
          <div>5</div>
        </div>

        <div id="FunctionWeightedChecklist">3</div>
      </root>`);
    let node = doc.getElementById('FunctionChecklistCase0');
    assertTrue(node, null, 'weighted-checklist(5, 5, self::* ,5)');

    node = doc.getElementById('FunctionChecklistCaseEmpty');
    assertTrue(node, null, 'weighted-checklist(-1, 2, self::node(), 0)');
    assertFalse(node, null, 'weighted-checklist(1, 2, self::node(), 1)');

    node = doc.getElementById('FunctionWeightedChecklist');
    assertTrue(node, null, 'weighted-checklist(3, 3, 1=1, self::node())');
  });
});

describe('#weighted-checklist()', () => {
  const doc = initDoc(`
    <thedata id="thedata">
      <somenodes>
        <A>one</A>
        <B>one</B>
        <C>one</C>
      </somenodes>
      <someweights>
        <w1>1</w1>
        <w2>3</w2>
        <w.3>5</w.3>
      </someweights>
    </thedata>`);

  it('with more nodes', () => {
    let expr = 'weighted-checklist(9, 9, /thedata/somenodes/*, /thedata/someweights/*)';
    assertTrue(doc, null, expr);
    expr = 'weighted-checklist(8, 8, /thedata/somenodes/*, /thedata/someweights/*)';
    assertFalse(doc, null, expr);
    expr = 'weighted-checklist(10, 10, /thedata/somenodes/*, /thedata/someweights/*)';
    assertFalse(doc, null, expr);
  });
});

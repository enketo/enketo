const { initDoc, assertStringValue } = require('../../helpers');

describe('#if()', () => {
  it('should return first option if true', () => {
    assertStringValue('if(true(), "a", "b")', 'a');
    assertStringValue('if(true(), 5, "abc")', 5);
  });

  it('should return second option if false', () => {
    assertStringValue('if(false(), "a", "b")', 'b');
    assertStringValue('if(false(), 5, "abc")', 'abc');
    assertStringValue('if(6 > 7, 5, "abc")', 'abc');
    assertStringValue('if("", 5, "abc")', 'abc');
  });

  it('should evaluate node', () => {
    const doc = initDoc(`
      <div id="FunctionChecklistCase">
        <div id="FunctionChecklistCaseNo">no</div>
        <div id="FunctionChecklistCaseEmpty"></div>
        <div id="FunctionChecklistCase0">0</div>
      </div>`);

    let node = doc.getElementById('FunctionChecklistCaseEmpty');
    assertStringValue(node, null, 'if(self::node(), "exists", "does not exist")', 'exists');
    node = doc.getElementById('FunctionChecklistCaseDoesNotExist');
    assertStringValue(node, null, 'if(self::node(), "exists", "does not exist")', 'does not exist');
  });
});

const { initDoc, assertStringValue } = require('../../helpers');

describe('#coalesce()', () => {
  it('should return first value if provided via xpath', () => {
    assertStringValue('first', 'coalesce(/simple/xpath/to/node, "whatever")', 'first');
  });

  it('should return first value if provided via string', () => {
    assertStringValue('coalesce("FIRST", "whatever")', 'FIRST');
  });

  it('should return second value from xpath if first value is empty string', () => {
    assertStringValue('second', 'coalesce("", /simple/xpath/to/node)', 'second');
  });

  it('should return second value from string if first value is empty string', () => {
    assertStringValue('coalesce("", "SECOND")', 'SECOND');
    assertStringValue("coalesce('', 'ab')", 'ab');
  });

  it('should return second value from xpath if first value is empty xpath', () => {
    assertStringValue('second', 'coalesce(/simple/empty, /simple/xpath/to/node)', 'second');
  });

  it('should return second value from string if first value is empty xpath', () => {
    assertStringValue('', 'coalesce(/simple/xpath/to/node, "SECOND")', 'SECOND');
  });

  it('coalesce(self::*)', () => {
    const doc = initDoc(`
      <div id="FunctionSelectedCase">
        <div id="FunctionSelectedCaseEmpty"></div>
        <div id="FunctionSelectedCaseSingle">ab</div>
        <div id="FunctionSelectedCaseMultiple">ab cd ef gh</div>
        <div id="FunctionSelectedCaseMultiple">ij</div>
      </div>`);
    let node = doc.getElementById('FunctionSelectedCaseEmpty');
    assertStringValue(node, null, "coalesce(self::*, 'ab')", 'ab');

    node = doc.getElementById('FunctionSelectedCaseSingle');
    assertStringValue(node, null, "coalesce(self::*, 'cd')", 'ab');
  });
});

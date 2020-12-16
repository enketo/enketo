const { initDoc, assertStringValue } = require('../helpers');

describe('#concat', () => {
  it('should concatenate two xpath values', () => {
    const regex = 'concat(/simple/xpath/to/node, /simple/xpath/to/node)';
    assertStringValue('jaja', regex, 'jajajaja');
  });

  it('should concatenate two string values', () => {
    assertStringValue('concat("port", "manteau")', 'portmanteau');
  });

  it('should concatenate a string and an xpath value', () => {
    assertStringValue('port', 'concat(/simple/xpath/to/node, "manteau")', 'portmanteau');
  });

  it('should concatenate an xpath and a string value', () => {
    assertStringValue('port', 'concat(/simple/xpath/to/node, "manteau")', 'portmanteau');
  });

  it('should concatenate simple values', () => {
    assertStringValue('concat("a")', 'a');
    assertStringValue('concat("a", "b", "")', 'ab');
  });

  // Javarosa accepts an optional node-set argument for concat which deviates from native XPath. It also accepts no arguments.
  it('should concatenate nodeset', () => {
    const doc = initDoc(`
      <div id="testFunctionNodeset">
        <div id="testFunctionNodeset2">
          <p>1</p>
          <p>2</p>
          <p>3</p>
          <p>4</p>
        </div>
      </div>`);
    const node = doc.getElementById('testFunctionNodeset2');
    assertStringValue(node, null, "concat(*, 'a')", '1234a');
    assertStringValue(node, null, "concat(*)", '1234');
    assertStringValue(node, null, "concat()", '');
  });
});

const { initDoc, assertStringValue } = require('../helpers');

describe('#join()', () => {
  it('should join a list of strings with supplied separator', () => {
    initDoc(`
      <root>
        <item>one</item>
        <item>two</item>
        <item>three</item>
      </root>`);
    assertStringValue('join(" :: ", //item)', 'one :: two :: three');
  });

  it('should join list of strings', () => {
    assertStringValue('join(" ", "This", "is", "a", "sentence.")', 'This is a sentence.');
    assertStringValue('join(" ## ")', '');
  });

  it('should join nodes', () => {
    const doc = initDoc(`
        <root id='xroot'>
          <item>1</item>
          <item>2</item>
          <item>3</item>
          <item>4</item>
        </root>`);
    assertStringValue('join(", ", //item)', '1, 2, 3, 4');
    assertStringValue('join(", ", /root/*)', '1, 2, 3, 4');

    const node = doc.getElementById('xroot');
    assertStringValue(node, null, 'join(", ", *)', '1, 2, 3, 4');
  });
});

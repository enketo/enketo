const { initDoc, nsResolver, assertThrow,
  assertTrue, assertFalse } = require('../../helpers');

describe('native boolean functions', () => {
  it('boolean() conversion of booleans', () => {
    assertTrue("boolean('a')");
    assertFalse("boolean('')");
    assertTrue("boolean(true())");
    assertFalse("boolean(false())");
  });

  it('boolean() conversion of numbers', () => {
    assertTrue("boolean(1)");
    assertTrue("boolean(-1)");
    assertTrue("boolean(1 div 0)");
    assertTrue("boolean(0.1)");
    assertTrue("boolean('0.0001')");
    assertFalse("boolean(0)");
    assertFalse("boolean(0.0)");
    assertFalse("boolean(number(''))");
  });

  it('boolean() conversion of nodeset', () => {
    initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
        </body>
      </html>`, nsResolver);
    assertTrue("boolean(/xhtml:html)");
    assertFalse("boolean(/asdf)");
    assertFalse("boolean(//xhtml:article)");
  });

  it('boolean(self::node())', () => {
    const doc = initDoc(`
      <root>
        <div id="FunctionBooleanEmptyNode">
          <div></div>
        </div>
      </root>`);
    const node = doc.getElementById('FunctionBooleanEmptyNode');
    assertTrue(node, null, "boolean(self::node())");
  });

  it('boolean() fails when too few arguments are provided', () => {
    assertThrow("boolean()");
  });

  it('boolean() fails when too many arguments are provided', () => {
    assertThrow("boolean(1, 2)");
  });
});

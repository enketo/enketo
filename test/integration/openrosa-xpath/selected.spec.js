const { assertTrue, assertFalse, simpleValueIs, initDoc } = require('../../helpers');

describe('#selected()', () => {
  it('should return true if requested item is in list', () => {
    // given
    simpleValueIs('one two three');

    assertTrue('selected(/simple/xpath/to/node, "one")');
    assertTrue('selected(/simple/xpath/to/node, "two")');
    assertTrue('selected(/simple/xpath/to/node, "three")');
  });

  it('should return false if requested item not in list', () => {
    // given
    simpleValueIs('one two three');

    assertFalse('selected(/simple/xpath/to/node, "on")');
    assertFalse('selected(/simple/xpath/to/node, "ne")');
    assertFalse('selected(/simple/xpath/to/node, "four")');
  });

  it('simple', () => {
    assertTrue('selected("apple baby crimson", "  baby  ")');
    assertTrue('selected("apple baby crimson", "apple")');
    assertTrue('selected("apple baby crimson", "baby")');
    assertTrue('selected("apple baby crimson", "crimson")');
    assertFalse('selected("apple baby crimson", "babby")');
    assertFalse('selected("apple baby crimson", "bab")');
    assertTrue('selected("apple", "apple")');
    assertFalse('selected("apple", "ovoid")');
    assertFalse('selected("", "apple")');
  });

  it('with nodes', () => {
    const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="FunctionSelectedCase">
            <div id="FunctionSelectedCaseEmpty"></div>
            <div id="FunctionSelectedCaseSingle">ab</div>
            <div id="FunctionSelectedCaseMultiple">ab cd ef gh</div>
            <div id="FunctionSelectedCaseMultiple">ij</div>
          </div>
        </body>
      </html>`);
    let node = doc.getElementById('FunctionSelectedCaseEmpty');
    assertTrue(node, null, 'selected(self::node(), "")');
    assertFalse(node, null, 'selected(self::node(), "ab")');

    node = doc.getElementById('FunctionSelectedCaseSingle');
    assertFalse(node, null, 'selected(self::node(), "bc")');
    assertTrue(node, null, 'selected(self::node(), "ab")');

    node = doc.getElementById('FunctionSelectedCaseMultiple');
    assertFalse(node, null, 'selected(self::node(), "kl")');
    assertTrue(node, null, 'selected(self::node(), "ab")');
    assertTrue(node, null, 'selected(self::node(), "cd")');
    assertFalse(node, null, 'selected(self::node(), "ij")');
  });
});

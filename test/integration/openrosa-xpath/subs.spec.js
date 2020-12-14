const { assertStringValue } = require('../../helpers');

describe('#substr()', () => {
  it('should give the rest of a string if supplied with only startIndex', () => {
    assertStringValue('0123456789', 'substr(/simple/xpath/to/node, 5)', '56789');
  });

  it('should give substring from start to finish if supplied with 2 indexes', () => {
    assertStringValue('0123456789', 'substr(/simple/xpath/to/node, 2, 4)', '23');
  });

  it('substr()', () => {
    assertStringValue('substr("hello",0)', 'hello');
    assertStringValue('substr("hello",0,5)', 'hello');
    assertStringValue('substr("hello",1)', 'ello');
    assertStringValue('substr("hello",1,5)', 'ello');
    assertStringValue('substr("hello",1,4)', 'ell');
    assertStringValue('substr("hello",-2)', 'lo');
    assertStringValue('substr("hello",0,-1)', 'hell');
  });
});

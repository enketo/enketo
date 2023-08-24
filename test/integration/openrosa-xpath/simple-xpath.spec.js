const { assertStringValue } = require('../helpers');

describe('openrosa-xpath', () => {
  it('should process simple xpaths', () => {
    assertStringValue('val', '/simple/xpath/to/node', 'val');
  });
});

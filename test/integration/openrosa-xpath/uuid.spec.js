const { assertMatch, assertStringLength } = require('../helpers');

describe('#uuid()', () => {
  it('should provide an RFC 4122 version 4 compliant UUID string', () => {
    assertMatch('uuid()',
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('uuid()', () => {
    assertStringLength('uuid()', 36);
  });

  it('should provide variable length token', () => {
    [
      ['uuid()', 36],
      ['uuid(6)', 6],
      ['uuid(16)', 16],
      ['uuid(20)', 20],
    ].forEach(([expr, expectedLength]) => {
      assertStringLength(expr, expectedLength);
    });
  });
});

const { assert } = require('chai');
const { assertMatch, assertStringLength, initDoc } = require('../helpers');

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
      ['uuid(0)', 0],
    ].forEach(([expr, expectedLength]) => {
      assertStringLength(expr, expectedLength);
    });
  });

  describe('referencing nodesets', () => {
    const doc = initDoc(`
      <numbers>
        <one>1</one>
        <two>2</two>
        <six>6</six>
        <ninetynine>99</ninetynine>
      </numbers>
    `);

    [
      [ 'uuid(/numbers/one)', 1 ],
      [ 'uuid(/numbers/two)', 2 ],
      [ 'uuid(/numbers/six)', 6 ],
      [ 'uuid(/numbers/ninetynine)', 99 ],
    ].forEach(([ expr, expectedLength ]) => {
      it(`should evaluate '${expr}' to a ${expectedLength} string`, () => {
        assert.equal(doc.xEval(expr).stringValue.length, expectedLength);
      });
    });

    [
      'uuid(/nonsense)',
      'uuid(/numbers)',
    ].forEach(expr => {
      it(`should throw an error when evaluating '${expr}' because the nodeset evaluates to NaN`, () => {
        assert.throw(() => doc.xEval(expr));
      });
    });
  });
});

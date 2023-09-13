const { assert } = require('chai');
const { assertThrow, assertTrue, assertFalse, initDoc } = require('../helpers');

describe('not', () => {
    it('not()', () => {
        assertFalse('not(true())');
        assertTrue('not(false())');
        assertTrue('not(not(true()))');
        assertFalse('not(not(false()))');
        assertFalse('not(1)');
    });

    it('not() fails when too few arguments are provided', () => {
        assertThrow('not()');
    });

    it('not() fails when too many arguments are provided', () => {
        assertThrow('not(1, 2)');
    });

    describe('referencing nodesets', () => {
        const doc = initDoc(`
      <countries>
        <country>
        </country>
      </countries>
    `);

        [
            ['not(/cities)', true],
            ['not(not(/cities))', false],
            ['not(/countries)', false],
            ['not(not(/countries))', true],
        ].forEach(([expr, expected]) => {
            it(`should evaluate '${expr}' as '${expected}'`, () => {
                assert.equal(doc.xEval(expr).booleanValue, expected);
            });
        });
    });
});

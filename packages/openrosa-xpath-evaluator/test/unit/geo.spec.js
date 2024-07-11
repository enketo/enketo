const { assert } = require('chai');
const { wrapVal } = require('./utils');

const { asGeopoints } = require('../../src/geo');

describe('geo', () => {
    describe('asGeopoints()', () => {
        [
            ['1;2;3', ['1', '2', '3']],
            [['1;2;3'], ['1', '2', '3']],
            [
                ['1', '2', '3'],
                ['1', '2', '3'],
            ],
        ].forEach(([input, expected]) => {
            it(`should convert ${JSON.stringify(input)} to ${JSON.stringify(
                expected
            )}`, () => {
                // given
                const r = wrapVal(input);

                // then
                assert.deepEqual(asGeopoints(r), expected);
            });
        });

        it(`should handle multiple arguments`, () => {
            assert.deepEqual(
                asGeopoints(wrapVal('1'), wrapVal('2'), wrapVal('3')),
                ['1', '2', '3']
            );
        });
    });
});

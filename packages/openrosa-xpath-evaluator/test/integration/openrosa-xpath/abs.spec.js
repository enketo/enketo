const { assertNumberValue } = require('../helpers');

describe('#abs()', () => {
    it('abs', () => {
        assertNumberValue('abs(10.5)', 10.5);
        assertNumberValue('abs(-10.5)', 10.5);
        assertNumberValue('abs("-10.5")', 10.5);
        assertNumberValue('abs("a")', NaN);
    });
});

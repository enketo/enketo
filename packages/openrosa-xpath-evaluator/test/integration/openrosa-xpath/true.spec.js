const { assertThrow, assertTrue } = require('../helpers');

describe('#true()', () => {
    it('should evaluate to true', () => {
        assertTrue('true()');
    });

    it('true() fails when too many arguments are provided', () => {
        assertThrow('true(1)');
    });
});

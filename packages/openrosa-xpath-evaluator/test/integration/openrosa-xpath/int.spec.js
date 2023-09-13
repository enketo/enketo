const { assertNumberValue } = require('../helpers');

const PATH = '/simple/xpath/to/node';

describe('#int()', () => {
    it('should convert a string to an integer', () => {
        assertNumberValue(null, '123', `int(${PATH})`, 123);
    });
    it('should convert a decimal to an integer', () => {
        assertNumberValue(null, '123.456', `int(${PATH})`, 123);
        assertNumberValue('int(2.1)', 2);
        assertNumberValue('int(2.51)', 2);
        assertNumberValue('int(2)', 2);
        assertNumberValue('int("2.1")', 2);
        assertNumberValue('int("2.51")', 2);
        assertNumberValue('int(-1.4)', -1);
        assertNumberValue('int(-1.51)', -1);
        assertNumberValue('int("a")', NaN);
        assertNumberValue('int(7.922021953507237e-12)', 0);
        assertNumberValue('int(1 div 47999799999)', 0);
        assertNumberValue('int("7.922021953507237e-12")', 0);
    });
});

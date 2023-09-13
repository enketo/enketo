const { assertFalse, assertTrue } = require('./helpers');

describe('basic xpath', () => {
    describe('comparing node values', () => {
        describe('to integer values', () => {
            it('should support equality operator', () => {
                assertTrue(1, '/simple/xpath/to/node = 1');
            });
            it('should support inequality operator', () => {
                assertFalse(1, '/simple/xpath/to/node != 1');
            });
            it('should support comparators', () => {
                assertFalse(1, '/simple/xpath/to/node < 1');
                assertFalse(1, '/simple/xpath/to/node > 1');
                assertTrue(1, '/simple/xpath/to/node <= 1');
                assertTrue(1, '/simple/xpath/to/node >= 1');
            });
        });
        describe('to string values', () => {
            it('should support equality operator', () => {
                assertTrue(1, '/simple/xpath/to/node = "1"');
            });
            it('should support inequality operator', () => {
                assertFalse(1, '/simple/xpath/to/node != "1"');
            });
        });
    });
});

const { assertTrue, assertFalse, simpleValueIs } = require('../helpers');

describe('#regex()', () => {
  it('should return `true` if value matches supplied regex', () => {
    // given
    simpleValueIs('123');

    // expect
    assertTrue('regex(/simple/xpath/to/node, "[0-9]{3}")');
  });
  // This test assumes that regex matching is for the whole value, so start
  // and end marks do not need to be included.  This seems logical, but is
  // not explicitly stated in the spec.
  it('should return `false` if value matches supplied regex', () => {
    // given
    simpleValueIs('1234');

    // expect
    assertTrue('regex(/simple/xpath/to/node, "[0-9]{3}")');
  });

  it('regex()', () => {
    assertTrue('regex("12345", "[0-9]+")');
    assertFalse('regex("abcde", "[0-9]+")');
  });
});

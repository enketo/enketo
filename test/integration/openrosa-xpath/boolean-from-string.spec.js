const {assertFalse, assertTrue} = require('../../helpers');

describe('#boolean-from-string()', () => {
  it('boolean-from-string()', () => {
    assertFalse("boolean-from-string('')");
    assertTrue("boolean-from-string(1)");
    assertFalse("boolean-from-string(0)");
    assertTrue("boolean-from-string('1')");
    assertFalse("boolean-from-string('2')");
    assertFalse("boolean-from-string('0')");
    assertTrue("boolean-from-string('true')");
    assertFalse("boolean-from-string('True')");
    assertFalse("boolean-from-string('false')");
    assertFalse("boolean-from-string('whatever')");
    assertFalse("boolean-from-string('nonsense')");
    assertTrue("boolean-from-string(1.0)");
    assertFalse("boolean-from-string(1.0001)");
    assertTrue("boolean-from-string(true())");
  });
});

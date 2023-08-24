const { assertStringValue } = require('../helpers');

describe('digest', () => {
  it('digest', () => {
    [
      ['digest("abc", "MD5", "hex")', '900150983cd24fb0d6963f7d28e17f72'],
      ['digest("abc", "SHA-1", "hex")', 'a9993e364706816aba3e25717850c26c9cd0d89d'],
      ['digest("abc", "SHA-256", "hex")', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
      ['digest("abc", "SHA-256")', 'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0='],
      ['digest("abc", "SHA-256", "base64")', 'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=']
    ].forEach( ([expr, expected]) => {
      assertStringValue(expr, expected);
    });
  });
});

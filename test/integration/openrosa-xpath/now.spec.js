const { assert,initDoc } = require('../../helpers');

  describe('#now()', () => {
    const doc = initDoc('');

    it('should return a timestamp for this instant', () => {
      var before = Date.now(),
          val = doc.xEval('now()').numberValue,
          after = Date.now();

      assert.ok(before <= val && after >= val);
    });
  });

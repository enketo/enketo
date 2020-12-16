const _ = require('lodash');

const { assert, initDoc } = require('../helpers');

describe('#random()', () => {
  const doc = initDoc('');

  it('should return a number', () => {
    var vals = [];
    _.times(10, () => {
      // when
      var val = doc.xEval('random()').numberValue;

      // then
      assert.typeOf(val, 'number');

      vals.push(val);
    });

    // check the numbers are a bit random
    assert.equal(_.uniq(vals).length, vals.length);
  });

  it('random()', () => {
    assert.match(doc.xEval('random()').numberValue, /0\.[0-9]{12,}/);
  });
});

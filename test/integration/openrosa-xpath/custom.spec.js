const { assert } = require('chai');

const ORXE = require('../../../src/openrosa-xpath');

describe('custom XPath functions', () => {
  const evaluator = new ORXE();

  it('should not allow unexpected arg types', () => {
    assert.throws(
      () => evaluator.customXPathFunction.add('f', {
        fn: () => {},
        args: [ { t:'string' }, { t:'number' }, { t:'boolean' }, { t:'dog' } ],
        ret: 'number',
      }),
      `Unsupported arg type(s): 'dog'`
    );
  });

  it('should not allow unexpected return types', () => {
    assert.throws(
      () => evaluator.customXPathFunction.add('f', {
        fn: () => {},
        args: [],
        ret: 'fish',
      }),
      `Unsupported return type: 'fish'`
    );
  });

  it('should not allow overriding existing functions', () => {
    assert.throws(
      () => evaluator.customXPathFunction.add('cos', { fn:() => {}, args:[], ret:'string' }),
      `There is already a function with the name: 'cos'`,
    );
  });

  it('should not allow overriding existing custom functions', () => {
    // given
    evaluator.customXPathFunction.add('f', { fn:() => {}, args:[], ret:'string' }),

    // expect
    assert.throws(
      () => evaluator.customXPathFunction.add('f', { fn:() => {}, args:[], ret:'string' }),
      `There is already a function with the name: 'f'`,
    );
  });

  describe('pad2()', () => {
    evaluator.customXPathFunction.add('pad2', {
      fn: a => a.padStart(2, '0'),
      args: [ { t:'string' } ],
      ret: 'string',
    });

    [
      [   '""',   '00' ],
      [  '"1"',   '01' ],
      [ '"11"',   '11' ],
      [ '"111"', '111' ],
      [      0,   '00' ],
      [      1,   '01' ],
      [     11,   '11' ],
      [    111,  '111' ],
    ].forEach(([ input, expectedOutput ]) => {
      it(`should convert ${input} to '${expectedOutput}'`, () => {
        // when
        const actualOutput = evaluator.evaluate(`pad2(${input})`);

        // then
        assert.deepEqual(actualOutput, { resultType:2, stringValue:expectedOutput });
      });
    });

    it('should throw if too few args are provided', () => {
      assert.throws(
        () => evaluator.evaluate('pad2()'),
        'Function "pad2" expected 1 arg(s), but got 0',
      );
    });

    it('should throw if too many args are provided', () => {
      assert.throws(
        () => evaluator.evaluate('pad2("1", 2)'),
        'Function "pad2" expected 1 arg(s), but got 2',
      );
    });
  });
});

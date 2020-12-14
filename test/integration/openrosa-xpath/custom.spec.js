const {initDoc, assert} = require('../../helpers');

// TODO need to test this differently - with the actual orxe.min.js loaded.
describe.skip('custom XPath functions', () => {
  const doc = initDoc(`<div id="FunctionCustom"></div>`);
  const node = doc.getElementById('FunctionCustom');
  const obj = { status: 'good' };
  node.textContent = JSON.stringify(obj);
  const evaluator = doc.evaluator;

  afterEach( () => {
    evaluator.customXPathFunction.remove('comment-status');
  });

  it('can be added', () => {
    const test1 = () => evaluator.evaluate('comment-status(.)', node, null, XPathResult.STRING_TYPE, null);

    // Check the function doesn't exist before.
    assert.throw(test1, /Failed to execute/);

    // Add custom function
    evaluator.customXPathFunction.add('comment-status', function(a) {
      if(arguments.length !== 1) throw new Error('Invalid args');
      const curValue = a.v[0]; // {t: 'arr', v: [{'status': 'good'}]}
      const status = JSON.parse(curValue).status;
      return new evaluator.customXPathFunction.type.StringType(status);
    });

    // Check functioning:
    assert.equal(test1().stringValue, obj.status);

    // Check parameter errors:
    const test2 = () => {
      evaluator.evaluate('comment-status(., 2)', node, null, XPathResult.STRING_TYPE, null);
    };
    assert.throw(test2);
  });
});

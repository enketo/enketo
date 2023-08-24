const { assert } = require('chai');
const { initDoc } = require('./helpers');

describe('Attribute context nodes', () => {
  /** @type {XMLDocument} */
  let document;

  beforeEach(() => {
    document = initDoc(/* xml */ `
      <model>
        <instance>
          <data>
            <q1 q1attr="">q1 value</q1>
            <q2 q2attr="">2</q2>
            <q3 q3attr="">q3 value</q3>
            <q4 q4attr="3">4</q4>
          </data>
        </instance>
        <instance id="secondary1">
          <data>
            <item1 item1attr="">item value</item1>
            <item2 item2attr="">5</item2>
          </data>
        </instance>
        <instance id="secondary2">
          <model>
            <instance unusual="">But testing it just in case!</instance>
          </model>
        </instance>
      </model>
    `);
  });

  const getAttr = (attrName) => (
    document.evaluate(`//@${attrName}`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue
  );

  it('evaluates an absolute nodeset value from a primary instance when providing an attribute as the context node', () => {
    const attr = getAttr('q1attr');
    const value = document.evaluate('/model/instance[1]/data/q1', attr, null, XPathResult.STRING_TYPE).stringValue;

    assert.equal(value, 'q1 value');
  });

  it('evaluates an absolute nodeset subexpression from a primary instance when providing an attribute as the context node', () => {
    const attr = getAttr('q2attr');
    const value = document.evaluate(' ( /model/instance[1]/data/q2 * 2 ) ', attr, null, XPathResult.NUMBER_TYPE).numberValue;

    assert.equal(value, 4);
  });

  it('evaluates an absolute nodeset value from any instance when providing an attribute as the context node', () => {
    const attr = getAttr('q1attr');
    const value = document.evaluate('/model/instance/data/q1', attr, null, XPathResult.STRING_TYPE).stringValue;

    assert.equal(value, 'q1 value');
  });

  it('evaluates an absolute nodeset subexpression from any instance when providing an attribute as the context node', () => {
    const attr = getAttr('q2attr');
    const value = document.evaluate(' ( /model/instance/data/q2 * 2 ) ', attr, null, XPathResult.NUMBER_TYPE).numberValue;

    assert.equal(value, 4);
  });

  it('evaluates a relative nodeset value when providing an attribute as the context node', () => {
    const attr = getAttr('q3attr');
    const value = document.evaluate(' .. ', attr, null, XPathResult.STRING_TYPE).stringValue;

    assert.equal(value, 'q3 value');
  });

  it('evaluates a relative nodeset value when providing an attribute as the context node', () => {
    const attr = getAttr('q4attr');
    const value = document.evaluate(' 4 * .. ', attr, null, XPathResult.NUMBER_TYPE).numberValue;

    assert.equal(value, 16);
  });

  it('evaluates an absolute nodeset value from a secondary instance when providing an attribute as the context node', () => {
    const attr = getAttr('item1attr');
    const value = document.evaluate(' /model/instance[ @id = "secondary1" ]/data/item1', attr, null, XPathResult.STRING_TYPE).stringValue;

    assert.equal(value, 'item value');
  });

  it('evaluates an absolute nodeset subexpression from a secondary instance when providing an attribute as the context node', () => {
    const attr = getAttr('item2attr');
    const value = document.evaluate(' ( /model/instance[ @id = "secondary1" ]/data/item2 * 5 ) ', attr, null, XPathResult.NUMBER_TYPE).numberValue;

    assert.equal(value, 25);
  });

  it('evaluates an absolute nodeset value from a nodeset path with nested model/instance elements', () => {
    const attr = getAttr('unusual');
    const value = document.evaluate(' /model/instance[ @id = "secondary2" ]/model/instance', attr, null, XPathResult.STRING_TYPE).stringValue;

    assert.equal(value, 'But testing it just in case!');
  });

  it('evaluates an absolute nodeset referencing a wildcard node', () => {
    const attr = getAttr('q1attr');
    const value = document.evaluate('/*/*/*/*', attr, null, XPathResult.STRING_TYPE).stringValue;

    assert.equal(value, 'q1 value');
  });

  it('evaluates a descendant nodeset', () => {
    const attr = getAttr('q1attr');
    const value = document.evaluate('//q1', attr, null, XPathResult.STRING_TYPE).stringValue;

    assert.equal(value, 'q1 value');
  });
});

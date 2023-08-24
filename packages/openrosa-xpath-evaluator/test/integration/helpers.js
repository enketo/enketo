const { assert } = require('chai');
const OpenRosaXpath = require('../../src/openrosa-xpath');
const { toDbgString } = require('../dbg');

let xEval;

const nsResolver = {
  lookupNamespaceURI: prefix => {
    var ns = {
      'xhtml' : 'http://www.w3.org/1999/xhtml',
      'mathml': 'http://www.w3.org/1998/Math/MathML',
      'jr': 'http://openrosa.org/javarosa'
    };
    return ns[prefix];
  },
};

const initDoc = (xml, nsr) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const evaluator = OpenRosaXpath();
  xEval = function(e, xnode, xrt) {
    const node = xnode || doc;
    const rt = xrt || XPathResult.ANY_TYPE;
    return evaluator.evaluate(e, node, nsr, rt);
  };
  doc.evaluate = evaluator.evaluate;
  doc.xEval = xEval;
  return doc;
};

const simpleValueIs = (textValue) => {
  return initDoc(`<simple><xpath><to>
             <node>${textValue}</node>
           </to></xpath><empty/></simple>`);
};

const initBasicXmlDoc = () => simpleValueIs('');

const assertTrue = (...args) => {
  const regex = args[args.length - 1];
  if(args.length > 1 && args[args.length - 2]) {
    simpleValueIs(args[args.length - 2]);
  }
  const node = args.length > 2 ? args[args.length - 3] : null;
  assert.isTrue(xEval(regex, node, XPathResult.BOOLEAN_TYPE).booleanValue);
};

const assertFalse = (...args) => {
  const regex = args[args.length - 1];
  if(args.length > 1 && args[args.length - 2]) {
    simpleValueIs(args[args.length - 2]);
  }
  const node = args.length > 2 ? args[args.length - 3] : null;
  assert.isFalse(xEval(regex, node, XPathResult.BOOLEAN_TYPE).booleanValue);
};

const assertBoolean = (...args) => {
  const value = args.pop();
  if(value) {
    assertTrue(...args);
  } else {
    assertFalse(...args);
  }
};

const assertString = (...args) => {
  const expected = args[args.length -1];
  const regex = args[args.length - 2];
  if(args.length > 2 && args[args.length - 3]) {
    simpleValueIs(args[args.length - 3]);
  }
  const node = args.length > 3 ? args[args.length - 4] : null;
  assert.equal(xEval(regex, node, XPathResult.STRING_TYPE).stringValue, expected);
};

const assertStringValue = (...args) => {
  const expected = args[args.length -1];
  const regex = args[args.length - 2];
  if(args.length > 2 && args[args.length - 3]) {
    simpleValueIs(args[args.length - 3]);
  }
  const node = args.length > 3 ? args[args.length - 4] : null;
  assert.equal(xEval(regex, node, XPathResult.STRING_TYPE).stringValue, expected);
};

const assertStringLength = (...args) => {
  const expected = args[args.length -1];
  const regex = args[args.length - 2];
  if(args.length > 2 && args[args.length - 3]) {
    simpleValueIs(args[args.length - 3]);
  }
  const node = args.length > 3 ? args[args.length - 4] : null;
  assert.equal(xEval(regex, node, XPathResult.STRING_TYPE).stringValue.length, expected);
};

const assertMatch = (...args) => {
  const expected = args[args.length -1];
  const regex = args[args.length - 2];
  if(args.length > 2 && args[args.length - 3]) {
    simpleValueIs(args[args.length - 3]);
  }
  const node = args.length > 3 ? args[args.length - 4] : null;
  assert.match(xEval(regex, node, XPathResult.STRING_TYPE).stringValue, expected);
};

const assertNumber = (...args) => {
  const expected = args[args.length -1];
  const regex = args[args.length - 2];
  if(args.length > 2 && args[args.length - 3]) {
    simpleValueIs(args[args.length - 3]);
  }
  const node = args.length > 3 ? args[args.length - 4] : null;
  const actual = xEval(regex, node).numberValue;
  if(isNaN(expected)) {
    assert.isNaN(actual);
  } else {
    assert.equal(actual, expected);
  }
};
const assertNumberValue = (...args) => {
  const expected = args[args.length -1];
  const regex = args[args.length - 2];
  if(args.length > 2 && args[args.length - 3]) {
    simpleValueIs(args[args.length - 3]);
  }
  const node = args.length > 3 ? args[args.length - 4] : null;
  const actual = xEval(regex, node, XPathResult.NUMBER_TYPE).numberValue;
  if(isNaN(expected)) {
    assert.isNaN(actual);
  } else {
    assert.equal(actual, expected);
  }
};

beforeEach(() => {
  initBasicXmlDoc();
});

const getNextChildElementNode = (parentNode) => {
  let childNode = parentNode.firstChild;
  while (childNode.nodeName == '#text') {
    childNode = childNode.nextSibling;
  }
  return childNode;
};

const setAttribute = (node, namespace, name, value) => {
  if (node.setAttributeNS) {
    // for XML documents
    node.setAttributeNS(namespace, name, value);
  } else {
    // normal HTML documents
    node.setAttribute(name, value);
  }
};

const getAllNodes = (node) => {
  let nodes = [], i;
  nodes.push(node);
  for (i = 0; i < node.childNodes.length; i++) {
    nodes.push.apply(nodes, getAllNodes(node.childNodes.item(i)));
  }
  return nodes;
};

const filterAttributes = (attributes) => {
  var i, name, specifiedAttributes = [];

  for(i = 0; i < attributes.length; i++) {
    name = attributes[i].nodeName.split(':');
    if (name[0] === 'xmlns') {
      // ignore namespaces
      continue;
    }

    specifiedAttributes.push(attributes[i]);
  }
  return specifiedAttributes;
};

const assertNodes = (expr, node, expected, nsr) => {
  var result = xEval(expr, node, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, nsr);
  assert.equal(result.snapshotLength, expected.length);
  for(let j = 0; j < result.snapshotLength; j++) {
    const item = result.snapshotItem(j);
    assert.equal(item, expected[j], `expected: ${toDbgString(expected[j])}, got: ${toDbgString(item)}`);
  }
};

const sorted = (nodes) => {
  return nodes.sort((a, b) => {
    if (a.nodeName > b.nodeName) return 1;
    if (a.nodeName < b.nodeName) return -1;
    return 0;
  });
};

const snapshotItems = (result) => {
  const all = [];
  for(let j = 0; j < result.snapshotLength; j++) {
    all.push(result.snapshotItem(j));
  }
  return all;
};

// Compares nodes and ignores node and attribute order
const assertUnorderedNodes = (expr, node, expected) => {
  const result = xEval(expr, node, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  assert.equal(result.snapshotLength, expected.length);
  const resultNodes = sorted(snapshotItems(result));
  const expectedNodes = sorted(expected);
  for(let j = 0; j < resultNodes.length; j++) {
    assert.equal(resultNodes[j].nodeName, expectedNodes[j].nodeName);
  }
};

const snapshotToArray = (result) => {
  var i, nodes = [];
  for (i = 0; i < result.snapshotLength; i++) {
    nodes.push(result.snapshotItem(i));
  }
  return nodes;
};

const assertThrow = (expr) => {
  assert.throw(() => xEval(expr), Error);
};

const assertNumberRounded = (expr, expected, factor, node) => {
  var val = xEval(expr, node, XPathResult.NUMBER_TYPE).numberValue;
  assert.equal(Math.round(val * factor)/factor, expected);
};

module.exports = {
  initDoc,
  nsResolver,
  simpleValueIs,
  filterAttributes,
  getNextChildElementNode,
  getAllNodes,
  snapshotToArray,
  setAttribute,
  assert,
  assertThrow,
  assertNumberValue,
  assertNumberRounded,
  assertNumber,
  assertString,
  assertStringValue,
  assertStringLength,
  assertMatch,
  assertBoolean,
  assertFalse,
  assertTrue,
  assertNodes,
  assertUnorderedNodes
};

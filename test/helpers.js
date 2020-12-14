const assert = chai.assert;
const engine = require('../src/engine');

let doc, xEval, evaluator, nsr, rt, node, docs = [];

const _document = (line) => {
  docs += line + '\n';
};

const nsResolver = (prefix) => {
  var ns = {
    'xhtml' : 'http://www.w3.org/1999/xhtml',
    'mathml': 'http://www.w3.org/1998/Math/MathML',
    'jr': 'http://openrosa.org/javarosa'
  };
  return ns[prefix] || null;
};

const initDoc = (xml, xnsr) => {
  doc = new DOMParser().parseFromString(xml, 'application/xml');
  node = null;
  nsr = xnsr;
  evaluator = new engine.XPathEvaluator();
  xEval = function(e, xnode, xrt, xnsr) {
    node = xnode || doc;
    rt = xrt;
    _document(e);
    return evaluator.evaluate(e, node, xnsr || nsr, rt, null);
  };
  doc.evaluator = evaluator;
  doc.xEval = xEval;
  return doc;
};

const simpleValueIs = (textValue) => {
  initDoc(`<simple><xpath><to>
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
  assert.equal(xEval(regex, node).stringValue, expected);
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

before(() => {
  docs = [];
  _document('## Supported XPath expressions:');
  _document('');
});

// Capture all tested functions/docs
// after(() => {
//   console.log(docs);
// });

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
    if(!attributes[i].specified) {
      // ignore non-specified attributes
      continue;
    }

    name = attributes[i].nodeName.split(':');
    if (name[0] === 'xmlns') {
      // ignore namespaces
      continue;
    }

    specifiedAttributes.push(attributes[i]);
  }
  return specifiedAttributes;
};

const assertNodesNamespace = (expr, node, expected) => {
  const result = xEval(expr, node, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  assert.equal(result.snapshotLength, expected.length);
  expected = sortedNamespaces(expected);
  for(let j = 0; j < result.snapshotLength; j++) {
    const item = result.snapshotItem(j);
    assert.equal(item.nodeName, '#namespace');
    assert.equal(item.localName, expected[j][0]);
    assert.equal(item.namespaceURI, expected[j][1]);
  }
};

const assertNodes = (expr, node, expected, nsr) => {
  var result = xEval(expr, node, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, nsr);
  assert.equal(result.snapshotLength, expected.length);
  for(let j = 0; j < result.snapshotLength; j++) {
    const item = result.snapshotItem(j);
    assert.equal(item, expected[j]);
  }
};

const sorted = (nodes) => {
  return nodes.sort((a, b) => {
    if (a.nodeName > b.nodeName) return 1;
    if (a.nodeName < b.nodeName) return -1;
    return 0;
  });
};

const sortedNamespaces = (namespaces) => {
  return namespaces.sort((ns1, ns2) => {
    if(ns1[0] > ns2[0]) {return 1;}
    if(ns1[0] < ns2[0]) {return -1;}
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

const parseNamespacesFromAttributes = (attributes, namespaces) => {
  var i, name;

  for (i = attributes.length - 1; i >= 0; i--) {
    name = attributes.item(i).nodeName.split(':');

    if (name[0] === 'xmlns') {
      if (name.length == 1) {
        namespaces.unshift(['', attributes.item(i).nodeValue]);
      } else {
        namespaces.push([name[1], attributes.item(i).nodeValue]);
      }
    }
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
  parseNamespacesFromAttributes,
  sortedNamespaces,
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
  assertNodesNamespace,
  assertUnorderedNodes
};

var {toSnapshotResult} = require('./result');

function namespace(input, cN) {
  var nsId = input.substring(11);
  var xnamespaces = [];
  var xitems = [];
  if(cN.attributes) {
    for(var ii=0; ii<cN.attributes.length; ii++) {
      var xattr = cN.attributes[ii];
      var xitem = xattr.ownerElement.getAttributeNode(xattr.name);
      if(xitem.nodeName === 'xmlns:'+nsId) {
        xitems.push(xitem);
        xnamespaces.push({
          nodeName: '#namespace',
          localName: nsId,
          namespaceURI: xitem.nodeValue
        });
      }
    }
  }
  return toSnapshotResult(xnamespaces);
}

function namespaceNode(cN) {
  var namespaces = [];
  var namespaceKeys = {};
  var items = [];
  var node = cN;
  while(node) {
    if(node.attributes) {
      for(var j=0; j<node.attributes.length; j++) {
        var attr = node.attributes[j];
        var item = attr.ownerElement.getAttributeNode(attr.name);
        if(item.nodeName.startsWith('xmlns') && !namespaceKeys[item.nodeName]) {
          var names = item.nodeName.split(':');
          namespaceKeys[item.nodeName] = item.nodeName;
          if(item.nodeValue.length) {
            items.push(item);
            namespaces.push({
              nodeName: '#namespace',
              localName: names.length > 1 ? names[1] : '',
              namespaceURI: item.nodeValue
            });
          }
        }
      }
    }
    node = cN.nodeType === 1 ? node.parentNode : null;
  }
  if(namespaces.length > 0 && !namespaceKeys.xmlns) {
    namespaces.push({nodeName: '#namespace', localName: 'xmlns', namespaceURI: 'http://www.w3.org/1999/xhtml'});
  }
  if(namespaces.length > 0 && !namespaceKeys.xml) {
    namespaces.push({nodeName: '#namespace', localName: 'xml', namespaceURI: 'http://www.w3.org/XML/1998/namespace'});
  }
  namespaces = namespaces.sort(function(n1, n2){
    if(n1.localName < n2.localName){ return -1;}
    if(n1.localName > n2.localName){ return 1;}
    return 0;
  });
  return toSnapshotResult(namespaces, 7, items[0]);
}

function isNamespaceExpr(input) {
  return /^(namespace::node\(\)|namespace::\*)$/.test(input)
    || /^namespace::/.test(input);
}

function handleNamespaceExpr(input, cN) {
  if(/^(namespace::node\(\)|namespace::\*)$/.test(input)) {
    return namespaceNode(cN);
  }

  if(/^namespace::/.test(input)) {
    return namespace(input, cN);
  }
}

module.exports = {
  isNamespaceExpr,
  handleNamespaceExpr
};

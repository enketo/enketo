var sortByDocumentOrder = require('./sort-by-document-order');

module.exports = { toSnapshotResult };

function toSnapshotResult(arr, resultType, singleItem) {
  if( resultType === XPathResult.ORDERED_NODE_ITERATOR_TYPE ||
      resultType === XPathResult.ORDERED_NODE_SNAPSHOT_TYPE) {
    sortByDocumentOrder(arr);
  }

  return (nodes => {
    let idx = 0;
    return {
      resultType,
      singleNodeValue: singleItem || nodes[0] || null,
      snapshotLength: nodes.length,
      snapshotItem: i => nodes[i] || null,
      iterateNext: () => nodes[idx++] || null,
    };
  })(arr.v);
}

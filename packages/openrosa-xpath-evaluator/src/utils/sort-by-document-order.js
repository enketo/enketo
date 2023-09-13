module.exports = function (ir) {
    if (ir.ordrd) return;
    ir.v.sort(byDocumentOrder);
};

function byDocumentOrder(a, b) {
    const compare = a.compareDocumentPosition(b);
    // eslint-disable-next-line no-bitwise -- expected usage
    if (compare & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
    }
    // eslint-disable-next-line no-bitwise -- expected usage
    if (compare & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
    }
    return 0;
}

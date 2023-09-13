module.exports = { dbg, toDbgString };

function dbg(...args) {
    console.log(args.map(toDbgString));
}

function nodePath(node) {
    if (node === null) return '';
    if (node === undefined) return 'indescribable'; // probably running unit tests
    return nodePath(node.parentNode) + describe(node);
}

function describe(node) {
    if (node instanceof Attr) {
        return `@${node.nodeName}=${node.value}`;
    }
    if (node instanceof Document) {
        return node.nodeName;
    }
    return `/${node.nodeName}`;
}

function toDbgString(arg) {
    if (arg === null || arg === undefined) return arg;
    if (arg instanceof Node) return nodePath(arg);
    if (typeof arg === 'function') return `(function:${arg.name})`;
    if (typeof arg !== 'object') return arg.toString();
    if (Array.isArray(arg)) return arg.map(toDbgString).toString();
    if (arg.t === 'arr') {
        const { t, v } = arg;
        return JSON.stringify({ t, v: v.map(nodePath) });
    }
    return JSON.stringify(arg);
}

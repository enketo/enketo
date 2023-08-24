import type { Element } from './Element';
import type { Node } from './Node';
import type { XPathResult } from './XPathResult';

/** @package */
export interface Document {
    readonly documentElement: Element;
    readonly nodeName: string;
    readonly nodeType: number;
    readonly ownerDocument: Document | null;
    readonly parentElement: Element | null;
    readonly textContent: string | null;

    cloneNode(deep?: boolean): Node;
    createElement(name: string): Element;
    createElementNS(namespaceURI: string | null, name: string): Element;
    evaluate(
        xpathExpression: string,
        contextNode: Node,
        namespaceResolver: NamespaceResolver | null,
        resultType: number
    ): XPathResult;
}

import type { Attr } from './Attr';
import type { Node } from './Node';

interface NamedNodeMap {
    [Symbol.iterator](): IterableIterator<Attr>;
}

/** @package */
export interface Element extends Node {
    readonly attributes: NamedNodeMap;
    readonly firstChild: Node | null;
    readonly firstElementChild: Element | null;
    readonly localName: string;
    readonly nodeName: string;
    readonly outerHTML: string;
    append(...nodes: Array<string | Node>): void;
    getAttribute(name: string): string | null;
    hasAttribute(name: string): boolean;
    insertAdjacentHTML(position: 'afterend', html: string): void;
    remove(): void;
    removeAttribute(name: string): void;
    replaceWith(...nodes: Array<string | Node>): void;
    setAttribute(name: string, value: string): void;
    setAttributeNS(
        namespaceURI: string | null,
        name: string,
        value: string
    ): void;
}

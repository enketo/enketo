import type { Node } from 'libxmljs';
import { libxmljs } from 'libxslt';
import type { DOM } from '../abstract';
import { NodeTypes } from '../shared';

const { Element, Document } = libxmljs;

Object.assign(libxmljs, {
    Node: NodeTypes,
});

/** @package */
export class DOMExtendedNode implements DOM.Node {
    get nodeName() {
        return (this as unknown as Node & DOMExtendedNode).name();
    }

    get nodeType() {
        const type = (this as unknown as Node & DOMExtendedNode).type();

        switch (type) {
            case 'attribute': {
                return NodeTypes.ATTRIBUTE_NODE;
            }

            case 'comment': {
                return NodeTypes.COMMENT_NODE;
            }

            case 'document': {
                return NodeTypes.DOCUMENT_NODE;
            }

            case 'element': {
                return NodeTypes.ELEMENT_NODE;
            }

            case 'text': {
                return NodeTypes.TEXT_NODE;
            }

            default: {
                throw new Error(`Unknown node type: `);
            }
        }
    }

    get ownerDocument() {
        if (this.nodeType === NodeTypes.DOCUMENT_NODE) {
            return this as unknown as Document;
        }

        return (this as unknown as DOMExtendedNode & Node).doc();
    }

    get parentElement() {
        return (
            this as unknown as DOMExtendedNode & Node
        ).parent() as Element | null;
    }

    get textContent(): string | null {
        return (this as unknown as DOMExtendedNode & Node).text();
    }

    set textContent(value: string) {
        (this as unknown as DOMExtendedNode & Node).text(value);
    }

    cloneNode<T extends Node>(
        this: DOMExtendedNode & T,
        deep = false
    ): DOMExtendedNode & T {
        return this.clone(deep);
    }
}

/* eslint-disable @typescript-eslint/no-redeclare */
type Document = InstanceType<typeof Document>;
type Element = InstanceType<typeof Element>;
/* eslint-enable @typescript-eslint/no-redeclare */

const { constructor: _, ...descriptors } = Object.getOwnPropertyDescriptors(
    DOMExtendedNode.prototype
);

[Element, Document].forEach((Constructor) => {
    Object.assign(Constructor, NodeTypes);
    Object.defineProperties(Constructor.prototype, descriptors);
});

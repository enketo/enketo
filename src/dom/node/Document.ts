import { libxmljs } from 'libxslt';
import { NAMESPACES } from '../../shared';
import type { DOM } from '../abstract';
import { NodeTypes } from '../shared';
import { XPathResult } from './XPathResult';

type Node = typeof libxmljs.Node;

const { Document, Element } = libxmljs;

/** @package */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DOMExtendedDocument extends DOM.Node {}

export class DOMExtendedDocument implements DOM.Document {
    get documentElement() {
        return (this as any as DOMExtendedDocument & Document).root();
    }

    readonly nodeName = '#document';

    readonly nodeType = NodeTypes.DOCUMENT_NODE;

    createElement(this: DOMExtendedDocument & Document, name: string): Element {
        return new Element(this, name);
    }

    createElementNS(
        this: DOMExtendedDocument & Document,
        namespaceURI: string | null,
        name: string
    ): Element {
        const [prefix, suffix] = name.split(':');

        const element = new Element(this, suffix ?? name);

        if (suffix == null || namespaceURI == null) {
            return element;
        }

        const namespace = element.defineNamespace(prefix, namespaceURI);

        element.namespace(namespace);

        return element;
    }

    evaluate(
        this: Document & DOMExtendedDocument,
        xpathExpression: string,
        contextNode: Document | Element,
        namespaceResolver: DOM.NamespaceResolver | null,
        resultType: number
    ): DOM.XPathResult {
        const namespaces =
            namespaceResolver == null
                ? undefined
                : Object.fromEntries(
                      Object.entries(NAMESPACES).filter(
                          ([prefix, value]) =>
                              namespaceResolver.lookupNamespaceURI(prefix) ===
                              value
                      )
                  );

        if (resultType === XPathResult.FIRST_ORDERED_NODE_TYPE) {
            const result = (contextNode ?? this).get(
                xpathExpression,
                namespaces
            ) as (Node & DOM.Node) | null;
            const results = result == null ? [] : [result];

            return new XPathResult(results);
        }

        const results = (contextNode ?? this).find(
            xpathExpression,
            namespaces
        ) as Array<Node & Element & DOM.Node>;

        return new XPathResult(results);
    }
}

/* eslint-disable @typescript-eslint/no-redeclare */
type Document = InstanceType<typeof Document>;
type Element = InstanceType<typeof Element>;
/* eslint-enable @typescript-eslint/no-redeclare */

const { constructor: _, ...descriptors } = Object.getOwnPropertyDescriptors(
    DOMExtendedDocument.prototype
);

Object.defineProperties(Document.prototype, descriptors);

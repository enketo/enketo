import type { Node } from 'libxmljs';
import { libxmljs } from 'libxslt';
import type { DOM } from '../abstract';
import { NodeTypes } from '../shared';

const { Element, parseXml } = libxmljs;

/** @package */
export interface DOMExtendedElement extends DOM.Node {
    remove(): void;
}

export class DOMExtendedElement implements DOM.Element {
    readonly nodeType = NodeTypes.DOCUMENT_NODE;

    get attributes() {
        return (this as any as DOMExtendedElement & Element)
            .attrs()
            .map((attr) => ({
                name: attr.name(),
                namespaceURI: null,
                value: attr.value() ?? '',
            }));
    }

    get firstChild() {
        return (this as any as DOMExtendedElement & Element).child(0) ?? null;
    }

    get firstElementChild(): Element | null {
        return (this as any as DOMExtendedElement & Element).get('*') ?? null;
    }

    get localName() {
        const prefix = (this as any as Element).namespace()?.prefix();

        if (prefix == null) {
            return this.nodeName;
        }

        return this.nodeName.replace(`${prefix}:`, '');
    }

    get nodeName() {
        return (this as any as Element).name();
    }

    get outerHTML() {
        return (this as any as Element).toString(false);
    }

    append(this: DOMExtendedElement & Element, ...nodes: Node[]) {
        nodes.forEach((node) => {
            this.addChild(node);
        });
    }

    getAttribute(this: DOMExtendedElement & Element, name: string) {
        return this.attr(name)?.value() ?? null;
    }

    hasAttribute(this: Element & DOMExtendedElement, name: string) {
        return this.attr(name) != null;
    }

    insertAdjacentHTML(
        this: Element & DOMExtendedElement,
        _position: 'afterend',
        html: string
    ) {
        const childNodes = parseXml(`<root>${html}</root>`).find('/root/*');

        childNodes.forEach((node) => {
            this.addNextSibling(node);
        });
    }

    replaceWith(this: Element & DOMExtendedElement, ...nodes: Node[]) {
        nodes.forEach((node) => {
            this.addPrevSibling(node);
        });

        this.remove();
    }

    removeAttribute(this: DOMExtendedElement & Element, name: string): void {
        this.attr(name)?.remove();
    }

    setAttribute(
        this: DOMExtendedElement & Element,
        name: string,
        value: string
    ) {
        this.attr(name, value);
    }

    setAttributeNS(
        this: DOMExtendedElement & Element,
        _namespaceURI: string | null,
        name: string,
        value: string
    ) {
        this.attr(name, value);
    }
}

/* eslint-disable @typescript-eslint/no-redeclare */
type Element = InstanceType<typeof Element>;
/* eslint-enable @typescript-eslint/no-redeclare */

const { constructor: _, ...descriptors } = Object.getOwnPropertyDescriptors(
    DOMExtendedElement.prototype
);

Object.defineProperties(Element.prototype, descriptors);

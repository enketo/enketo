/* eslint-disable max-classes-per-file */
declare module 'libxmljs' {
    export interface Namespace {
        href(): string;
        prefix(): string;
    }

    export class Node {
        addNextSibling(sibling: Node): this;
        addPrevSibling(sibling: Node): this;

        /**
         * @param deep defaults to `true`
         */
        clone(deep?: boolean): this;

        doc(): Document;
        name(): string;
        namespaces(): Namespace[];
        parent(): Node | null;
        remove(): this;
        replace(node: Node): unknown;
        text(): string;
        text(value: string): this;
        toString(format?: boolean): string;
        type(): 'attribute' | 'comment' | 'document' | 'element' | 'text';
    }

    export class Attr extends Node {
        value(): string | null;
        value(value: string): this;
    }

    class ParentNode extends Node {
        addChild(child: Node): this;
        attrs(): Attr[];
        child(index: number): Node;
        childNodes(): Node[];

        get(
            expression: string,
            namespaces?: Record<string, string>
        ): Element | null;

        find(
            expression: string,
            namespaces?: Record<string, string>
        ): Element[];

        node(localName: string): this;
    }

    export class Element extends ParentNode {
        constructor(document: Document, name: string);
        attr(name: string): Attr | null;
        attr(name: string, value: string): Element;
        attr(attributes: Record<string, string>): Element;
        defineNamespace(namespceURI: string, prefix: string): Namespace;
        namespace(): Namespace | null;
        namespace(uri: string): this;
        namespace(namespace: Namespace): Element;
    }

    export class Document extends ParentNode {
        root(): Element;
    }

    export const parseXml: (xml: string) => Document;

    export const parseHtmlFragment: (html: string) => Document;
}

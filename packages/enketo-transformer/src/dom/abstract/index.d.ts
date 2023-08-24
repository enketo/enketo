import type { Attr as AbstractAttr } from './Attr';
import type { Document as AbstractDocument } from './Document';
import type { DOMParser as AbstractDOMParser } from './DOMParser';
import type { Element as AbstractElement } from './Element';
import type { Node as AbstractNode } from './Node';
import type {
    NamespaceResolver as AbstractNamespaceResolver,
    XPathResult as AbstractXPathResult,
    XPathResultType as AbstractXPathResultType,
} from './XPathResult';
import type { XSLTProcessor as AbstractXSLTProcessor } from './XSLTProcessor';

/** @package */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DOM {
    export type Attr = AbstractAttr;
    export type Document = AbstractDocument;
    export type DOMParser = AbstractDOMParser;
    export type NamespaceResolver = AbstractNamespaceResolver;
    export type Node = AbstractNode;
    export type Element = AbstractElement;
    export type XPathResult = AbstractXPathResult;
    export type XPathResultType = AbstractXPathResultType;
    export type XSLTProcessor = AbstractXSLTProcessor;
}

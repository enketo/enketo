import { DOMExtendedDocument } from './Document';
import { DOMExtendedElement } from './Element';
import { DOMExtendedNode } from './Node';
import { NodeTypes } from '../shared';

declare module 'libxmljs' {
    /* eslint-disable @typescript-eslint/no-empty-interface */
    export interface Document extends DOMExtendedDocument {}
    export interface Element extends DOMExtendedElement {}
    export interface Node extends DOMExtendedNode {}
    namespace Node {
        export const {
            ELEMENT_NODE,
            ATTRIBUTE_NODE,
            TEXT_NODE,
            CDATA_SECTION_NODE,
            PROCESSING_INSTRUCTION_NODE,
            COMMENT_NODE,
            DOCUMENT_NODE,
            DOCUMENT_TYPE_NODE,
            DOCUMENT_FRAGMENT_NODE,
        } = NodeTypes;
    }
    /* eslint-enable @typescript-eslint/no-empty-interface */
}

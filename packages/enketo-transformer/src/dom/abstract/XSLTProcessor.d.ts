import type { Document } from './Document';
import type { Node } from './Node';

/** @package */
export interface XSLTProcessor {
    importStylesheet(style: Node): void;
    reset(): void;
    setParameter(namespaceURI: string | null, name: string, value: any): void;
    transformToDocument(source: Node): Document;
}

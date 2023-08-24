import type { Document } from './Document';
import type { Element } from './Element';

/** @package */
export interface Node {
    readonly nodeType: number;
    readonly ownerDocument: Document | null;
    readonly parentElement: Element | null;
    textContent: string | null;

    cloneNode(deep?: boolean): Node;
}

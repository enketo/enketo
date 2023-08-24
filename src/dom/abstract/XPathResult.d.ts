/** @package */
export interface NamespaceResolver {
    lookupNamespaceURI(prefix: string): string | null;
}

/** @package */
export class XPathResult {
    static FIRST_ORDERED_NODE_TYPE: number;
    static ORDERED_NODE_SNAPSHOT_TYPE: number;
    readonly singleNodeValue: Node | null;
    snapshotItem(index: number): Node | null;
    readonly snapshotLength: number;
}

export type XPathResultType = number;

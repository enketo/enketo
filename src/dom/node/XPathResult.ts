import type { DOM } from '../abstract';

/** @package */
export class XPathResult implements DOM.XPathResult {
    static ORDERED_NODE_SNAPSHOT_TYPE = 6 as const;

    static FIRST_ORDERED_NODE_TYPE = 9 as const;

    get singleNodeValue() {
        return this.results[0] ?? null;
    }

    get snapshotLength() {
        return this.results.length;
    }

    constructor(private results: DOM.Node[]) {}

    snapshotItem(index: number) {
        return this.results[index];
    }
}

type XPathResultTypeKeys = {
    [K in keyof XPathResult]: K extends `${string}_TYPE` ? K : never;
}[keyof XPathResult];

/** @package */
export type XPathResultType = XPathResult[XPathResultTypeKeys];

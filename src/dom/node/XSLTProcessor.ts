import type { Document } from 'libxmljs';
import { parse } from 'libxslt';
import type { XSLTStylesheet } from 'libxslt';
import type { DOM } from '../abstract';

/** @package */
export class XSLTProcessor {
    private parameters: Record<string, any> = {};

    private stylesheet: XSLTStylesheet | null = null;

    importStylesheet(xsltDoc: DOM.Document) {
        try {
            this.stylesheet = parse(xsltDoc as Document);
        } catch (error) {
            console.error(error, 'xsl', xsltDoc.toString());
            throw error;
        }
    }

    reset() {
        this.parameters = {};
        this.stylesheet = null;
    }

    setParameter(_namespaceURI: string | null, name: string, value: any) {
        this.parameters[name] = value;
    }

    transformToDocument(xmlDoc: DOM.Document) {
        if (this.stylesheet == null) {
            throw new Error('`importStylesheet` must be called.');
        }

        return this.stylesheet.apply(xmlDoc as Document, this.parameters);
    }
}

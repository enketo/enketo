import { libxmljs } from 'libxslt';
import type { DOM } from '../abstract';
import type { DOMMimeType } from '../abstract/DOMParser';

const { parseHtmlFragment, parseXml } = libxmljs;

/** @package */
export class DOMParser implements DOM.DOMParser {
    parseFromString = (docStr: string, mimeType: DOMMimeType): DOM.Document => {
        if (mimeType === 'text/html') {
            return parseHtmlFragment(docStr);
        }

        return parseXml(docStr);
    };
}

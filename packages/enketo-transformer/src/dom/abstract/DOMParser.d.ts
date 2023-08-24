import type { Document } from './Document';

/** @package */
export type DOMMimeType = 'text/html' | 'text/xml';

/** @package */
export interface DOMParser {
    parseFromString(docStr: string, mimeType: DOMMimeType): Document;
}

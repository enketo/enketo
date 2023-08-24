import type { DOM } from '../abstract';

/** @package */
export const XSLTProcessor =
    globalThis.XSLTProcessor as new () => DOM.XSLTProcessor;

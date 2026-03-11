/**
 * Constants shared between the application module (application-cache.js)
 * and the service worker script (offline-app-worker-partial.js).
 *
 * This file is consumed in two ways:
 *  1. As an ES module import in application-cache.js.
 *  2. Prepended (with `export` stripped) to the assembled service worker
 *     script by offline-controller.js, making the constants available in
 *     the service worker's global scope.
 */

export const SW_MESSAGE_GET_VERSION = 'GET_VERSION';

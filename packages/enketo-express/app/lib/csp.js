/**
 * @module csp
 */

// Hosts used by Google's tag (Google Analytics 4)
// https://developers.google.com/tag-platform/security/guides/csp
const GOOGLE_ANALYTICS = {
    'script-src': ['https://*.googletagmanager.com'],
    'img-src': [
        'https://*.google-analytics.com',
        'https://*.googletagmanager.com',
    ],
    'connect-src': [
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://*.googletagmanager.com',
    ],
};

// Hosts used by the Google Maps JavaScript API, only loaded for GOOGLE_* map layers
// https://developers.google.com/maps/documentation/javascript/content-security-policy
const GOOGLE_MAPS = {
    'script-src': [
        'https://*.googleapis.com',
        'https://*.gstatic.com',
        'https://*.google.com',
        'https://*.ggpht.com',
        'https://*.googleusercontent.com',
    ],
    'style-src': ['https://fonts.googleapis.com'],
    'img-src': [
        'https://*.googleapis.com',
        'https://*.gstatic.com',
        'https://*.google.com',
        'https://*.googleusercontent.com',
    ],
    'font-src': ['https://fonts.gstatic.com'],
    'connect-src': [
        'https://*.googleapis.com',
        'https://*.google.com',
        'https://*.gstatic.com',
    ],
    'frame-src': ['https://*.google.com'],
};

// The geopicker widget's address search
const GEOCODER = { 'connect-src': ['https://maps.googleapis.com'] };

// Same check as the geopicker widget uses to load the Google Maps API
const GOOGLE_LAYER = /^GOOGLE_(SATELLITE|ROADMAP|HYBRID|TERRAIN)/;

/**
 * Turns a tile URL template into a CSP source for its host, e.g.
 * `https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png` becomes `https://*.tile.openstreetmap.fr`.
 * Placeholders in the host (Leaflet's `{s}` subdomains) become a wildcard. Protocol-relative
 * URLs (`//tiles.example.com/...`) give a source without a scheme, which matches the page's own.
 *
 * @static
 * @param {string} url - Tile URL template
 * @return {string|undefined} CSP source, or undefined if the URL can't be used
 */
function tileSource(url) {
    const match = /^(?:(https?):)?\/\/([^/?#]+)/i.exec(String(url).trim());

    if (!match) {
        return undefined;
    }

    const [, protocol, authority] = match;
    // Leave out any credentials (user:password@), which aren't allowed in a CSP source
    const host = authority.slice(authority.lastIndexOf('@') + 1);
    const labels = host.toLowerCase().split('.');

    if (!host || labels.slice(1).some((label) => label.includes('{'))) {
        // Only a leading placeholder can be expressed as a CSP wildcard
        return undefined;
    }

    if (labels[0].includes('{')) {
        labels[0] = '*';
    }

    const source = labels.join('.');

    return protocol ? `${protocol.toLowerCase()}://${source}` : source;
}

/**
 * @param {object} [map] - Item of the `maps` configuration
 * @return {Array<string>} The map's tile URL templates
 */
function tileUrls(map) {
    const tiles = map && map.tiles;

    return (Array.isArray(tiles) ? tiles : [tiles]).filter(
        (tile) => typeof tile === 'string'
    );
}

/**
 * @param {string} [trackerUrl] - Piwik/Matomo tracker URL, which may leave out the protocol
 * @return {string|undefined} CSP source for the tracker's host
 */
function trackerSource(trackerUrl) {
    if (typeof trackerUrl !== 'string') {
        return undefined;
    }

    const value = trackerUrl.trim();
    const protocolRelative = value.startsWith('//');

    try {
        const url = new URL(protocolRelative ? `https:${value}` : value);

        if (!/^https?:$/.test(url.protocol)) {
            return undefined;
        }

        return protocolRelative ? url.host : url.origin;
    } catch (e) {
        return undefined;
    }
}

/**
 * Builds the default Content-Security-Policy from the configuration, so that the
 * features a server has configured (map layers, address search, analytics) aren't
 * blocked, while nothing else outside the Enketo domain is allowed.
 *
 * Used when CSP is enabled without a custom `csp.value`.
 *
 * @static
 * @param {object} config - Server configuration
 * @param {Array<object>} [config.maps] - Map layers
 * @param {string} [config.analytics] - Analytics service ('google' or 'piwik')
 * @param {object} [config.google] - Google configuration
 * @param {object} [config.piwik] - Piwik configuration
 * @return {string} Content-Security-Policy header value
 */
function buildDefaultCSP({ maps, analytics, google, piwik } = {}) {
    const directives = {
        'default-src': ["'self'", 'blob:'],
        'script-src': ["'self'", "'unsafe-inline'", 'data:'],
        'style-src': ["'self'", "'unsafe-inline'", 'data:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'font-src': [],
        'connect-src': ["'self'", 'blob:'],
        'frame-src': [],
    };
    const add = (sources) => {
        Object.entries(sources).forEach(([directive, values]) => {
            directives[directive].push(...values);
        });
    };

    // The geopicker falls back to OpenStreetMap when no maps are configured
    const layers =
        Array.isArray(maps) && maps.length > 0
            ? maps
            : [{ tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'] }];
    const urls = layers.flatMap(tileUrls);
    const googleLayers = urls.filter((url) => GOOGLE_LAYER.test(url));
    const tileSources = urls
        .filter((url) => !GOOGLE_LAYER.test(url))
        .map((url) => {
            const source = tileSource(url);

            if (!source) {
                console.warn(
                    `CSP: can't allow the map tiles at "${url}" in the default policy; set csp.value to allow them.`
                );
            }

            return source;
        })
        .filter(Boolean);

    // Tiles are images, but the offline service worker re-fetches them, which is checked against
    // connect-src. They can be left out of connect-src once the worker skips cross-origin requests.
    add({ 'img-src': tileSources, 'connect-src': tileSources });
    add(GEOCODER);

    if (googleLayers.length > 0) {
        add(GOOGLE_MAPS);
    }

    const measurementId =
        google && google.analytics && google.analytics.measurementId;

    if (analytics === 'google' && measurementId) {
        add(GOOGLE_ANALYTICS);
    }

    const piwikSource = trackerSource(
        piwik && piwik.analytics && piwik.analytics['tracker url']
    );

    if (analytics === 'piwik' && piwikSource) {
        add({
            'script-src': [piwikSource],
            'img-src': [piwikSource],
            'connect-src': [piwikSource],
        });
    }

    // A directive that is left out falls back to default-src, so one that is added must keep
    // those sources too, or same-origin fonts and frames would be blocked.
    ['font-src', 'frame-src'].forEach((directive) => {
        if (directives[directive].length > 0) {
            directives[directive].unshift(...directives['default-src']);
        }
    });

    return Object.entries(directives)
        .filter(([, sources]) => sources.length > 0)
        .map(([directive, sources]) =>
            [directive, ...new Set(sources)].join(' ')
        )
        .join('; ');
}

module.exports = { buildDefaultCSP, tileSource };

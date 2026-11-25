/**
 * @module media-controller
 */

const url = require('url');
const communicator = require('../lib/communicator');
const request = require('@cypress/request');
const express = require('express');

const router = express.Router();
const debug = require('debug')('enketo:media-controller');
const { ResponseError } = require('../lib/custom-error');
const mediaLib = require('../lib/media');

// The only headers of a media response passed on to the browser
const MEDIA_HEADERS = [
    'accept-ranges',
    'cache-control',
    'content-disposition',
    'content-encoding',
    'content-length',
    'content-range',
    'content-language',
    'content-type',
    'etag',
    'expires',
    'last-modified',
    'vary',
];
// Every media document is sandboxed but PDFs, as a sandbox breaks Chrome's PDF viewer. Only an
// exact type counts: browsers read e.g. `text/plain, text/html` as HTML.
const UNSANDBOXED_CONTENT_TYPE = /^\s*application\/pdf\s*(;[^,]*)?$/i;
const MEDIA_CSP =
    "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

module.exports = (app) => {
    app.use(`${app.get('base path')}/media`, router);
};

router.get('/get/*', getMedia);

function _isPrintView(req) {
    const refererQuery =
        req.headers && req.headers.referer
            ? url.parse(req.headers.referer).query
            : null;

    return !!(refererQuery && refererQuery.includes('print=true'));
}

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
async function getMedia(req, res, next) {
    try {
        const hostURLOptions = await mediaLib.getHostURLOptions(req);
        const url = await mediaLib.getHostURL(hostURLOptions);

        if (url == null) {
            throw new ResponseError(404, 'Not found');
        }

        const { auth, cookie } = hostURLOptions;

        // TODO: while beginning to work on consolidating media logic,
        // it was also discovered that partial content is not handled
        // correctly when content is streamed through a proxy with
        // incomplete configuration. Discovered during dev with the
        // default ODK Central configuration.
        //
        // For example, this presents as being unable to seek <audio>
        // in Chrome.
        const options = communicator.getUpdatedRequestOptions({
            url,
            auth,
            headers: {
                cookie,
            },
        });

        // due to a bug in request/request using options.method with Digest Auth we won't pass method as an option
        delete options.method;

        // Lets redirects switch protocol (e.g. internal http URL to remote https media)
        options.allowInsecureRedirect = true;
        options.followRedirect = _followMediaRedirect;
        options.removeRefererHeader = true;

        if (_isPrintView(req)) {
            const headRequest = request.head(options, (error, response) => {
                if (error) {
                    next(error);
                } else if (_isRedirect(response)) {
                    next(_getRefusedRedirectError());
                } else {
                    const contentType = response.headers['content-type'] ?? '';
                    if (
                        contentType.startsWith('audio') ||
                        contentType.startsWith('video')
                    ) {
                        // Empty response, because audio and video is not helpful in print views.
                        res.status(204).end();
                    } else {
                        _pipeMedia(options, req, res, next);
                    }
                }
            });

            _keepCredentialsOnOpenRosaServer(headRequest);
        } else {
            _pipeMedia(options, req, res, next);
        }
    } catch (error) {
        next(error);
    }
}

/**
 * Called (with the request as `this`) before following a redirect. Refuses https to http and
 * URLs without a host. The location is resolved and parsed like the client does
 * (`lib/redirect.js`), so the check applies to the URL it would request.
 *
 * @param {import('http').IncomingMessage} response - the redirect response
 * @return {boolean} whether to follow the redirect
 */
function _followMediaRedirect(response) {
    // Authentication retry of the same URL
    if (response.statusCode === 401) {
        return true;
    }

    const { location } = response.headers;
    let to;

    try {
        to = url.parse(
            /^https?:/.test(location)
                ? location
                : url.resolve(this.uri.href, location)
        );
    } catch {
        return false;
    }

    return (
        Boolean(to.host) &&
        ['http:', 'https:'].includes(to.protocol) &&
        !(this.uri.protocol === 'https:' && to.protocol !== 'https:')
    );
}

/**
 * Keeps the user's cookies and credentials from reaching other hosts than the OpenRosa
 * server. The client emits `redirect` once it has parsed the URL it will request next, so
 * this compares the host it will actually connect to.
 *
 * @param {import('@cypress/request').Request} mediaRequest - a media request
 * @return {import('@cypress/request').Request} the same request
 */
function _keepCredentialsOnOpenRosaServer(mediaRequest) {
    const openRosaHost = mediaRequest.uri.host;

    return mediaRequest.on('redirect', () => {
        if (mediaRequest.uri.host !== openRosaHost) {
            mediaRequest.removeHeader('cookie');
            mediaRequest.removeHeader('authorization');

            // Or a 401 from that host would get the credentials
            if (mediaRequest._auth) {
                mediaRequest._auth.hasAuth = false;
            }
        }
    });
}

function _isRedirect(response) {
    return (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location != null
    );
}

function _getRefusedRedirectError() {
    return new ResponseError(502, 'Media redirect not allowed');
}

function _pipeMedia(options, req, res, next) {
    const mediaRequest = _keepCredentialsOnOpenRosaServer(request.get(options));
    // The client can emit both an error and a response (e.g. too many redirects)
    let failed = false;
    const fail = (error) => {
        if (!failed) {
            failed = true;
            _handleMediaRequestError(error, next);
        }
    };

    mediaRequest.on('error', fail).on('response', (response) => {
        if (failed) {
            mediaRequest.abort();

            return;
        }

        // A redirect that wasn't followed, which the browser shouldn't follow either
        if (_isRedirect(response)) {
            mediaRequest.abort();
            fail(_getRefusedRedirectError());

            return;
        }

        _restrictMediaHeaders(response.headers);
        mediaRequest.pipe(res).on('error', fail);
    });
}

/**
 * Keeps only the headers the browser needs for the media, so the server hosting it can't set
 * cookies, a security policy or a login prompt on Enketo's domain, and sandboxes the media
 * when it's opened as a document. The client copies these headers to the response when piping.
 *
 * @param {import('http').IncomingHttpHeaders} headers - the media response's headers
 */
function _restrictMediaHeaders(headers) {
    Object.keys(headers).forEach((name) => {
        if (!MEDIA_HEADERS.includes(name)) {
            delete headers[name];
        }
    });

    headers['x-content-type-options'] = 'nosniff';

    if (!UNSANDBOXED_CONTENT_TYPE.test(headers['content-type'] ?? '')) {
        headers['content-security-policy'] = MEDIA_CSP;
    }
}

function _handleMediaRequestError(error, next) {
    debug(
        `error retrieving media from OpenRosa server: ${JSON.stringify(error)}`
    );
    if (!error.status) {
        error.status = error.code && error.code === 'ENOTFOUND' ? 404 : 500;
    }
    next(error);
}

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

        // Media files hosted elsewhere are redirected to, often from http (internal OpenRosa URL) to https.
        // Without this, the client reuses the agent of the first protocol and the request fails.
        options.allowInsecureRedirect = true;
        options.followRedirect = _followMediaRedirect;
        // The previous URL can be an internal one, which other hosts don't need to know
        options.removeRefererHeader = true;

        if (_isPrintView(req)) {
            request.head(options, (error, response) => {
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
        } else {
            _pipeMedia(options, req, res, next);
        }
    } catch (error) {
        next(error);
    }
}

/**
 * Decides whether a media request follows a redirect. It's called with the request as `this`.
 *
 * The user's cookies and credentials are only meant for the OpenRosa server, so they aren't
 * sent to another host: the cookie header is removed and authentication is turned off, so a
 * 401 from that host can't get the credentials either. Redirects from https to http, and to
 * invalid URLs, are refused.
 *
 * @param {import('http').IncomingMessage} response - the redirect response
 * @return {boolean} whether to follow the redirect
 */
function _followMediaRedirect(response) {
    // Authentication retries the same URL after a 401, whatever its location says
    if (response.statusCode === 401) {
        return true;
    }

    let from;
    let to;

    try {
        from = new URL(this.uri.href);
        // Resolved like the client does, so the checks apply to the URL it requests
        to = new URL(url.resolve(from.href, response.headers.location));
    } catch {
        return false;
    }

    if (
        !['http:', 'https:'].includes(to.protocol) ||
        (from.protocol === 'https:' && to.protocol !== 'https:')
    ) {
        return false;
    }

    if (to.host !== from.host) {
        this.removeHeader('cookie');
        this.removeHeader('authorization');

        if (this._auth) {
            this._auth.hasAuth = false;
        }
    }

    return true;
}

/**
 * @param {import('http').IncomingMessage} response - a media response
 * @return {boolean} whether it's a redirect that wasn't followed
 */
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
    const mediaRequest = request.get(options);
    let failed = false;
    // The client can emit both an error and a response, e.g. after too many redirects
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

        // Passing it on would make the browser follow it instead
        if (_isRedirect(response)) {
            mediaRequest.abort();
            fail(_getRefusedRedirectError());

            return;
        }

        mediaRequest.pipe(res).on('error', fail);
    });
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

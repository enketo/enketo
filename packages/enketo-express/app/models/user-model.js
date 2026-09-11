/**
 * @module user-model
 */

const { jwtDecrypt, errors } = require('jose');
const { deriveEncryptionKey } = require('../lib/encryption');
const url = require('url');
const debug = require('debug')('enketo:user-model');

/**
 * Returns credentials from request object.
 * Handles `'basic'` and `'token'` authentication types.
 *
 * @static
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @return {Promise<object|null>} Credentials
 */
async function getCredentials(req) {
    const auth = req.app.get('linked form and data server').authentication;
    const authType = auth.type.toLowerCase();
    let creds = null;

    if (authType === 'basic') {
        const jwToken =
            req.signedCookies[req.app.get('authentication cookie name')];
        if (jwToken) {
            const derivedKey = deriveEncryptionKey(
                req.app.get('encryption key')
            );
            try {
                const { payload } = await jwtDecrypt(jwToken, derivedKey);
                creds = { user: payload.user, pass: payload.pass };
            } catch (err) {
                if (!(err instanceof errors.JOSEError)) {
                    throw err;
                }
                debug('auth cookie rejected: %s', err.code);
            }
        }
    } else if (authType === 'token') {
        const paramName = auth['query parameter'];
        if (!paramName) {
            throw new Error(
                'Enketo configuration error. No query parameter name configured for token authentication.'
            );
        }
        // Note url.parse is considered a legacy method now, and can be replaced for nodeJS 8+
        const referer = req.headers.referer
            ? url.parse(req.headers.referer, true)
            : null;
        const tokenValue = referer
            ? referer.query[paramName]
            : req.query[paramName];
        if (tokenValue) {
            creds = {
                bearer: tokenValue,
            };
        }
    }

    return creds;
}

module.exports = {
    getCredentials,
};

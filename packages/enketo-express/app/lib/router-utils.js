/**
 * @module router-utils
 */

const utils = require('./utils');
const config = require('../models/config-model').server;
/**
 * @static
 * @name idEncryptionKeys
 * @constant
 * @property { string } singleOnce
 * @property { string } view
 */
const keys = {
    singleOnce: config['less secure encryption key'],
    view: `${config['less secure encryption key']}view`,
    viewDn: `${config['less secure encryption key']}view-dn`,
    viewDnC: `${config['less secure encryption key']}view-dnc`,
    preview: `${config['less secure encryption key']}preview-oc`,
    fsC: `${config['less secure encryption key']}fs-c`,
    fsParticipant: `${config['less secure encryption key']}fs-participant`,
    fullParticipant: `${config['less secure encryption key']}full-participant`,
    editRfc: `${config['less secure encryption key']}edit-rfc`,
    editRfcC: `${config['less secure encryption key']}edit-rfc-c`,
    editHeadless: `${config['less secure encryption key']}edit-headless`,
    incRfc: `${config['less secure encryption key']}inc-rfc`,
    incRfcC: `${config['less secure encryption key']}inc-rfc-c`,
};

/**
 * @static
 * @name enketoId
 * @function
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 * @param { string } id - Enketo ID
 */
function enketoIdParam(req, res, next, id) {
    if (/^[A-z0-9]{4,31}$/.test(id)) {
        req.enketoId = id;
        next();
    } else {
        next('route');
    }
}

/**
 * Wrapper function for {@link module:router-utils~_encryptedEnketoIdParam|_encryptedEnketoIdParam}
 *
 * @static
 * @name encryptedEnketoIdSingle
 * @function
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 * @param { string } id - Enketo ID
 */
function encryptedEnketoIdParamSingle(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.singleOnce);
}

/**
 * Wrapper function for {@link module:router-utils~_encryptedEnketoIdParam|_encryptedEnketoIdParam}
 *
 * @static
 * @name encryptedEnketoIdView
 * @function
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 * @param { string } id - Enketo ID
 */
function encryptedEnketoIdParamView(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.view);
}

function encryptedEnketoIdPreview(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.preview);
}

function encryptedEnketoIdViewDn(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.viewDn);
}

function encryptedEnketoIdViewDnC(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.viewDnC);
}

function encryptedEnketoIdFsC(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.fsC);
}

function encryptedEnketoIdFsParticipant(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.fsParticipant);
}

function encryptedEnketoIdFullParticipant(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.fullParticipant);
}

function encryptedEnketoIdEditRfc(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.editRfc);
}

function encryptedEnketoIdEditRfcC(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.editRfcC);
}

function encryptedEnketoIdIncRfc(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.incRfc);
}

function encryptedEnketoIdIncRfcC(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.incRfcC);
}

function encryptedEnketoIdEditHeadless(req, res, next, id) {
    _encryptedEnketoIdParam(req, res, next, id, keys.editHeadless);
}

/**
 * Returns decrypted Enketo ID
 *
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 * @param { string } id - Enketo ID
 * @param { string } key - Encryption key
 */
function _encryptedEnketoIdParam(req, res, next, id, key) {
    // Do not do a size check because we now have a configurable id size which can be used on an existing server,
    // and therefore old (encrypted) IDs may have different lengths as new (encrypted) IDs.
    // Routing takes care of FIRST checking whether the ID is a regular unencrypted ID.
    try {
        // Just see if it can be decrypted. Storing the encrypted value might
        // increases chance of leaking underlying enketo_id but for now this is used
        // in the submission controller and transformation controller.
        const decrypted = utils.insecureAes192Decrypt(id, key);
        // Sometimes decryption by incorrect keys works and results in gobledigook.
        // A really terrible way of working around this is to check if the result is
        // alphanumeric (as Enketo IDs always are).
        if (/^[a-z0-9]+$/i.test(decrypted)) {
            req.enketoId = decrypted;
            req.encryptedEnketoId = id;
            next();
        } else {
            console.error(
                `decryption with "${key}" worked but result is not alphanumeric, ignoring result:`,
                decrypted
            );
            next('route');
        }
    } catch (e) {
        // console.error( 'Could not decrypt:', req.encryptedEnketoId );
        next('route');
    }
}

module.exports = {
    enketoId: enketoIdParam,
    idEncryptionKeys: keys,
    encryptedEnketoIdSingle: encryptedEnketoIdParamSingle,
    encryptedEnketoIdView: encryptedEnketoIdParamView,
    encryptedEnketoIdPreview,
    encryptedEnketoIdViewDn,
    encryptedEnketoIdViewDnC,
    encryptedEnketoIdFsC,
    encryptedEnketoIdEditRfc,
    encryptedEnketoIdEditRfcC,
    encryptedEnketoIdIncRfc,
    encryptedEnketoIdIncRfcC,
    encryptedEnketoIdEditHeadless,
    encryptedEnketoIdFullParticipant,
    encryptedEnketoIdFsParticipant,
};

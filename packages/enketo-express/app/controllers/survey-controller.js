/**
 * @module survey-controller
 */

const utils = require('../lib/utils');
const TError = require('../lib/custom-error').TranslatedError;
const communicator = require('../lib/communicator');
const surveyModel = require('../models/survey-model');
const userModel = require('../models/user-model');
const config = require('../models/config-model').server;
const express = require('express');

const router = express.Router();
const routerUtils = require('../lib/router-utils');
// var debug = require( 'debug' )( 'survey-controller' );

module.exports = (app) => {
    app.use(`${app.get('base path')}/`, router);
};

router.param('enketo_id', routerUtils.enketoId);
router.param('encrypted_enketo_id_single', routerUtils.encryptedEnketoIdSingle);
router.param('encrypted_enketo_id_view', routerUtils.encryptedEnketoIdView);
router.param(
    'encrypted_enketo_id_view_dn',
    routerUtils.encryptedEnketoIdViewDn
);
router.param(
    'encrypted_enketo_id_view_dn_c',
    routerUtils.encryptedEnketoIdViewDnC
);
router.param(
    'encrypted_enketo_id_preview',
    routerUtils.encryptedEnketoIdPreview
);
router.param('encrypted_enketo_id_fs_c', routerUtils.encryptedEnketoIdFsC);
router.param(
    'encrypted_enketo_id_fs_participant',
    routerUtils.encryptedEnketoIdFsParticipant
);
router.param(
    'encrypted_enketo_id_full_participant',
    routerUtils.encryptedEnketoIdFullParticipant
);
router.param('encrypted_enketo_id_rfc', routerUtils.encryptedEnketoIdEditRfc);
router.param(
    'encrypted_enketo_id_rfc_c',
    routerUtils.encryptedEnketoIdEditRfcC
);
router.param(
    'encrypted_enketo_id_inc_rfc',
    routerUtils.encryptedEnketoIdIncRfc
);
router.param(
    'encrypted_enketo_id_inc_rfc_c',
    routerUtils.encryptedEnketoIdIncRfcC
);
router.param(
    'encrypted_enketo_id_headless',
    routerUtils.encryptedEnketoIdEditHeadless
);

router.param('mod', (req, rex, next, mod) => {
    if (mod === 'i') {
        req.iframe = true;
        next();
    } else {
        req.iframe = false;
        next('route');
    }
});

router
    // .get( '*', loggedInCheck )
    .get('*/participant/*', (req, res, next) => {
        req.participant = true;
        next();
    })
    .get('*/headless*', _setHeadless)
    .get('/preview*', _setJini)
    .get('/preview*', _setNextPrompt)
    .get(/\/(single|edit)\/fs(\/rfc)?(\/c)?\/i/, _setJini)
    .get(/\/(single)\/fs(\/rfc)?(\/c)?\/i/, _setNextPrompt)
    .get('*', _setCloseButton)
    .get('*', _setCompleteButton)
    .get(
        `${config['offline path']}/full/participant/:encrypted_enketo_id_full_participant`,
        fullParticipantOffline
    )
    .get(`${config['offline path']}/:enketo_id`, offlineWebform)
    .get(`${config['offline path']}/`, redirect)
    .get('/connection', (req, res) => {
        res.status = 200;
        res.send(`connected ${Math.random()}`);
    })
    .get('/preview/:encrypted_enketo_id_preview', preview)
    .get('/preview/:mod/:encrypted_enketo_id_preview', preview)
    .get('/preview', preview)
    .get('/preview/:mod', preview)
    .get('/preview/participant/:mod', preview)
    .get(
        '/preview/participant/:mod/:encrypted_enketo_id_fs_participant',
        preview
    )
    .get('/:enketo_id', webform)
    .get('/:mod/:enketo_id', webform)
    .get('/single/fs/:mod/:enketo_id', fieldSubmission)
    .get('/single/fs/c/:mod/:encrypted_enketo_id_fs_c', fieldSubmission)
    .get('/single/fs/rfc/:mod/:encrypted_enketo_id_inc_rfc', fieldSubmission)
    .get(
        '/single/fs/rfc/c/:mod/:encrypted_enketo_id_inc_rfc_c',
        fieldSubmission
    )
    .get(
        '/single/fs/participant/:mod/:encrypted_enketo_id_fs_participant',
        fieldSubmission
    )
    .get(
        '/single/full/participant/:encrypted_enketo_id_full_participant',
        fullParticipant
    )
    .get('/single/:enketo_id', single)
    .get('/single/:encrypted_enketo_id_single', single)
    .get('/single/:mod/:enketo_id', single)
    .get('/single/:mod/:encrypted_enketo_id_single', single)
    .get('/view/:encrypted_enketo_id_view', view)
    .get('/view/:mod/:encrypted_enketo_id_view', view)
    .get('/edit/:enketo_id', edit)
    .get('/edit/:mod/:enketo_id', edit)
    .get('/edit/fs/rfc/:mod/:encrypted_enketo_id_rfc', fieldSubmission)
    .get('/edit/fs/rfc/c/:mod/:encrypted_enketo_id_rfc_c', fieldSubmission)
    .get('/edit/fs/inc/rfc/:mod/:encrypted_enketo_id_inc_rfc', fieldSubmission)
    .get(
        '/edit/fs/inc/rfc/c/:mod/:encrypted_enketo_id_inc_rfc_c',
        fieldSubmission
    )
    .get('/edit/fs/:mod/:enketo_id', fieldSubmission)
    .get('/edit/fs/c/:mod/:encrypted_enketo_id_fs_c', fieldSubmission)
    .get('/edit/fs/dn/:mod/:encrypted_enketo_id_view_dn', fieldSubmission)
    .get('/edit/fs/dn/c/:mod/:encrypted_enketo_id_view_dn_c', fieldSubmission)
    .get(
        '/edit/fs/participant/:mod/:encrypted_enketo_id_fs_participant',
        fieldSubmission
    )
    .get('/edit/fs/headless/:encrypted_enketo_id_headless', fieldSubmission)
    .get('/edit/fs/rfc/headless/:encrypted_enketo_id_headless', fieldSubmission)
    .get('/view/fs/:encrypted_enketo_id_view', fieldSubmission)
    .get('/view/fs/:mod/:encrypted_enketo_id_view', fieldSubmission)
    .get('/xform/:enketo_id', xform)
    .get('/xform/:encrypted_enketo_id_single', xform)
    .get('/xform/:encrypted_enketo_id_view', xform)
    .get('/xform/:encrypted_enketo_id_view_dn', xform)
    .get('/xform/:encrypted_enketo_id_view_dn_c', xform)
    .get('/xform/:encrypted_enketo_id_fs_c', xform)
    .get('/xform/:encrypted_enketo_id_fs_participant', xform)
    .get('/xform/:encrypted_enketo_id_full_participant', xform)
    .get(/.*\/::[A-z0-9]{4,8}/, redirect);

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
function offlineWebform(req, res, next) {
    if (!req.app.get('offline enabled')) {
        const error = new Error(
            'Offline functionality has not been enabled for this application.'
        );
        error.status = 405;
        next(error);
    } else {
        req.offlinePath = config['offline path'];
        webform(req, res, next);
    }
}

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
function webform(req, res, next) {
    const options = {
        offlinePath: req.offlinePath,
        iframe: req.iframe,
        print: req.query.print === 'true',
        desktop: req.query.desktop === 'true',
    };

    _renderWebform(req, res, next, options);
}

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
function single(req, res, next) {
    const options = {
        type: 'single',
        iframe: req.iframe,
    };
    if (req.encryptedEnketoId && req.cookies[req.encryptedEnketoId]) {
        res.redirect(
            `${req.baseUrl}/thanks?taken=${req.cookies[req.encryptedEnketoId]}`
        );
    } else {
        _renderWebform(req, res, next, options);
    }
}

function _setJini(req, res, next) {
    req.jini =
        req.query.jini === 'true' &&
        config.jini['style url'] &&
        config.jini['script url']
            ? config.jini
            : null;
    next();
}

function _setNextPrompt(req, res, next) {
    req.nextPrompt = req.query.next_prompt ? req.query.next_prompt : null;
    next();
}

function _setCloseButton(req, res, next) {
    // only RFC edit views that require a COMPLETED record do not
    // have a Close button
    req.closeButton = !/\/edit\/fs\/rfc/.test(req.originalUrl);
    next();
}

function _setCompleteButton(req, res, next) {
    req.completeButton =
        /\/(edit|single)\/fs(\/inc)?\/(?!(participant|dn|view))/.test(
            req.originalUrl
        );
    next();
}

function _setHeadless(req, res, next) {
    req.headless = true;
    next();
}

function fieldSubmission(req, res, next) {
    const options = {
        type: 'fieldsubmission',
        iframe: req.iframe,
        print: req.query.print === 'true',
        jini: req.jini,
        nojump: req.participant,
        completeButton: req.completeButton,
        closeButton: req.closeButton,
        nextPrompt: req.nextPrompt,
        headless: !!req.headless,
        participant: req.participant,
    };

    _renderWebform(req, res, next, options);
}

function fullParticipant(req, res, next) {
    const options = {
        type: 'full',
        nojump: req.participant,
    };

    _renderWebform(req, res, next, options);
}

function fullParticipantOffline(req, res, next) {
    const options = {
        type: 'full',
        nojump: req.participant,
        offlinePath: config['offline path'],
    };

    if (!req.app.get('offline enabled')) {
        const error = new Error(
            'Offline functionality has not been enabled for this application.'
        );
        error.status = 405;
        next(error);
    } else {
        _renderWebform(req, res, next, options);
    }
}

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
function view(req, res, next) {
    const options = {
        type: 'view',
        iframe: req.iframe,
        print: req.query.print === 'true',
    };

    _renderWebform(req, res, next, options);
}

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
function preview(req, res, next) {
    const options = {
        type: 'preview',
        jini: req.jini,
        iframe: req.iframe || !!req.query.iframe,
        notification: utils.pickRandomItemFromArray(config.notifications),
        nextPrompt: req.nextPrompt,
    };

    _renderWebform(req, res, next, options);
}

/**
 * This serves a page that redirects old pre-2.0.0 urls into new urls.
 * The reason this on the client-side is to cache the redirect itself which is important
 * in case people have bookmarked an offline-capable old-style url and go into the field without Internet.
 *
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 */
function redirect(req, res) {
    res.render('surveys/webform-redirect');
}

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
function edit(req, res, next) {
    const options = {
        type: 'edit',
        iframe: req.iframe,
    };

    if (req.query.instance_id) {
        _renderWebform(req, res, next, options);
    } else {
        const error = new TError('error.invalidediturl');
        error.status = 400;
        next(error);
    }
}

/**
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 * @param { object } options - Options passed to render
 */
function _renderWebform(req, res, next, options) {
    const deviceId =
        req.signedCookies.__enketo_meta_deviceid ||
        `${req.hostname}:${utils.randomString(16)}`;
    const cookieOptions = {
        signed: true,
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
    };

    res.cookie('__enketo_meta_deviceid', deviceId, cookieOptions).render(
        'surveys/webform',
        options
    );
}

/**
 * Debugging view that shows underlying XForm
 *
 * @param {module:api-controller~ExpressRequest} req - HTTP request
 * @param {module:api-controller~ExpressResponse} res - HTTP response
 * @param {Function} next - Express callback
 */
function xform(req, res, next) {
    return surveyModel
        .get(req.enketoId)
        .then((survey) => {
            survey.credentials = userModel.getCredentials(req);

            return survey;
        })
        .then(communicator.getXFormInfo)
        .then(communicator.getXForm)
        .then((survey) => {
            res.set('Content-Type', 'text/xml').send(survey.xform);
        })
        .catch(next);
}

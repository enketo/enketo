const request = require('request');
const express = require('express');
const communicator = require('../lib/communicator');
const surveyModel = require('../models/survey-model');
const userModel = require('../models/user-model');
const routerUtils = require('../lib/router-utils');
const { getSubmissionUrlAPI1, getSubmissionUrlAPI2 } = require('../lib/url-oc');

const router = express.Router();
// const debug = require( 'debug' )( 'fieldsubmission-controller' );

module.exports = (app) => {
    app.use(`${app.get('base path')}/fieldsubmission`, router);
};

router.param('enketo_id', routerUtils.enketoId);
router.param(
    'encrypted_enketo_id_view_dn',
    routerUtils.encryptedEnketoIdViewDn
);
router.param(
    'encrypted_enketo_id_view_dn_c',
    routerUtils.encryptedEnketoIdViewDnC
);
router.param('encrypted_enketo_id_fs_c', routerUtils.encryptedEnketoIdFsC);
router.param(
    'encrypted_enketo_id_participant',
    routerUtils.encryptedEnketoIdFsParticipant
);
router.param('encrypted_enketo_id_rfc', routerUtils.encryptedEnketoIdEditRfc);
router.param(
    'encrypted_enketo_id_rfc_c',
    routerUtils.encryptedEnketoIdEditRfcC
);
router.param(
    'encrypted_enketo_id_headless',
    routerUtils.encryptedEnketoIdEditHeadless
);

router
    .all('*', (req, res, next) => {
        res.set('Content-Type', 'application/json');
        next();
    })
    .post('/:enketo_id', submit)
    .post('/:encrypted_enketo_id_fs_c', submit)
    .post('/:encrypted_enketo_id_participant', submit)
    .post('/complete/:enketo_id', complete)
    .post('/complete/:encrypted_enketo_id_fs_c', complete)
    .post('/:encrypted_enketo_id_view_dn', submit)
    .post('/:encrypted_enketo_id_view_dn_c', submit)
    .post('/:encrypted_enketo_id_rfc', submit)
    .post('/:encrypted_enketo_id_rfc_c', submit)
    .post('/:encrypted_enketo_id_headless', submit)
    .delete('/:enketo_id/*', del) // fieldsubmission API 2.0.0
    .delete('/:encrypted_enketo_id_fs_c/*', del) // fieldsubmission API 2.0.0
    .delete('/:encrypted_enketo_id_rfc/*', del) // fieldsubmission API 2.0.0
    .delete('/:encrypted_enketo_id_rfc_c/*', del) // fieldsubmission API 2.0.0
    .delete('/:encrypted_enketo_id_headless/*', del) // fieldsubmission API 2.0.0
    .delete('/:encrypted_enketo_id_participant/*', del) // fieldsubmission API 2.0.0
    .all('/*', (req, res, next) => {
        const error = new Error('Not allowed');
        error.status = 405;
        next(error);
    });

function complete(req, res, next) {
    _request('complete', req, res, next);
}

function submit(req, res, next) {
    _request('field', req, res, next);
}

function del(req, res, next) {
    _request('delete', req, res, next);
}

/**
 * Simply pipes well-formed request to the OpenRosa server and
 * copies the response received.
 *
 * @param type
 * @param {[type]} req -  [description]
 * @param {[type]} res -  [description]
 * @param {Function} next - [description]
 * @return {[type]}        [description]
 */
function _request(type, req, res, next) {
    let submissionUrl;
    surveyModel
        .get(req.enketoId)
        .then((survey) => {
            if (type === 'delete') {
                submissionUrl = getSubmissionUrlAPI2(
                    survey.openRosaServer,
                    req.originalUrl
                );
            } else {
                const ecidValue = req.query.ecid;
                const query = ecidValue ? `?ecid=${ecidValue}` : '';
                submissionUrl =
                    getSubmissionUrlAPI1(survey.openRosaServer, type) + query;
            }

            const credentials = userModel.getCredentials(req);

            return communicator.getAuthHeader(submissionUrl, credentials);
        })
        .then((authHeader) => {
            const options = {
                url: submissionUrl,
                headers: authHeader
                    ? {
                          Authorization: authHeader,
                      }
                    : {},
                timeout: req.app.get('timeout') + 500,
            };

            // pipe the request
            req.pipe(request(options))
                .on('response', (orResponse) => {
                    if (orResponse.statusCode === 201) {
                        // TODO: Do we really want to log all field submissions? It's a huge amount.
                        // _logSubmission( id, instanceId, deprecatedId );
                    } else if (orResponse.statusCode === 401) {
                        // replace the www-authenticate header to avoid browser built-in authentication dialog
                        orResponse.headers[
                            'WWW-Authenticate'
                        ] = `enketo${orResponse.headers['WWW-Authenticate']}`;
                    }
                })
                .pipe(res);
        })
        .catch(next);
}

/*
function _logSubmission( id, instanceId, deprecatedId ) {
    submissionModel.isNew( id, instanceId )
        .then( function( notRecorded ) {
            if ( notRecorded ) {
                // increment number of submissions
                surveyModel.incrementSubmissions( id );
                // store/log instanceId
                submissionModel.add( id, instanceId, deprecatedId );
            }
        } )
        .catch( function( error ) {
            console.error( error );
        } );
}
*/

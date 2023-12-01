const auth = require('basic-auth');
const express = require('express');
const surveyModel = require('../models/survey-model');
const instanceModel = require('../models/instance-model');
const cacheModel = require('../models/cache-model');
const account = require('../models/account-model');
const pdf = require('../lib/pdf');
const headless = require('../lib/headless');
const utils = require('../lib/utils');
const keys = require('../lib/router-utils').idEncryptionKeys;

const router = express.Router();
const quotaErrorMessage = 'Forbidden. No quota left';
// const debug = require( 'debug' )( 'oc-api-controller-v1' );

module.exports = (app) => {
    app.use(`${app.get('base path')}/oc/api/v1`, router);
};

// TODO: use URL object and searchParams.append to build URLs

router
    .get('/', (req, res) => {
        res.redirect(
            'https://github.com/OpenClinica/enketo-express-oc/blob/master/doc/oc-api.md'
        );
    })
    .get('/version', getVersion)
    .post('/version', getVersion)
    .post('*', authCheck)
    .delete('*', authCheck)
    .post('*', _setQuotaUsed)
    .post('/survey/preview*', (req, res, next) => {
        req.webformType = 'preview';
        next();
    })
    .post('/instance(/*)?', (req, res, next) => {
        req.webformType = 'edit';
        next();
    })
    .post('*/c', (req, res, next) => {
        req.dnClose = true;
        next();
    })
    .post('*/incomplete/*', (req, res, next) => {
        req.incomplete = true;
        next();
    })
    .post('/survey/view(/*)?', (req, res, next) => {
        req.webformType = 'view';
        next();
    })
    .post('/instance/view(/*)?', (req, res, next) => {
        req.webformType = 'view-instance';
        next();
    })
    .post('*/pdf', (req, res, next) => {
        req.webformType = 'pdf';
        next();
    })
    .post('*/headless(/*)?', (req, res, next) => {
        req.webformType = 'headless';
        next();
    })
    .post('*/rfc(/*)?', (req, res, next) => {
        req.rfc = true;
        next();
    })
    .post('/instance/note(/*)?', (req, res, next) => {
        req.webformType = 'note-instance';
        next();
    })
    .post('*/full/*', (req, res, next) => {
        req.webformType = 'single-full';
        next();
    })
    .post('*/full/offline/*', (req, res, next) => {
        if (req.app.get('offline enabled')) {
            req.webformType = 'full-offline';
            next();
        } else {
            const error = new Error(
                'Not Allowed. Offline capability is not enabled.'
            );
            error.status = 405;
            next(error);
        }
    })
    .post('*/participant(/*)?', (req, res, next) => {
        req.participant = true;
        next();
    })
    .delete('/survey/cache', emptySurveyCache)
    .delete('/instance/', removeInstance)
    // check and set parameters, return error if required parameter is missing
    .post('*', _setDefaultsQueryParam)
    .post('*', _setLangQueryParam)
    .post('*', _setReturnQueryParam) // is this actually used by OC?
    .post('*', _setGoTo)
    .post('*', _setParentWindow)
    .post('*', _setNextPrompt)
    .post(/\/(survey|instance)\/(collect|edit|view|note|headless)/, _setEcid) // excl preview
    .post(
        /\/(survey|instance)\/(collect|edit|preview)(?!\/participant)/,
        _setJini
    ) // excl view, note, and participant
    .post(
        /\/(survey|instance)\/(collect|edit|view|note)(?!\/participant)/,
        _setPid
    ) // excl preview, and participant
    .post(/\/(view|note)/, _setLoadWarning)
    .post('*/pdf', _setPage)
    .post('/survey/preview', getNewOrExistingSurvey)
    .post('/survey/preview/participant', getNewOrExistingSurvey)
    .post('/survey/view', getNewOrExistingSurvey)
    .post('/survey/view/pdf', getNewOrExistingSurvey)
    .post('/survey/collect', getNewOrExistingSurvey)
    .post('/survey/collect/c', getNewOrExistingSurvey)
    .post('/survey/collect/rfc', getNewOrExistingSurvey)
    .post('/survey/collect/rfc/c', getNewOrExistingSurvey)
    .post('/survey/collect/participant', getNewOrExistingSurvey)
    .post('/survey/collect/full/participant', getNewOrExistingSurvey)
    .post('/survey/collect/full/offline/participant', getNewOrExistingSurvey)
    .post('/instance/*', _setInterfaceQueryParam)
    .post('/instance/view', cacheInstance)
    .post('/instance/view/pdf', cacheInstance)
    .post('/instance/edit', cacheInstance)
    .post('/instance/edit/c', cacheInstance)
    .post('/instance/edit/rfc', cacheInstance)
    .post('/instance/edit/rfc/c', cacheInstance)
    .post('/instance/edit/incomplete/rfc', cacheInstance)
    .post('/instance/edit/incomplete/rfc/c', cacheInstance)
    .post('/instance/note', cacheInstance)
    .post('/instance/note/c', cacheInstance)
    .post('/instance/edit/participant', cacheInstance)
    .post('/instance/headless', cacheInstance)
    .post('/instance/headless/rfc', cacheInstance)
    .all('*', (req, res, next) => {
        const error = new Error('Not allowed.');
        error.status = 405;
        next(error);
    });

function getVersion(req, res) {
    const version = req.app.get('version');
    _render(200, { version }, res);
}

// API uses Basic authentication with just the username
function authCheck(req, res, next) {
    // check authentication and account
    let error;
    const creds = auth(req);
    const key = creds ? creds.name : undefined;
    const server = req.body.server_url;

    // set content-type to json to provide appropriate json Error responses
    res.set('Content-Type', 'application/json');

    account
        .get(server)
        .then((account) => {
            if (!key || key !== account.key) {
                error = new Error('Not Allowed. Invalid API key.');
                error.status = 401;
                res.status(error.status).set(
                    'WWW-Authenticate',
                    'Basic realm="Enter valid API key as user name"'
                );
                next(error);
            } else {
                req.account = account;
                next();
            }
        })
        .catch(next);
}

function getNewOrExistingSurvey(req, res, next) {
    let status;
    const survey = {
        openRosaServer: req.body.server_url,
        openRosaId: req.body.form_id,
        theme: req.body.theme,
    };

    if (req.account.quota < req.account.quotaUsed) {
        return _render(403, quotaErrorMessage, res);
    }

    return surveyModel
        .getId(survey) // will return id only for existing && active surveys
        .then((id) => {
            if (!id && req.account.quota <= req.account.quotaUsed) {
                return _render(403, quotaErrorMessage, res);
            }
            status = id ? 200 : 201;

            // even if id was found still call .set() method to update any properties
            return surveyModel.set(survey).then((id) => {
                if (id) {
                    if (req.webformType === 'pdf') {
                        _renderPdf(status, id, req, res);
                    } else {
                        _render(status, _generateWebformUrls(id, req), res);
                    }
                } else {
                    _render(404, 'Survey not found.', res);
                }
            });
        })
        .catch(next);
}

function emptySurveyCache(req, res, next) {
    return cacheModel
        .flush({
            openRosaServer: req.body.server_url,
            openRosaId: req.body.form_id,
        })
        .then(() => {
            _render(204, null, res);
        })
        .catch(next);
}

function cacheInstance(req, res, next) {
    let survey;
    let enketoId;

    if (req.account.quota < req.account.quotaUsed) {
        return _render(403, quotaErrorMessage, res);
    }

    survey = {
        openRosaServer: req.body.server_url,
        openRosaId: req.body.form_id,
        instance: req.body.instance,
        instanceId: req.body.instance_id,
        returnUrl: req.body.return_url,
        instanceAttachments: req.body.instance_attachments,
    };

    return surveyModel
        .getId(survey)
        .then((id) => {
            if (!id && req.account.quota <= req.account.quotaUsed) {
                return _render(403, quotaErrorMessage, res);
            }
            // Create a new enketo ID.
            if (!id) {
                return surveyModel.set(survey);
            }

            // Do not update properties if ID was found to avoid overwriting theme.
            return id;
        })
        .then((id) => {
            enketoId = id;
            // If the API call is for /instance/edit/*, make sure
            // to not allow caching if it is already cached as some lame
            // protection against multiple people edit the same record simultaneously
            const protect =
                !req.webformType.startsWith('view') &&
                !req.webformType.startsWith('pdf');

            return instanceModel.set(survey, protect);
        })
        .then(() => {
            const status = 201;
            if (req.webformType === 'pdf') {
                _renderPdf(status, enketoId, req, res);
            } else if (
                req.webformType === 'headless' ||
                req.webformType === 'headless-rfc'
            ) {
                _renderHeadless(status, enketoId, req, res);
            } else {
                _render(status, _generateWebformUrls(enketoId, req), res);
            }
        })
        .catch(next);
}

function removeInstance(req, res, next) {
    return instanceModel
        .remove({
            openRosaServer: req.body.server_url,
            openRosaId: req.body.form_id,
            instanceId: req.body.instance_id,
        })
        .then((instanceId) => {
            if (instanceId) {
                _render(204, null, res);
            } else {
                _render(404, 'Record not found.', res);
            }
        })
        .catch(next);
}

function _setQuotaUsed(req, res, next) {
    surveyModel
        .getNumber(req.account.linkedServer)
        .then((number) => {
            req.account.quotaUsed = number;
            next();
        })
        .catch(next);
}

function _setPage(req, res, next) {
    req.page = {};
    req.page.format = req.body.format || req.query.format;
    if (
        req.page.format &&
        !/^(Letter|Legal|Tabloid|Ledger|A0|A1|A2|A3|A4|A5|A6)$/.test(
            req.page.format
        )
    ) {
        const error = new Error('Format parameter is not valid.');
        error.status = 400;
        throw error;
    }
    req.page.landscape = req.body.landscape || req.query.landscape;
    if (req.page.landscape && !/^(true|false)$/.test(req.page.landscape)) {
        const error = new Error('Landscape parameter is not valid.');
        error.status = 400;
        throw error;
    }
    // convert to boolean
    req.page.landscape = req.page.landscape === 'true';
    req.page.margin = req.body.margin || req.query.margin;
    if (req.page.margin && !/^\d+(\.\d+)?(in|cm|mm)$/.test(req.page.margin)) {
        const error = new Error('Margin parameter is not valid.');
        error.status = 400;
        throw error;
    }
    /*
    TODO: scale has not been enabled yet, as it is not supported by Enketo Core's Grid print JS processing function.
    req.page.scale = req.body.scale || req.query.scale;
    if ( req.page.scale && !/^\d+$/.test( req.page.scale ) ) {
        const error = new Error( 'Scale parameter is not valid.' );
        error.status = 400;
        throw error;
    }
    // convert to number
    req.page.scale = Number( req.page.scale );
    */
    next();
}

function _setDefaultsQueryParam(req, res, next) {
    let queryParam = '';
    const map = req.body.defaults;

    if (map) {
        for (const prop in map) {
            if (Object.prototype.hasOwnProperty.call(map, prop)) {
                const paramKey = `d[${decodeURIComponent(prop)}]`;
                queryParam += `${encodeURIComponent(
                    paramKey
                )}=${encodeURIComponent(decodeURIComponent(map[prop]))}&`;
            }
        }
        req.defaultsQueryParam = queryParam.substring(0, queryParam.length - 1);
    }

    next();
}

function _setLangQueryParam(req, res, next) {
    const { lang } = req.body;

    if (lang) {
        req.langQueryParam = `lang=${encodeURIComponent(lang)}`;
    } else {
        req.langQueryParam = ``;
    }

    next();
}

function _setInterfaceQueryParam(req, res, next) {
    if (req.body.interface) {
        if (!['default', 'queries', 'sdv'].includes(req.body.interface)) {
            const error = new Error('Invalid value for interface parameter.');
            error.status = 400;
            next(error);
        } else {
            req.interfaceQueryParam = `interface=${req.body.interface}`;
        }
    } else {
        req.interfaceQueryParam = '';
    }
    next();
}

function _setGoTo(req, res, next) {
    const goTo = req.body.go_to;
    req.goTo = goTo ? `#${encodeURIComponent(goTo)}` : '';
    const goToErrorUrl = req.body.go_to_error_url;
    req.goToErrorUrl =
        goTo && goToErrorUrl
            ? `go_to_error_url=${encodeURIComponent(goToErrorUrl)}`
            : '';
    next();
}

function _setEcid(req, res, next) {
    const { ecid } = req.body;
    if (!ecid) {
        const error = new Error('Bad request. Ecid parameter required');
        error.status = 400;
        next(error);
    } else {
        req.ecid = `ecid=${encodeURIComponent(ecid)}`;
        next();
    }
}

function _setPid(req, res, next) {
    const { pid } = req.body;
    if (pid) {
        req.pid = `PID=${encodeURIComponent(pid)}`;
    }
    next();
}

function _setJini(req, res, next) {
    if (req.app.get('jini')['style url'] && req.app.get('jini')['script url']) {
        const { jini } = req.body;
        if (jini) {
            req.jini = `jini=${encodeURIComponent(jini)}`;
        }
    }
    next();
}

function _setLoadWarning(req, res, next) {
    const warning = req.body.load_warning;
    req.loadWarning = warning
        ? `load_warning=${encodeURIComponent(warning)}`
        : '';
    next();
}

function _setParentWindow(req, res, next) {
    const parentWindowOrigin = req.body.parent_window_origin;

    if (parentWindowOrigin) {
        req.parentWindowOriginParam = `parent_window_origin=${encodeURIComponent(
            parentWindowOrigin
        )}`;
    }
    next();
}

function _setNextPrompt(req, res, next) {
    const nextPrompt = req.body.next_prompt;

    if (nextPrompt) {
        req.nextPromptParam = `next_prompt=${encodeURIComponent(nextPrompt)}`;
    }
    next();
}

function _setReturnQueryParam(req, res, next) {
    const returnUrl = req.body.return_url;

    if (returnUrl) {
        req.returnQueryParam = `return_url=${encodeURIComponent(returnUrl)}`;
    }
    next();
}

function _generateQueryString(params = []) {
    let paramsJoined;

    paramsJoined = params.filter((part) => part && part.length > 0).join('&');

    return paramsJoined ? `?${paramsJoined}` : '';
}

function _generateWebformUrls(id, req) {
    const IFRAMEPATH = 'i/';
    const FSPATH = 'fs/';
    const OFFLINEPATH = 'x/';
    const incompletePart = req.incomplete ? 'inc/' : '';
    const dnClosePart = req.dnClose ? 'c/' : '';
    const rfcPart = req.rfc ? 'rfc/' : '';
    const hash = req.goTo;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const BASEURL = `${protocol}://${req.headers.host}${req.app.get(
        'base path'
    )}/`;
    const idView = `${utils.insecureAes192Encrypt(id, keys.view)}`;
    const idViewDn = `${utils.insecureAes192Encrypt(id, keys.viewDn)}`;
    const idEditRfc = `${utils.insecureAes192Encrypt(id, keys.editRfc)}`;
    const idEditRfcC = `${utils.insecureAes192Encrypt(id, keys.editRfcC)}`;
    const idViewDnC = `${utils.insecureAes192Encrypt(id, keys.viewDnC)}`;
    const idFsC = `${utils.insecureAes192Encrypt(id, keys.fsC)}`;
    const idFsParticipant = `${utils.insecureAes192Encrypt(
        id,
        keys.fsParticipant
    )}`;
    const idFullParticipant = `${utils.insecureAes192Encrypt(
        id,
        keys.fullParticipant
    )}`;
    const idEditHeadless = `${utils.insecureAes192Encrypt(
        id,
        keys.editHeadless
    )}`;
    const idPreview = utils.insecureAes192Encrypt(id, keys.preview);
    const idIncompleteRfc = utils.insecureAes192Encrypt(id, keys.incRfc);
    const idIncompleteRfcC = utils.insecureAes192Encrypt(id, keys.incRfcC);

    let url;

    const type = [req.webformType || 'single']
        .concat(
            ['participant', 'incomplete', 'rfc'].filter((prop) => req[prop])
        )
        .join('-');

    switch (type) {
        case 'preview': {
            const queryString = _generateQueryString([
                req.defaultsQueryParam,
                req.parentWindowOriginParam,
                req.goToErrorUrl,
                req.jini,
                req.nextPromptParam,
                req.langQueryParam,
            ]);
            url = `${BASEURL}preview/${IFRAMEPATH}${idPreview}${queryString}${hash}`;
            break;
        }
        case 'preview-participant': {
            const queryString = _generateQueryString([
                req.defaultsQueryParam,
                req.parentWindowOriginParam,
                req.goToErrorUrl,
                req.langQueryParam,
            ]);
            url = `${BASEURL}preview/participant/${IFRAMEPATH}${idFsParticipant}${queryString}${hash}`;
            break;
        }
        case 'edit':
        case 'edit-rfc':
        case 'edit-incomplete-rfc': {
            let idToUse;
            if (!req.rfc) {
                idToUse = req.dnClose ? idFsC : id;
            } else if (req.incomplete) {
                idToUse = req.dnClose ? idIncompleteRfcC : idIncompleteRfc;
            } else {
                idToUse = req.dnClose ? idEditRfcC : idEditRfc;
            }
            // TODO add tests that check that the Enketo ID generated is the correct one
            const queryString = _generateQueryString([
                req.ecid,
                req.pid,
                `instance_id=${req.body.instance_id}`,
                req.parentWindowOriginParam,
                req.returnQueryParam,
                req.goToErrorUrl,
                req.interfaceQueryParam,
                req.jini,
                req.langQueryParam,
            ]);
            url = `${BASEURL}edit/${FSPATH}${incompletePart}${rfcPart}${dnClosePart}${IFRAMEPATH}${idToUse}${queryString}${hash}`;
            break;
        }
        case 'headless':
        case 'headless-rfc': {
            const queryString = _generateQueryString([
                req.ecid,
                `instance_id=${req.body.instance_id}`,
                req.interfaceQueryParam,
                req.langQueryParam,
            ]);
            url = `${BASEURL}edit/${FSPATH}${rfcPart}headless/${idEditHeadless}${queryString}`;
            break;
        }
        case 'single':
        case 'single-rfc': {
            let idToUse;
            if (req.rfc) {
                idToUse = req.dnClose ? idIncompleteRfcC : idIncompleteRfc;
            } else {
                idToUse = req.dnClose ? idFsC : id;
            }

            const queryString = _generateQueryString([
                req.ecid,
                req.pid,
                req.defaultsQueryParam,
                req.returnQueryParam,
                req.parentWindowOriginParam,
                req.jini,
                req.nextPromptParam,
                req.langQueryParam,
            ]);
            url = `${BASEURL}single/${FSPATH}${rfcPart}${dnClosePart}${IFRAMEPATH}${idToUse}${queryString}`;
            break;
        }
        case 'single-participant': {
            const queryString = _generateQueryString([
                req.ecid,
                req.pid,
                req.defaultsQueryParam,
                req.returnQueryParam,
                req.parentWindowOriginParam,
                req.jini,
                req.langQueryParam,
            ]);
            url = `${BASEURL}single/${FSPATH}participant/${IFRAMEPATH}${idFsParticipant}${queryString}`;
            break;
        }
        case 'edit-participant': {
            const queryString = _generateQueryString([
                req.ecid,
                req.pid,
                `instance_id=${req.body.instance_id}`,
                req.defaultsQueryParam,
                req.returnQueryParam,
                req.parentWindowOriginParam,
                req.interfaceQueryParam,
                req.langQueryParam,
            ]);
            url = `${BASEURL}edit/${FSPATH}participant/${IFRAMEPATH}${idFsParticipant}${queryString}${hash}`;
            break;
        }
        case 'single-full-participant': {
            const queryString = _generateQueryString([
                req.ecid,
                req.pid,
                req.defaultsQueryParam,
                req.returnQueryParam,
                req.parentWindowOriginParam,
                req.jini,
                req.langQueryParam,
            ]);
            url = `${BASEURL}single/full/participant/${idFullParticipant}${queryString}`;
            break;
        }
        case 'full-offline-participant': {
            const queryString = _generateQueryString([
                req.ecid,
                req.pid,
                req.defaultsQueryParam,
                req.returnQueryParam,
                req.parentWindowOriginParam,
                req.jini,
                req.langQueryParam,
            ]);
            url = `${BASEURL}${OFFLINEPATH}full/participant/${idFullParticipant}${queryString}`;
            break;
        }
        case 'view':
        case 'view-instance': {
            const queryParts = [
                req.ecid,
                req.pid,
                req.parentWindowOriginParam,
                req.returnQueryParam,
                req.loadWarning,
                req.goToErrorUrl,
                req.interfaceQueryParam,
                req.langQueryParam,
            ];
            if (req.webformType === 'view-instance') {
                queryParts.unshift(`instance_id=${req.body.instance_id}`);
            }
            const queryString = _generateQueryString(queryParts);
            url = `${BASEURL}view/${FSPATH}${IFRAMEPATH}${idView}${queryString}${hash}`;
            break;
        }
        case 'note-instance': {
            const viewId = dnClosePart ? idViewDnC : idViewDn;
            const queryString = _generateQueryString([
                req.ecid,
                req.pid,
                `instance_id=${req.body.instance_id}`,
                req.parentWindowOriginParam,
                req.returnQueryParam,
                req.loadWarning,
                req.goToErrorUrl,
                req.interfaceQueryParam,
                req.langQueryParam,
            ]);
            url = `${BASEURL}edit/${FSPATH}dn/${dnClosePart}${IFRAMEPATH}${viewId}${queryString}${hash}`;
            break;
        }
        case 'pdf': {
            // We use the view-instance view because it is:
            // - has optional instance support
            // - has protection against accidental fieldsubmissions (extra layer of security)
            // - for now OC is planning to not add DN questions to the XForm if it doesn't want those printed
            const queryParts = [
                req.ecid,
                req.pid,
                'print=true',
                req.interfaceQueryParam,
                req.langQueryParam,
            ];
            if (req.body.instance_id) {
                queryParts.push(`instance_id=${req.body.instance_id}`);
            }
            const queryString = _generateQueryString(queryParts);
            url = `${BASEURL}view/${FSPATH}${idView}${queryString}`;
            break;
        }
        default:
            url = 'Could not generate a webform URL. Unknown webform type.';
            break;
    }

    return { url };
}

function _render(status, body, res) {
    if (status === 204) {
        // send 204 response without a body
        res.status(status).end();
    } else {
        body = body || {};
        if (typeof body === 'string') {
            body = {
                message: body,
            };
        }
        // body.code = status;
        res.status(status).json(body);
    }
}

function _renderPdf(status, id, req, res) {
    const { url } = _generateWebformUrls(id, req);

    return pdf
        .get(url, req.page)
        .then((pdfBuffer) => {
            const filename = `${req.body.form_id || req.query.form_id}${
                req.body.instance_id ? `-${req.body.instance_id}` : ''
            }.pdf`;
            // TODO: We've already set to json content-type in authCheck. This may be bad.
            res.set('Content-Type', 'application/pdf')
                .set('Content-disposition', `attachment;filename=${filename}`)
                .status(status)
                .end(pdfBuffer, 'binary');
        })
        .catch((e) => {
            _render(
                e.status || 500,
                `PDF generation failed: ${e.message}`,
                res
            );
        });
}

function _renderHeadless(status, id, req, res) {
    const { url } = _generateWebformUrls(id, req);

    return headless
        .run(url)
        .then((fieldsubmissions) => {
            const message = 'OK';
            const code = fieldsubmissions > 0 ? 201 : 200;
            res.status(code).json({ message, fieldsubmissions });
        })
        .catch((e) => {
            _render(e.status || 500, e.message, res);
        });
}

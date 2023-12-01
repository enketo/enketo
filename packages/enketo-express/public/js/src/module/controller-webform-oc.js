/**
 * Deals with the main high level survey controls for the special online-only auto-fieldsubmission view.
 *
 * Field values are automatically submitted upon change to a special OpenClinica Field Submission API.
 */

import downloadUtils from 'enketo-core/src/js/download-utils';
import $ from 'jquery';
import gui from './gui';
import connection from './connection';
import settings from './settings';
import { Form } from './form'; // modified for OC
import { FormModel } from './form-model'; // modified for OC
import fileManager from './file-manager';
import events from './event';
import {
    t,
    localize,
    getCurrentUiLanguage,
    getBrowserLanguage,
} from './translator';
import records from './records-queue';
import formCache from './form-cache';
import FieldSubmissionQueue from './field-submission-queue';
import rc from './controller-webform';
import reasons from './reasons';
import { replaceMediaSources, replaceModelMediaSources } from './media';

let fieldSubmissionQueue;
const DEFAULT_THANKS_URL = '/thanks';
let form;
let formData;
let formprogress;
let ignoreBeforeUnload = false;

const formOptions = {
    printRelevantOnly: settings.printRelevantOnly,
};
const inputUpdateEventBuffer = [];
const delayChangeEventBuffer = [];

/**
 * @typedef InstanceAttachment
 * @property {string} filename
 */

/**
 * @typedef ControllerWebformInitData
 * @property {string} modelStr
 * @property {string} instanceStr
 * @property {Document[]} external
 * @property {Survey} survey
 * @property {InstanceAttachment[]} [instanceAttachments]
 * @property {boolean} [isEditing]
 */

/**
 * @param {Element} formEl
 * @param {ControllerWebformInitData} data
 * @param {string[]} [loadErrors]
 * @return {Promise<Form>}
 */

/**
 * @typedef closeOptions
 * @property { boolean } autoQueries offer auto queries
 * @property { reasons } reasons reason-for-change
 */

function init(formEl, data, loadErrors = []) {
    const media = {
        ...data.survey.media,
        ...data.instanceAttachments,
    };

    replaceMediaSources(formEl, media, {
        isOffline: settings.offline,
    });

    formData = data;
    formprogress = document.querySelector('.form-progress');

    return (
        _initializeRecords()
            .then(() => {
                let staticDefaultNodes = [];
                let m;
                let goToErrors = [];
                let goToHiddenErrors = [];
                const goToErrorLink = settings.goToErrorUrl
                    ? `<a href="${settings.goToErrorUrl}">${settings.goToErrorUrl}</a>`
                    : '';

                if (data.survey.instanceAttachments) {
                    fileManager.setInstanceAttachments(
                        data.survey.instanceAttachments
                    );
                }

                const langSelector = formEl.querySelector('#form-languages');
                const formDefaultLanguage = langSelector
                    ? langSelector.dataset.defaultLang
                    : undefined;
                const browserLanguage = getBrowserLanguage();

                // Determine which form language to load
                if (settings.languageOverrideParameter) {
                    formOptions.language =
                        settings.languageOverrideParameter.value;
                } else if (
                    !formDefaultLanguage &&
                    langSelector &&
                    langSelector.querySelector(
                        `option[value="${browserLanguage}"]`
                    )
                ) {
                    formOptions.language = browserLanguage;
                }

                // Create separate model just to identify static default values.
                // We do this before the inputupdate listener to avoid triggering a fieldsubmission for instanceID
                // in duplicate/triplicate.
                if (!data.instanceStr) {
                    m = new FormModel({ modelStr: data.modelStr });
                    m.init();
                    staticDefaultNodes = [
                        ...m.node(null, null, { noEmpty: true }).getElements(),
                    ].filter(
                        (node) =>
                            node !== m.getMetaNode('instanceID').getElement()
                    );
                }
                form = new Form(formEl, data, formOptions);
                replaceModelMediaSources(form, media);

                fieldSubmissionQueue = new FieldSubmissionQueue({
                    showStatus:
                        settings.type !== 'view' && settings.type !== 'preview',
                });

                // Buffer inputupdate events (DURING LOAD ONLY), in order to eventually log these
                // changes in the DN widget after it has been initalized
                form.view.html.addEventListener(
                    events.InputUpdate().type,
                    _addToInputUpdateEventBuffer
                );
                // Delay firing change events that were the result of DN auto queries during load
                // These events have not yet updated the model and triggered fieldsubmissions because widgets are not
                // supposed to change values during initialization and no event handlers are in place at that time.
                form.view.html.addEventListener(
                    events.DelayChange().type,
                    _addToDelayChangeEventBuffer
                );

                // For Participant empty-form view in order to show Close button on all pages
                if (settings.participant && settings.type !== 'edit') {
                    form.view.html.classList.add('empty-untouched');
                }

                // Used in Participant views:
                // a hacky solution to change the default relevant message
                const list = form.view.html.querySelectorAll(
                    '[data-i18n="constraint.relevant"]'
                );
                for (let i = 0; i < list.length; i++) {
                    const relevantErrorMsg = t('constraint.relevant');
                    list[i].textContent = relevantErrorMsg;
                }

                // set form eventhandlers before initializing form
                _setFormEventHandlers();

                loadErrors = loadErrors.concat(form.init());

                // Determine whether UI language should be attempted to be switched.
                if (
                    getCurrentUiLanguage() !== form.currentLanguage &&
                    /^[a-z]{2,3}/.test(form.currentLanguage)
                ) {
                    localize(
                        document.querySelector('body'),
                        form.currentLanguage
                    ).then((dir) =>
                        document.querySelector('html').setAttribute('dir', dir)
                    );
                }

                // Create fieldsubmissions for static default values
                if (!settings.fullRecord) {
                    _addFieldsubmissionsForModelNodes(m, staticDefaultNodes);
                }

                // Fire change events for any auto queries that were generated during form initialization,
                // https://github.com/OpenClinica/enketo-express-oc/issues/393
                form.view.html.removeEventListener(
                    events.DelayChange().type,
                    _addToDelayChangeEventBuffer
                );
                delayChangeEventBuffer.forEach((el) =>
                    el.dispatchEvent(events.Change())
                );

                // Make sure audits are logged in DN widget for calculated values during form initialization
                // before the DN widget was initialized.
                form.view.html.removeEventListener(
                    events.InputUpdate().type,
                    _addToInputUpdateEventBuffer
                );
                inputUpdateEventBuffer.forEach((el) =>
                    el.dispatchEvent(events.FakeInputUpdate())
                );

                if (data.instanceStr) {
                    if (settings.reasonForChange) {
                        const complete = form.model.isMarkedComplete();
                        if (!settings.incompleteAllowed && !complete) {
                            loadErrors.push(
                                'This record is not complete and cannot be used here.'
                            );
                        } else if (settings.incompleteAllowed && complete) {
                            loadErrors.push(
                                'This record is complete and cannot be used here.'
                            );
                        }
                    }
                    if (!settings.headless) {
                        form.specialOcLoadValidate(
                            form.model.isMarkedComplete()
                        );
                    }
                }

                _setButtonEventHandlers(data.survey);

                // Remove loader. This will make the form visible.
                // In order to aggregate regular loadErrors and GoTo loaderrors,
                // this is placed in between form.init() and form.goTo().
                $('.main-loader').remove();
                if (settings.goTo && location.hash) {
                    const handleGoToIrrelevant = (e) => {
                        let err;
                        // In OC hidden go_to fields should show loadError
                        // regular questions:
                        if (!e.target.classList.contains('or-appearance-dn')) {
                            err = t('alert.goto.irrelevant');
                        }
                        // Discrepancy notes
                        else {
                            err = `${t('alert.goto.irrelevant')} `;
                            const goToErrorLink = settings.goToErrorUrl
                                ? `<a href="${settings.goToErrorUrl}">${settings.goToErrorUrl}</a>`
                                : '';
                            if (settings.interface === 'queries') {
                                err += goToErrorLink
                                    ? t('alert.goto.msg2', {
                                          miniform: goToErrorLink,
                                          // switch off escaping
                                          interpolation: {
                                              escapeValue: false,
                                          },
                                      })
                                    : t('alert.goto.msg1');
                            }
                        }
                        // For goto targets that are discrepancy notes and are relevant but their linked question is not,
                        // the goto-irrelevant event will be fired twice. We can safely remove the eventlistener after the first
                        // event is caught (for all cases).
                        form.view.html.removeEventListener(
                            events.GoToIrrelevant().type,
                            handleGoToIrrelevant
                        );
                        goToHiddenErrors = [err];
                        loadErrors.push(err);
                    };

                    const handleGoToInvisible = () => {
                        form.view.html.removeEventListener(
                            events.GoToInvisible().type,
                            handleGoToInvisible
                        );
                        if (settings.interface === 'sdv') {
                            loadErrors.push(`${t('alert.goto.invisible')} `);
                        }
                    };

                    form.view.html.addEventListener(
                        events.GoToIrrelevant().type,
                        handleGoToIrrelevant
                    );
                    form.view.html.addEventListener(
                        events.GoToInvisible().type,
                        handleGoToInvisible
                    );

                    // form.goTo returns an array of 1 error if it has error. We're using our special
                    // knowledge of Enketo Core to replace this error
                    goToErrors = form.goTo(
                        decodeURIComponent(location.hash.substring(1)).split(
                            '#'
                        )[0]
                    );
                    const replacementError = `${t('alert.goto.notfound')} `;
                    if (goToErrors.length) {
                        if (settings.interface === 'queries') {
                            goToErrors = goToErrorLink
                                ? [
                                      replacementError +
                                          t('alert.goto.msg2', {
                                              miniform: goToErrorLink,
                                              // switch off escaping
                                              interpolation: {
                                                  escapeValue: false,
                                              },
                                          }),
                                  ]
                                : [replacementError + t('alert.goto.msg1')];
                        } else {
                            goToErrors = [replacementError];
                        }
                    }
                    loadErrors = loadErrors.concat(goToErrors);
                }

                if (form.encryptionKey) {
                    loadErrors.unshift(
                        `<strong>${t('error.encryptionnotsupported')}</strong>`
                    );
                }

                _setLanguageUiEventHandlers();
                rc.setLogoutLinkVisibility();

                const numberOfNotSoSeriousErrors =
                    (loadErrors[0] && loadErrors[0] === settings.loadWarning
                        ? 1
                        : 0) +
                    goToErrors.length +
                    goToHiddenErrors.length;
                if (loadErrors.length > numberOfNotSoSeriousErrors) {
                    document
                        .querySelectorAll(
                            '.form-footer__content__main-controls button'
                        )
                        .forEach((button) => button.remove());

                    throw loadErrors;
                } else {
                    if (
                        settings.type !== 'view' &&
                        settings.type !== 'preview'
                    ) {
                        console.info('Submissions enabled');
                        // Current queue can be submitted, and so can future fieldsubmissions.
                        fieldSubmissionQueue.enable();
                        fieldSubmissionQueue.submitAll();
                    }
                    if (loadErrors.length) {
                        throw loadErrors;
                    }
                }

                return form;
            })
            .catch((error) => {
                if (Array.isArray(error)) {
                    loadErrors = error;
                } else {
                    loadErrors.unshift(error.message || t('error.unknown'));
                }

                const advice = data.instanceStr
                    ? t('alert.loaderror.editadvice')
                    : t('alert.loaderror.entryadvice');
                gui.alertLoadErrors(loadErrors, advice);
            })
            .then(() => {
                if (settings.headless) {
                    let action;
                    console.log('doing headless things');
                    gui.prompt = () => Promise.resolve(true);
                    gui.confirm = () => Promise.resolve(true);
                    gui.confirmAutoQueries = () => Promise.resolve(true);

                    if (loadErrors.length) {
                        action = Promise.reject(new Error(loadErrors[0]));
                    } else if (settings.reasonForChange) {
                        action = _complete(true, {
                            autoQueries: true,
                            reasons: true,
                        });
                    } else {
                        action = _close({ autoQueries: true });
                    }

                    const result = {};

                    return action
                        .catch((error) => {
                            result.error = error.message;
                        })
                        .finally(() => {
                            result.fieldsubmissions =
                                fieldSubmissionQueue.submittedCounter;
                            gui.showHeadlessResult(result);
                        });
                }
            })
            // OC will return even if there were errors
            .then(() => form)
    );
}

function _addToInputUpdateEventBuffer(event) {
    inputUpdateEventBuffer.push(event.target);
}

function _addToDelayChangeEventBuffer(event) {
    delayChangeEventBuffer.push(event.target);
}

function _initializeRecords() {
    if (!settings.offline) {
        return Promise.resolve();
    }

    return records.init();
}

/**
 * Submit fieldsubmissions for all provided model (leaf) nodes. Meant to submit static defaults.
 *
 * @param model
 * @param {*} modelNodes
 */
function _addFieldsubmissionsForModelNodes(model, modelNodes) {
    modelNodes.forEach((node) => {
        const props = model.getUpdateEventData(node);
        fieldSubmissionQueue.addFieldSubmission(
            props.fullPath,
            props.xmlFragment,
            form.instanceID
        );
    });
}

/**
 * Controller function to reset to the initial state of a form.
 *
 * That event listener has been removed in favor of calling `updateMedia` directly with
 * the current state of `survey` in offline mode. This change is being called out in
 * case the removal of that event listener impacts downstream forks.
 *
 * @param {Survey} survey
 * @param {ResetFormOptions} [options]
 */
function _resetForm(survey, options = {}) {
    const formEl = form.resetView();
    form = new Form(
        formEl,
        {
            modelStr: formData.modelStr,
            external: formData.external,
        },
        formOptions
    );

    replaceModelMediaSources(form, survey.media);

    const loadErrors = form.init();
    // formreset event will update the form media:
    form.view.html.dispatchEvent(events.FormReset());

    if (options.isOffline) {
        formCache.updateMedia(survey);
    }

    if (records) {
        records.setActive(null);
    }

    if (loadErrors.length > 0) {
        gui.alertLoadErrors(loadErrors);
    }
}

/**
 * Closes the form after checking that the queue is empty.
 *
 * @param {closeOptions} options
 * @return {Promise} [description]
 */
function _close(options = { autoQueries: false, reasons: false }) {
    // If the form is untouched, and has not loaded a record, allow closing it without any checks.
    // TODO: can we ignore calculations?
    if (
        settings.type !== 'edit' &&
        (Object.keys(fieldSubmissionQueue.get()).length === 0 ||
            !fieldSubmissionQueue.enabled) &&
        fieldSubmissionQueue.submittedCounter === 0
    ) {
        return Promise.resolve().then(() => {
            gui.alert(
                t('alert.submissionsuccess.redirectmsg'),
                null,
                'success'
            );
            // this event is used in communicating back to iframe parent window
            document.dispatchEvent(events.Close());
            _redirect(600);
        });
    }

    if (options.reasons) {
        if (!reasons.validate()) {
            const firstInvalidInput = reasons.getFirstInvalidField();
            const msg = t(
                'fieldsubmission.alert.reasonforchangevalidationerror.msg'
            );
            gui.alert(msg);
            firstInvalidInput.scrollIntoView();
            firstInvalidInput.focus();

            return Promise.reject(new Error(msg));
        }
        reasons.clearAll();
    }

    return form.validate().then((valid) => {
        if (!valid) {
            if (options.autoQueries) {
                const violations = [
                    ...form.view.html.querySelectorAll(
                        '.invalid-constraint, .invalid-relevant'
                    ),
                ]
                    // The comment-status filter is actually only for invalid-relevant, because
                    // invalid required and constraints would never have 'new' or 'updated'
                    // query status (coded in the XForm logic).
                    .filter(
                        (question) =>
                            !question.querySelector(
                                '.btn-comment.new, .btn-comment.updated'
                            ) ||
                            question.matches(
                                '.or-group.invalid-relevant, .or-group-data.invalid-relevant'
                            )
                    );

                // First check if any constraints have been violated and prompt option to generate automatic queries
                if (violations.length) {
                    return gui.confirmAutoQueries().then((confirmed) => {
                        if (!confirmed) {
                            return;
                        }
                        _autoAddQueries(violations);
                        const newOptions = { ...options };
                        newOptions.autoQueries = false;

                        return _close(newOptions);
                    });
                }
            }
            // Note, if _close is called with options.autoQueries,
            // the autoQueries should have fixed constraint and required violations when close is called again.
            // However, relevant violations are not fixed by autoqueries.
            const strictViolations = form.view.html.querySelector(
                settings.strictViolationSelector
            );

            if (settings.participant && strictViolations) {
                throw new Error(
                    t('fieldsubmission.alert.participanterror.msg')
                );
            }
        }

        const tAlertCloseMsg = t('fieldsubmission.alert.close.msg1');
        const tAlertCloseHeading = t('fieldsubmission.alert.close.heading1');
        const authLink = `<a href="/login" target="_blank">${t('here')}</a>`;

        // Start with actually closing, but only proceed once the queue is emptied.
        gui.alert(
            `${tAlertCloseMsg}<br/><div class="loader-animation-small" style="margin: 40px auto 0 auto;"/>`,
            tAlertCloseHeading,
            'bare'
        );

        let msg = '';

        return fieldSubmissionQueue
            .submitAll()
            .then(() => {
                if (
                    fieldSubmissionQueue.enabled &&
                    Object.keys(fieldSubmissionQueue.get()).length > 0
                ) {
                    throw new Error(t('fieldsubmission.alert.close.msg2'));
                } else {
                    // this event is used in communicating back to iframe parent window
                    document.dispatchEvent(events.Close());

                    msg += t('alert.submissionsuccess.redirectmsg');
                    gui.alert(
                        msg,
                        t('alert.submissionsuccess.heading'),
                        'success'
                    );
                    _redirect();
                }
            })
            .catch((error) => {
                let errorMsg;
                error = error || {};

                console.error('close error', error);
                if (error.status === 401) {
                    errorMsg = t('alert.submissionerror.authrequiredmsg', {
                        here: authLink,
                    });
                    gui.alert(errorMsg, t('alert.submissionerror.heading'));
                } else {
                    errorMsg =
                        error.message || gui.getErrorResponseMsg(error.status);
                    gui.confirm(
                        {
                            heading: t('alert.default.heading'),
                            errorMsg,
                            msg: t('fieldsubmission.confirm.leaveanyway.msg'),
                        },
                        {
                            posButton: t('confirm.default.negButton'),
                            negButton: t(
                                'fieldsubmission.confirm.leaveanyway.button'
                            ),
                        }
                    ).then((confirmed) => {
                        if (!confirmed) {
                            document.dispatchEvent(events.Close());
                            _redirect(100);
                        }
                    });
                }
                if (settings.headless) {
                    throw new Error(errorMsg);
                }
            });
    });
}

function _redirect(msec) {
    if (settings.headless) {
        return true;
    }
    ignoreBeforeUnload = true;
    setTimeout(() => {
        location.href = decodeURIComponent(
            settings.returnUrl || DEFAULT_THANKS_URL
        );
    }, msec || 1200);
}

/**
 * Finishes a submission
 *
 * @param {boolean} bypassConfirmation
 * @param {closeOptions} options
 */
function _complete(
    bypassConfirmation = false,
    options = { autoQueries: false, reasons: false }
) {
    if (!bypassConfirmation) {
        return gui
            .confirm({
                heading: t('fieldsubmission.confirm.complete.heading'),
                msg: t('fieldsubmission.confirm.complete.msg'),
            })
            .then((again) => {
                if (again) {
                    return _complete(true, options);
                }
            });
    }

    if (options.reasons) {
        if (!reasons.validate()) {
            const firstInvalidInput = reasons.getFirstInvalidField();
            const msg = t(
                'fieldsubmission.alert.reasonforchangevalidationerror.msg'
            );
            gui.alert(msg);
            firstInvalidInput.scrollIntoView();
            firstInvalidInput.focus();

            return Promise.reject(new Error(msg));
        }
        reasons.clearAll();
    }

    // form.validate() will trigger fieldsubmissions for timeEnd before it resolves
    return form.validate().then((valid) => {
        if (!valid) {
            const strictViolations = form.view.html.querySelector(
                settings.strictViolationSelector
            );

            if (strictViolations && !form.model.isMarkedComplete()) {
                throw new Error(
                    t('fieldsubmission.alert.participanterror.msg')
                );
            } else if (
                !form.model.isMarkedComplete() &&
                form.view.html.querySelector('.invalid-relevant')
            ) {
                const msg = t(
                    'fieldsubmission.alert.relevantvalidationerror.msg'
                );
                throw new Error(msg);
            }

            if (options.autoQueries) {
                // Note that unlike in _close, this function also looks at .invalid-required.
                const violations = [
                    ...form.view.html.querySelectorAll(
                        '.invalid-constraint, .invalid-required, .invalid-relevant'
                    ),
                ]
                    // The comment-status filter is actually only for invalid-relevant, because
                    // invalid required and constraints would never have 'new' or 'updated'
                    // query status (coded in the XForm logic).
                    .filter(
                        (question) =>
                            !question.querySelector(
                                '.btn-comment.new, .btn-comment.updated'
                            ) ||
                            question.matches(
                                '.or-group.invalid-relevant, .or-group-data.invalid-relevant'
                            )
                    );

                console.log('violations', violations);

                if (violations.length) {
                    return gui.confirmAutoQueries().then((confirmed) => {
                        if (!confirmed) {
                            return;
                        }
                        _autoAddQueries(violations);
                        const newOptions = { ...options };
                        newOptions.autoQueries = false;

                        return _complete(true, newOptions);
                    });
                }
            } else if (
                !form.model.isMarkedComplete()
                // A complete record with errors will have passed through the
                // autoquery stage first. Therefore its errors are now acceptable even though
                // relevant errors and strict errors will not have been resolved by the autoqueries
            ) {
                const msg = t('fieldsubmission.alert.validationerror.msg');
                throw new Error(msg);
            }
        }

        let beforeMsg;
        let authLink;
        let instanceId;
        let deprecatedId;
        let msg = '';

        form.view.html.dispatchEvent(events.BeforeSave());

        beforeMsg = t('alert.submission.redirectmsg');
        authLink = `<a href="/login" target="_blank">${t('here')}</a>`;

        gui.alert(
            `${beforeMsg}<div class="loader-animation-small" style="margin: 40px auto 0 auto;"/>`,
            t('alert.submission.msg'),
            'bare'
        );

        return fieldSubmissionQueue
            .submitAll()
            .then(() => {
                if (Object.keys(fieldSubmissionQueue.get()).length === 0) {
                    instanceId = form.instanceID;
                    deprecatedId = form.deprecatedID;
                    if (!form.model.isMarkedComplete()) {
                        return fieldSubmissionQueue.complete(
                            instanceId,
                            deprecatedId
                        );
                    }
                } else {
                    throw new Error(t('fieldsubmission.alert.complete.msg'));
                }
            })
            .then(() => {
                // this event is used in communicating back to iframe parent window
                document.dispatchEvent(events.SubmissionSuccess());

                msg += t('alert.submissionsuccess.redirectmsg');
                gui.alert(msg, t('alert.submissionsuccess.heading'), 'success');
                _redirect();
            })
            .catch((result) => {
                result = result || {};

                if (result.status === 401) {
                    msg = t('alert.submissionerror.authrequiredmsg', {
                        here: authLink,
                    });
                } else {
                    msg =
                        result.message ||
                        gui.getErrorResponseMsg(result.status);
                }
                gui.alert(msg, t('alert.submissionerror.heading'));
                // meant to be used in headless mode to output in API response
                throw new Error(msg);
            });
    });
}

function _getRecordName() {
    return records
        .getCounterValue(settings.enketoId)
        .then(
            (count) =>
                form.instanceName ||
                form.recordName ||
                `${form.surveyName} - ${count}`
        );
}

/**
 *
 * @param {string} recordName - proposed name of the record
 * @param {boolean} draft - whether the record is a draft
 * @param {string} [errorMsg] - error message to show
 */
function _confirmRecordName(recordName, draft, errorMsg) {
    const texts = {
        msg: '',
        heading: draft
            ? t('formfooter.savedraft.label')
            : t('alert.submissionerror.heading'),
        errorMsg,
    };
    const choices = {
        posButton: draft
            ? t('confirm.save.posButton')
            : t('formfooter.submit.btn'),
        negButton: t('confirm.default.negButton'),
    };
    const inputs = `<label><span>${t(
        'confirm.save.name'
    )}</span><span class="or-hint active">${
        draft ? t('confirm.save.hint') : ''
    }</span><input name="record-name" type="text" value="${recordName}"required /></label>`;

    return gui.prompt(texts, choices, inputs).then((values) => {
        if (values) {
            return values['record-name'];
        }
        throw new Error('Cancelled by user');
    });
}

/**
 * Used to submit a full record.
 * This function does not save the record in the browser storage
 * and is not used in offline-capable views.
 */
function _submitRecord() {
    let authLink;
    let level;
    let msg = '';
    const include = { irrelevant: false };

    form.view.html.dispatchEvent(events.BeforeSave());

    authLink = `<a href="${settings.loginUrl}" target="_blank">${t(
        'here'
    )}</a>`;

    gui.alert(
        `${t(
            'alert.submission.redirectmsg'
        )}<div class="loader-animation-small" style="margin: 40px auto 0 auto;"/>`,
        t('alert.submission.msg'),
        'bare'
    );

    return fileManager
        .getCurrentFiles()
        .then((files) => {
            const record = {
                enketoId: settings.enketoId,
                xml: form.getDataStr(include),
                files,
                instanceId: form.instanceID,
                deprecatedId: form.deprecatedID,
            };

            return record;
        })
        .then((record) => connection.uploadQueuedRecord(record))
        .then((result) => {
            result = result || {};
            level = 'success';

            if (result.failedFiles && result.failedFiles.length > 0) {
                msg = `${t('alert.submissionerror.fnfmsg', {
                    failedFiles: result.failedFiles.join(', '),
                    supportEmail: settings.supportEmail,
                })}<br/>`;
                level = 'warning';
            }
        })
        .then(() => {
            // this event is used in communicating back to iframe parent window
            document.dispatchEvent(events.SubmissionSuccess());
            msg += t('alert.submissionsuccess.redirectmsg');
            gui.alert(msg, t('alert.submissionsuccess.heading'), level);
            setTimeout(() => {
                location.href = decodeURIComponent(
                    settings.returnUrl || settings.defaultReturnUrl
                );
            }, 1200);
        })
        .catch((result) => {
            let message;
            result = result || {};
            console.error('submission failed', result);
            if (result.status === 401) {
                message = t('alert.submissionerror.authrequiredmsg', {
                    here: authLink,
                    // switch off escaping just for this known safe value
                    interpolation: {
                        escapeValue: false,
                    },
                });
            } else {
                message =
                    result.message || gui.getErrorResponseMsg(result.status);
            }
            gui.alert(message, t('alert.submissionerror.heading'));
        });
}

/**
 * @param {Survey} survey
 * @param {boolean} draft - whether the record is a draft
 * @param {string} [recordName] - proposed name of the record
 * @param {boolean} [confirmed] - whether the name of the record has been confirmed by the user
 */
function _saveRecord(survey, draft, recordName, confirmed) {
    const include = { irrelevant: draft };

    // triggering "before-save" event to update possible "timeEnd" meta data in form
    form.view.html.dispatchEvent(events.BeforeSave());

    // check recordName
    if (!recordName) {
        return _getRecordName().then((name) =>
            _saveRecord(survey, draft, name, false)
        );
    }

    // check whether record name is confirmed if necessary
    if (draft && !confirmed) {
        return _confirmRecordName(recordName, draft)
            .then((name) => _saveRecord(survey, draft, name, true))
            .catch(() => {});
    }

    return fileManager
        .getCurrentFiles()
        .then((files) =>
            // build the record object
            ({
                draft,
                xml: form.getDataStr(include),
                name: recordName,
                instanceId: form.instanceID,
                deprecateId: form.deprecatedID,
                enketoId: settings.enketoId,
                files,
            })
        )
        .then((record) => {
            // Change file object for database, not sure why this was chosen.
            record.files = record.files.map((file) =>
                typeof file === 'string'
                    ? {
                          name: file,
                      }
                    : {
                          name: file.name,
                          item: file,
                      }
            );

            // Save the record, determine the save method
            const saveMethod = form.recordName ? 'update' : 'set';

            return records.save(saveMethod, record);
        })
        .then(() => {
            records.removeAutoSavedRecord();
            _resetForm(survey, { isOffline: true });

            if (draft) {
                gui.alert(
                    t('alert.recordsavesuccess.draftmsg'),
                    t('alert.savedraftinfo.heading'),
                    'info',
                    5
                );
                return true;
            }

            return records.uploadQueue({ isUserTriggered: !draft });
        })
        .catch((error) => {
            console.error('save error', error);
            let errorMsg = error.message;
            if (
                !errorMsg &&
                error.target &&
                error.target.error &&
                error.target.error.name &&
                error.target.error.name.toLowerCase() === 'constrainterror'
            ) {
                return _confirmRecordName(
                    recordName,
                    draft,
                    t('confirm.save.existingerror')
                ).then((name) => _saveRecord(survey, draft, name, true));
            }
            if (!errorMsg) {
                errorMsg = t('confirm.save.unkownerror');
            }
            gui.alert(errorMsg, 'Save Error');
        });
}

/**
 * Loads a record from storage
 *
 * @param {Survey} survey
 * @param {string} instanceId - [description]
 * @param {=boolean?} confirmed -  [description]
 */
function _loadRecord(survey, instanceId, confirmed) {
    let texts;
    let choices;
    let loadErrors;

    if (!confirmed && form.editStatus) {
        texts = {
            msg: t('confirm.discardcurrent.msg'),
            heading: t('confirm.discardcurrent.heading'),
        };
        choices = {
            posButton: t('confirm.discardcurrent.posButton'),
        };
        gui.confirm(texts, choices).then((confirmed) => {
            if (confirmed) {
                _loadRecord(survey, instanceId, true);
            }
        });
    } else {
        records
            .get(instanceId)
            .then((record) => {
                if (!record || !record.xml) {
                    return gui.alert(t('alert.recordnotfound.msg'));
                }

                const formEl = form.resetView();
                form = new Form(
                    formEl,
                    {
                        modelStr: formData.modelStr,
                        instanceStr: record.xml,
                        external: formData.external,
                        submitted: false,
                    },
                    formOptions
                );
                loadErrors = form.init();

                form.view.html.dispatchEvent(events.FormReset());

                formCache.updateMedia(survey);

                form.recordName = record.name;
                records.setActive(record.instanceId);

                if (loadErrors.length > 0) {
                    throw loadErrors;
                } else {
                    gui.feedback(
                        t('alert.recordloadsuccess.msg', {
                            recordName: record.name,
                        }),
                        2
                    );
                }
                $('.side-slider__toggle.close').click();
            })
            .catch((errors) => {
                console.error('load errors: ', errors);
                if (!Array.isArray(errors)) {
                    errors = [errors.message];
                }
                gui.alertLoadErrors(errors, t('alert.loaderror.editadvice'));
            });
    }
}

/**
 * Triggers auto queries.
 *
 * @param {*} $questions
 * @param questions
 */
function _autoAddQueries(questions) {
    questions.forEach((q) => {
        if (q.matches('.question')) {
            q.dispatchEvent(events.AddQuery());
        } else if (
            q.matches(
                '.or-group.invalid-relevant, .or-group-data.invalid-relevant'
            )
        ) {
            q.querySelectorAll('.question:not(.or-appearance-dn)').forEach(
                (el) => el.dispatchEvent(events.AddQuery())
            );
        }
    });
}

function _autoAddReasonQueries(rfcInputs) {
    rfcInputs.forEach((input) => {
        input.dispatchEvent(
            events.ReasonChange({
                type: 'autoquery',
                reason: t('widget.dn.autonoreason'),
            })
        );
    });
}

function _doNotSubmit(fullPath) {
    // no need to check on cloned radiobuttons, selects or textareas
    const pathWithoutPositions = fullPath.replace(/\[[0-9]+\]/g, '');

    return !!form.view.html.querySelector(
        `input[data-oc-external="clinicaldata"][name="${pathWithoutPositions}"],
         input[data-oc-external="signature"][name="${pathWithoutPositions}"]`
    );
}

function _setFormEventHandlers() {
    form.view.html.addEventListener(events.ProgressUpdate().type, (event) => {
        if (
            event.target.classList.contains('or') &&
            formprogress &&
            event.detail
        ) {
            formprogress.style.width = `${event.detail}%`;
        }
    });

    // field submission triggers, only for online-only views
    if (!settings.fullRecord) {
        // Trigger fieldsubmissions for static defaults in added repeat instance
        // It is important that this listener comes before the NewRepeat and AddRepeat listeners in enketo-core
        // that will also run setvalue/odk-new-repeat actions, calculations, and other stuff
        form.view.html.addEventListener(events.NewRepeat().type, (event) => {
            // Note: in XPath, a predicate position is 1-based! The event.detail includes a 0-based index.
            const selector = `${event.detail.repeatPath}[${
                event.detail.repeatIndex + 1
            }]//*`;
            const staticDefaultNodes = [
                ...form.model
                    .node(selector, null, { noEmpty: true })
                    .getElements(),
            ];
            _addFieldsubmissionsForModelNodes(form.model, staticDefaultNodes);
        });

        // After repeat removal from view (before removal from model)
        form.view.html.addEventListener(events.Removed().type, (event) => {
            const updated = event.detail || {};
            const instanceId = form.instanceID;

            if (!updated.nodeName) {
                console.error(
                    'Could not submit repeat removal fieldsubmission. Node name is missing.'
                );

                return;
            }
            if (!updated.ordinal) {
                console.error(
                    'Could not submit repeat removal fieldsubmission. Ordinal is missing.'
                );

                return;
            }

            if (!instanceId) {
                console.error(
                    'Could not submit repeat removal fieldsubmission. InstanceID missing'
                );

                return;
            }

            postHeartbeat();

            fieldSubmissionQueue.addRepeatRemoval(
                updated.nodeName,
                updated.ordinal,
                instanceId
            );
            fieldSubmissionQueue.submitAll();
        });
        // Field is changed
        form.view.html.addEventListener(events.DataUpdate().type, (event) => {
            const updated = event.detail || {};
            const instanceId = form.instanceID;
            let filePromise;

            if (updated.cloned) {
                // This event is fired when a repeat is cloned. It does not trigger
                // a fieldsubmission.
                return;
            }

            // This is a bit of a hacky test for /meta/instanceID and /meta/deprecatedID. Both meta and instanceID nodes could theoretically have any namespace prefix.
            // and if the namespace is not in the default or the "http://openrosa.org/xforms" namespace it should actually be submitted.
            if (
                /meta\/(.*:)?instanceID$/.test(updated.fullPath) ||
                /meta\/(.*:)?deprecatedID$/.test(updated.fullPath)
            ) {
                return;
            }

            if (!updated.xmlFragment) {
                console.error(
                    'Could not submit field. XML fragment missing. (If repeat was deleted, this is okay.)'
                );

                return;
            }
            if (!instanceId) {
                console.error('Could not submit field. InstanceID missing');

                return;
            }
            if (!updated.fullPath) {
                console.error('Could not submit field. Path missing.');
            }
            if (_doNotSubmit(updated.fullPath)) {
                return;
            }
            if (updated.file) {
                filePromise = fileManager.getCurrentFile(updated.file);
            } else {
                filePromise = Promise.resolve();
            }

            // remove the Participate class that shows a Close button on every page
            form.view.html.classList.remove('empty-untouched');

            // Only now will we check for the deprecatedID value, which at this point should be (?)
            // populated at the time the instanceID dataupdate event is processed and added to the fieldSubmission queue.
            postHeartbeat();
            filePromise.then((file) => {
                fieldSubmissionQueue.addFieldSubmission(
                    updated.fullPath,
                    updated.xmlFragment,
                    instanceId,
                    form.deprecatedID,
                    file
                );
                fieldSubmissionQueue.submitAll();
            });
        });
    } else {
        console.info(
            'offline-capable so not setting fieldsubmission  handlers'
        );
    }

    if (settings.type !== 'preview') {
        form.view.html.addEventListener(
            events.SignatureRequested().type,
            (event) => {
                const resetQuestion = () => {
                    event.target.checked = false;
                    event.target.dispatchEvent(events.Change());
                };

                form.validate().then((valid) => {
                    if (valid) {
                        let timeoutId;
                        const receiveMessage = (evt) => {
                            // TODO: remove this temporary logging
                            console.log(
                                `evt.origin: ${evt.origin}, settings.parentWindowOrigin: ${settings.parentWindowOrigin}`
                            );
                            console.log('msg received: ', JSON.parse(evt.data));
                            if (evt.origin === settings.parentWindowOrigin) {
                                const msg = JSON.parse(evt.data);
                                if (
                                    msg.event === 'signature-request-received'
                                ) {
                                    clearTimeout(timeoutId);
                                } else if (
                                    msg.event === 'signature-request-failed'
                                ) {
                                    clearTimeout(timeoutId);
                                    resetQuestion();
                                    window.removeEventListener(
                                        'message',
                                        receiveMessage
                                    );
                                }
                            } else {
                                console.error(
                                    'message received from untrusted source'
                                );
                            }
                        };
                        const failHandler = () => {
                            resetQuestion();
                            window.removeEventListener(
                                'message',
                                receiveMessage
                            );
                            gui.alert(
                                t(
                                    'fieldsubmission.alert.signatureservicenotavailable.msg'
                                )
                            );
                        };
                        timeoutId = setTimeout(failHandler, 3 * 1000);
                        window.addEventListener(
                            'message',
                            receiveMessage,
                            false
                        );
                        rc.postEventAsMessageToParentWindow(event);
                    } else {
                        // If this logic becomes complex, with autoqueries, rfc e.g., consider using
                        // code in the _complete or _close functions to avoid duplication
                        resetQuestion();
                        gui.alert(
                            t('fieldsubmission.alert.participanterror.msg')
                        );
                    }
                });
            }
        );
    }

    // Before repeat removal from view and model
    if (settings.reasonForChange) {
        $('.form-footer')
            .find('.next-page, .last-page, .previous-page, .first-page')
            .on('click', (evt) => {
                const valid = reasons.validate();
                if (!valid) {
                    evt.stopImmediatePropagation();

                    return false;
                }
                reasons.clearAll();

                return true;
            });
    }
}

function _setLanguageUiEventHandlers() {
    // This actually belongs in gui.js but that module doesn't have access to the form object.
    // Enketo core takes care of language switching of the form itself, i.e. all language strings in the form definition.
    // This handler does the UI around the form, as well as the UI inside the form that are part of the application.
    const formLanguages = document.querySelector('#form-languages');
    if (formLanguages) {
        formLanguages.addEventListener(events.Change().type, (event) => {
            event.preventDefault();
            console.log('ready to set UI lang', form.currentLanguage);
            localize(document.querySelector('body'), form.currentLanguage).then(
                (dir) => document.querySelector('html').setAttribute('dir', dir)
            );
        });
    }

    // This actually belongs in gui.js but that module doesn't have access to the form object.
    // This handler is also used in forms that have no translation (and thus no defined language).
    // See scenario X in https://docs.google.com/spreadsheets/d/1CigMLAQewcXi-OJJHi_JQQ-fJXOam99livM0oYrtbkk/edit#gid=1504432290
    document.addEventListener(events.AddRepeat().type, (event) => {
        localize(event.target, form.currentLanguage);
    });
}

/**
 * @param {Survey} survey
 */
function _setButtonEventHandlers(survey) {
    const completeButton = document.querySelector('button#complete-form');
    if (completeButton) {
        const options = {
            autoQueries: settings.autoQueries,
            reasons: settings.reasonForChange,
        };
        completeButton.addEventListener('click', () => {
            const $button = $(completeButton).btnBusyState(true);
            _complete(form.model.isMarkedComplete(), options)
                .catch((e) => {
                    gui.alert(e.message);
                })
                .then(() => {
                    $button.btnBusyState(false);
                });

            return false;
        });
    }

    const closeButton = document.querySelector('button#close-form');
    if (closeButton) {
        const options = {
            autoQueries: settings.autoQueries,
            reasons: settings.reasonForChange,
        };
        closeButton.addEventListener('click', () => {
            const $button = $(closeButton).btnBusyState(true);
            _close(options)
                .catch((e) => {
                    gui.alert(e.message);
                })
                .then(() => {
                    $button.btnBusyState(false);
                });

            return false;
        });
    }

    const exitButton = document.querySelector('button#exit-form');
    if (exitButton) {
        exitButton.addEventListener('click', () => {
            document.dispatchEvent(events.Exit());
            _redirect(100);
        });
    }

    $('button#validate-form:not(.disabled)').click(function () {
        if (typeof form !== 'undefined') {
            const $button = $(this);
            $button.btnBusyState(true);
            setTimeout(() => {
                form.validate()
                    .then((valid) => {
                        $button.btnBusyState(false);
                        if (!valid) {
                            if (settings.strictViolationSelector) {
                                const strictViolations =
                                    form.view.html.querySelector(
                                        settings.strictViolationSelector
                                    );
                                if (strictViolations) {
                                    gui.alert(
                                        t(
                                            'fieldsubmission.confirm.autoquery.msg1'
                                        ),
                                        null,
                                        'oc-strict-error'
                                    );
                                } else {
                                    gui.alert(t('alert.validationerror.msg'));
                                }
                            } else {
                                gui.alert(t('alert.validationerror.msg'));
                            }
                        } else {
                            gui.alert(
                                t('alert.validationsuccess.msg'),
                                t('alert.validationsuccess.heading'),
                                'success'
                            );
                        }
                    })
                    .catch((e) => {
                        gui.alert(e.message);
                    })
                    .then(() => {
                        $button.btnBusyState(false);
                    });
            }, 100);
        }

        return false;
    });

    // Participant views that submit the whole record (i.e. not fieldsubmissions).
    if (settings.fullRecord) {
        $('button#submit-form').click(function () {
            const $button = $(this).btnBusyState(true);

            form.validate()
                .then((valid) => {
                    if (valid) {
                        if (settings.offline) {
                            return _saveRecord(survey, false);
                        }
                        return _submitRecord();
                    }
                    gui.alert(t('alert.validationerror.msg'));
                })
                .catch((e) => {
                    gui.alert(e.message);
                })
                .then(() => {
                    $button.btnBusyState(false);
                });

            return false;
        });

        const draftButton = document.querySelector('button#save-draft');
        if (draftButton) {
            draftButton.addEventListener('click', (event) => {
                if (!event.target.matches('.save-draft-info')) {
                    const $button = $(draftButton).btnBusyState(true);
                    setTimeout(() => {
                        _saveRecord(survey, true)
                            .then(() => {
                                $button.btnBusyState(false);
                            })
                            .catch((e) => {
                                $button.btnBusyState(false);
                                throw e;
                            });
                    }, 100);
                }
            });
        }

        $('.record-list__button-bar__button.upload').on('click', () => {
            records.uploadQueue({ isUserTriggered: true });
        });

        $('.record-list__button-bar__button.export').on('click', () => {
            const downloadLink =
                '<a class="vex-dialog-link" id="download-export" href="#">download</a>';

            records
                .exportToZip(form.surveyName)
                .then((zipFile) => {
                    gui.alert(
                        t('alert.export.success.msg') + downloadLink,
                        t('alert.export.success.heading'),
                        'normal'
                    );
                    updateDownloadLinkAndClick(
                        document.querySelector('#download-export'),
                        zipFile
                    );
                })
                .catch((error) => {
                    let message = t('alert.export.error.msg', {
                        errors: error.message,
                        interpolation: {
                            escapeValue: false,
                        },
                    });
                    if (error.exportFile) {
                        message += `<p>${t(
                            'alert.export.error.filecreatedmsg'
                        )}</p>${downloadLink}`;
                    }
                    gui.alert(message, t('alert.export.error.heading'));
                    if (error.exportFile) {
                        updateDownloadLinkAndClick(
                            document.querySelector('#download-export'),
                            error.exportFile
                        );
                    }
                });
        });

        $(document).on(
            'click',
            '.record-list__records__record[data-draft="true"]',
            function () {
                _loadRecord(survey, $(this).attr('data-id'), false);
            }
        );

        $(document).on('click', '.record-list__records__record', function () {
            $(this).next('.record-list__records__msg').toggle(100);
        });
    }

    if (rc.inIframe() && settings.parentWindowOrigin) {
        document.addEventListener(
            events.SubmissionSuccess().type,
            rc.postEventAsMessageToParentWindow
        );
        document.addEventListener(
            events.Edited().type,
            rc.postEventAsMessageToParentWindow
        );
        document.addEventListener(
            events.Close().type,
            rc.postEventAsMessageToParentWindow
        );

        document.addEventListener(
            events.Exit().type,
            rc.postEventAsMessageToParentWindow
        );

        form.view.html.addEventListener(events.PageFlip().type, postHeartbeat);
        form.view.html.addEventListener(events.AddRepeat().type, postHeartbeat);
        form.view.html.addEventListener(events.Heartbeat().type, postHeartbeat);
    }

    if (settings.type !== 'view') {
        window.onbeforeunload = () => {
            if (!ignoreBeforeUnload) {
                // Do not add auto queries for note-only views
                if (!/\/fs\/dn\//.test(window.location.pathname)) {
                    _autoAddQueries(
                        form.view.html.querySelectorAll('.invalid-constraint')
                    );
                    _autoAddReasonQueries(reasons.getInvalidFields());
                }
                if (
                    fieldSubmissionQueue.enabled &&
                    Object.keys(fieldSubmissionQueue.get()).length > 0
                ) {
                    return 'Any unsaved data will be lost';
                }
            }
        };
    }
}

function updateDownloadLinkAndClick(anchor, file) {
    const objectUrl = URL.createObjectURL(file);

    anchor.textContent = file.name;
    downloadUtils.updateDownloadLink(anchor, objectUrl, file.name);
    anchor.click();
}

function postHeartbeat() {
    if (rc.inIframe() && settings.parentWindowOrigin) {
        rc.postEventAsMessageToParentWindow(events.Heartbeat());
    }
}

export default {
    init,
};

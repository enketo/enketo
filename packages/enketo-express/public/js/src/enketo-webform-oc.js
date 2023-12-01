import './module/radio-tab';
import calculationModule from 'enketo-core/src/js/calculate';
import preloadModule from 'enketo-core/src/js/preload';
import gui from './module/gui';
import controller from './module/controller-webform-oc';
import settings from './module/settings';
import connection from './module/connection';
import {
    init as initTranslator,
    t,
    localize,
    loadTranslation,
} from './module/translator';
import store from './module/store';
import relevantModule from './module/relevant';
import repeatModule from './module/repeat';
import events from './module/event';
import formCache from './module/form-cache';
import applicationCache from './module/application-cache';
import oc from './module/custom';

const loader = document.querySelector('.main-loader');
const formheader = document.querySelector('.main > .paper > .form-header');
const footer = document.querySelector('.form-footer');
const survey = {
    enketoId: settings.enketoId,
    serverUrl: settings.serverUrl,
    xformId: settings.xformId,
    xformUrl: settings.xformUrl,
    instanceId: settings.instanceId,
};
const range = document.createRange();

_setEmergencyHandlers();

if (settings.offline) {
    console.log('App in offline-capable mode.', survey);
    delete survey.xformUrl;
    _setAppCacheEventHandlers();
    applicationCache
        .init(survey)
        .then(initTranslator)
        .then(formCache.init)
        .then(_swapTheme)
        .then(formCache.updateMaxSubmissionSize)
        .then(_updateMaxSizeSetting)
        .then(_init)
        .then((formParts) => {
            formParts.languages.forEach(loadTranslation);

            return formParts;
        })
        .then(formCache.updateMedia)
        .then(_setFormCacheEventHandlers)
        .catch(_showErrorOrAuthenticate);
} else {
    console.log('App in online-only mode.');
    const isPreview = settings.type === 'preview';

    initTranslator(survey)
        .then((props) =>
            connection.getFormParts({
                ...props,
                isPreview,
            })
        )
        .then((formParts) => {
            if (
                location.pathname.indexOf('/edit/') > -1 ||
                location.pathname.indexOf('/view/') > -1
            ) {
                if (survey.instanceId) {
                    return connection
                        .getExistingInstance(survey)
                        .then((response) => {
                            formParts.instance = response.instance;
                            formParts.instanceAttachments =
                                response.instanceAttachments;

                            // TODO: this will fail massively if instanceID is not populated (will use POST instead of PUT). Maybe do a check?
                            return formParts;
                        });
                }
                if (location.pathname.indexOf('/edit/') > -1) {
                    throw new Error('This URL is invalid');
                }
            }

            return formParts;
        })
        .then((formParts) => {
            // don't use settings.headless here because this also includes pdf views
            if (window.location.pathname.includes('/headless')) {
                return formParts;
            }
            if (formParts.form && formParts.model) {
                return gui.swapTheme(formParts);
            }
            throw new Error(t('error.unknown'));
        })
        .then((formParts) => {
            if (/\/fs\/dnc?\//.test(window.location.pathname)) {
                return _convertToReadonly(formParts, true);
            }
            if (settings.type === 'view') {
                return _convertToReadonly(formParts, false);
            }

            return formParts;
        })
        .then((survey) => {
            if (isPreview && settings.xformUrl) {
                return survey;
            }

            return connection.getMaximumSubmissionSize(survey);
        })
        .then(_updateMaxSizeSetting)
        .then(_init)
        .catch(_showErrorOrAuthenticate);
}

/**
 * Swaps the theme if necessary.
 *
 * @param  {*} survey - [description]
 * @return {*}        [description]
 */
function _swapTheme(survey) {
    if (survey.form && survey.model) {
        return gui.swapTheme(survey);
    }
    return Promise.reject(new Error('Received form incomplete'));
}

function _updateMaxSizeSetting(survey) {
    if (survey.maxSize) {
        // overwrite default max size
        settings.maxSize = survey.maxSize;
    }

    return survey;
}

function _showErrorOrAuthenticate(error) {
    loader.classList.add('fail');
    if (error.status === 401) {
        window.location.href = `/login?return_url=${encodeURIComponent(
            window.location.href
        )}`;
    } else {
        gui.alert(error.message, t('alert.loaderror.heading'));
        if (settings.headless) {
            gui.showHeadlessResult({ error: error.message });
        }
    }
}

function _setAppCacheEventHandlers() {
    document.addEventListener(events.OfflineLaunchCapable().type, (event) => {
        const { capable } = event.detail;
        gui.updateStatus.offlineCapable(capable);

        const scriptUrl = applicationCache.serviceWorkerScriptUrl;
        if (scriptUrl) {
            connection
                .getServiceWorkerVersion(scriptUrl)
                .then(gui.updateStatus.applicationVersion);
        }
    });

    document.addEventListener(events.ApplicationUpdated().type, () => {
        gui.feedback(
            t('alert.appupdated.msg'),
            null,
            t('alert.appupdated.heading')
        );
    });
}

function _setFormCacheEventHandlers(survey) {
    document.addEventListener(events.FormUpdated().type, () => {
        gui.feedback(
            t('alert.formupdated.msg'),
            null,
            t('alert.formupdated.heading')
        );
    });

    return survey;
}

/**
 * Advanced/emergency handlers that should always be activated even if form loading fails.
 */
function _setEmergencyHandlers() {
    const flushBtn = document.querySelector(
        '.side-slider__advanced__button.flush-db'
    );

    if (flushBtn) {
        flushBtn.addEventListener('click', () => {
            gui.confirm(
                {
                    msg: t('confirm.deleteall.msg'),
                    heading: t('confirm.deleteall.heading'),
                },
                {
                    posButton: t('confirm.deleteall.posButton'),
                }
            )
                .then((confirmed) => {
                    if (!confirmed) {
                        throw new Error('Cancelled by user');
                    }

                    return store.flush();
                })
                .then(() => {
                    location.reload();
                })
                .catch(() => {});
        });
    }
}

/**
 * Converts questions to readonly
 * Disables calculations, deprecatedID mechanism and preload items.
 *
 * @param {object} formParts - formParts object
 * @param {boolean} notesEnabled - whether notes are enabled
 * @return {object}          formParts object
 */
function _convertToReadonly(formParts, notesEnabled) {
    // Styling changes
    document.querySelector('body').classList.add('oc-view');

    // Partially disable calculations in Enketo Core
    console.info('Calculations restricted to clinicaldata only.');
    calculationModule.originalUpdate = calculationModule.update;
    calculationModule.update = function (updated) {
        return calculationModule.originalUpdate.call(
            this,
            updated,
            '[data-oc-external="clinicaldata"]'
        );
    };
    console.info('Setvalue disabled.');
    calculationModule.setvalue = () => {};

    // Completely disable preload items
    console.info('Preloaders disabled.');
    preloadModule.init = () => {};

    // Disable clearing (and submissions) of non-relevant readonly values
    console.info('Clearing of non-relevant values disabled.');
    relevantModule.clear = () => {};

    // Disable removing repeats (in case model contains more repeats than repeat count number)
    console.info('Disabling repeat removal');
    repeatModule.remove = () => {};

    // change status message
    const i18nKey = notesEnabled
        ? 'fieldsubmission.noteonly.msg'
        : 'fieldsubmission.readonly.msg';
    formheader.prepend(
        range.createContextualFragment(
            `<div class="fieldsubmission-status readonly" data-i18n="${i18nKey}">${t(
                i18nKey
            )}</div>`
        )
    );
    footer.prepend(
        range.createContextualFragment(
            `<div class="form-footer__feedback fieldsubmission-status readonly" data-i18n="${i18nKey}">${t(
                i18nKey
            )}</div>`
        )
    );

    formParts.formFragment = range.createContextualFragment(formParts.form);

    // Note: Enketo made a syntax error by adding the readonly attribute on a <select>
    // Hence, we cannot use .prop('readonly', true). We'll continue the syntax error.
    [
        ...formParts.formFragment.querySelectorAll(
            '.question input:not([readonly]), .question textarea:not([readonly]), .question select:not([readonly])'
        ),
    ]
        .filter((el) =>
            notesEnabled ? !el.closest('.or-appearance-dn') : true
        )
        .forEach((el) => {
            el.setAttribute('readonly', 'readonly');
            el.classList.add('readonly-forced');
        });

    // Properly make native selects readonly (for touchscreens)
    formParts.formFragment
        .querySelectorAll('select:not(#form-languages) option')
        .forEach((el) => (el.disabled = true));
    // Prevent adding an Add/Remove UI on repeats
    formParts.formFragment
        .querySelectorAll('.or-repeat-info')
        .forEach((el) => el.setAttribute('data-repeat-fixed', 'fixed'));
    // Record load warning but keep loading
    if (settings.loadWarning) {
        if (!formParts.loadErrors) {
            formParts.loadErrors = [];
        }
        formParts.loadErrors.push(settings.loadWarning);
    }

    return formParts;
}

function _init(formParts) {
    let error;

    return new Promise((resolve, reject) => {
        if (formParts && formParts.form && formParts.model) {
            const formFragment =
                formParts.formFragment ||
                range.createContextualFragment(formParts.form);
            formheader.after(formFragment);
            const formEl = document.querySelector('form.or');

            controller
                .init(
                    formEl,
                    {
                        modelStr: formParts.model,
                        instanceStr: formParts.instance,
                        external: formParts.externalData,
                        survey: formParts,
                    },
                    formParts.loadErrors
                )
                .then((form) => {
                    formParts.languages = form.languages; // be careful form is undefined if there were load errors
                    const titleEl = document.querySelector('#form-title');
                    const titleText = settings.pid
                        ? `${settings.pid}: ${titleEl.textContent}`
                        : titleEl.textContent;
                    document.querySelector('head>title').textContent =
                        titleText;
                    titleEl.textContent = titleText;
                    if (formParts.instance) {
                        oc.addSignedStatus(form);
                    }
                    if (settings.print) {
                        gui.applyPrintStyle();
                    }
                    localize(formEl);
                    resolve(formParts);
                });
        } else if (formParts) {
            error = new Error('Form not complete.');
            error.status = 400;
            reject(error);
        } else {
            error = new Error('Form not found');
            error.status = 404;
            reject(error);
        }
    });
}

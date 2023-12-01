import config from 'enketo/config';
import utils from './utils';

const queryParams = _getAllQueryParams();
const settings = {};
const DEFAULT_MAX_SIZE = 5 * 1000 * 1000;
const DEFAULT_LOGIN_URL = '/login';
const DEFAULT_THANKS_URL = '/thanks';
const settingsMap = [
    'returnUrl',
    { q: 'return_url', s: 'returnUrl' },
    { q: 'form', s: 'xformUrl' },
    { q: 'xform', s: 'xformUrl' },
    'instanceId',
    { q: 'instance_id', s: 'instanceId' },
    'parentWindowOrigin',
    { q: 'parent_window_origin', s: 'parentWindowOrigin' },
    'print',
    'format',
    'landscape',
    'margin',
    'touch',
    { q: 'PID', s: 'pid' },
    'loadWarning',
    'ecid',
    { q: 'load_warning', s: 'loadWarning' },
    'goToErrorUrl',
    { q: 'go_to_error_url', s: 'goToErrorUrl' },
    'interface',
];

window.addEventListener(
    'message',
    (event) => {
        if (event.origin === window.parent.location.origin) {
            document.cookie = `__authToken=${encodeURIComponent(
                event.data.authToken
            )}; path=/; max-age=${24 * 60 * 60}; samesite = strict `; // TODO secure=true ?
        }
    },
    false
);

// rename query string parameters to settings, but only if they do not exist already
settingsMap.forEach((obj) => {
    if (
        typeof obj === 'string' &&
        typeof queryParams[obj] !== 'undefined' &&
        typeof settings[obj] === 'undefined'
    ) {
        settings[obj] = queryParams[obj];
    } else if (
        typeof queryParams[obj.q] !== 'undefined' &&
        typeof settings[obj.s] === 'undefined'
    ) {
        settings[obj.s] = queryParams[obj.q];
    }
});

// add default login Url
settings.loginUrl = config.basePath + DEFAULT_LOGIN_URL;

// add default return Url
settings.defaultReturnUrl = config.basePath + DEFAULT_THANKS_URL;

// add defaults object
settings.defaults = {};
for (const p in queryParams) {
    if (Object.prototype.hasOwnProperty.call(queryParams, p)) {
        // URLs with encoded brackets as well as not-encoded brackets will work.
        const matches = decodeURIComponent(p).match(/d\[(.*)\]/);
        if (matches && matches[1]) {
            settings.defaults[matches[1]] = queryParams[p];
        }
    }
}

// add common app configuration constants
for (const prop in config) {
    if (Object.prototype.hasOwnProperty.call(config, prop)) {
        settings[prop] = config[prop];
    }
}

// add submission parameter value
if (settings.submissionParameter && settings.submissionParameter.name) {
    // sets to undefined when necessary
    settings.submissionParameter.value =
        queryParams[settings.submissionParameter.name];
}

// add language override value
settings.languageOverrideParameter = queryParams.lang
    ? {
          name: 'lang',
          value: queryParams.lang,
      }
    : undefined;

// set default maxSubmissionSize
settings.maxSize = DEFAULT_MAX_SIZE;

// add type
if (
    window.location.pathname.includes('/preview/') ||
    window.location.pathname.endsWith('/preview')
) {
    settings.type = 'preview';
} else if (window.location.pathname.includes('/single/')) {
    settings.type = 'single';
} else if (window.location.pathname.includes('/edit/')) {
    settings.type = 'edit';
} else if (window.location.pathname.includes('/view/')) {
    settings.type = 'view';
} else {
    settings.type = 'other';
}

// determine whether DN close button should be shown
settings.dnCloseButton = window.location.pathname.indexOf('/c/') !== -1;

// headless?
if (
    window.location.pathname.includes('/pdf') > 0 ||
    window.location.pathname.includes('/headless')
) {
    settings.headless = true;
}

// Determine whether view is offline-capable
settings.offline = window.location.pathname.includes('/x/');
settings.offlinePath = settings.offline ? '/x' : '';

// Extract Enketo ID
settings.enketoId = utils.getEnketoId(window.location.pathname);

// Set multipleAllowed for single webform views
if (settings.type === 'single' && settings.enketoId.length < 32) {
    settings.multipleAllowed = true;
}

// Determine whether "go to" functionality should be enabled.
settings.goTo =
    settings.type === 'edit' ||
    settings.type === 'preview' ||
    settings.type === 'view';

// A bit crude and hackable by users, but this way also type=view with a record will be caught.
settings.printRelevantOnly = !(
    (settings.type === 'view' && !settings.instanceId) ||
    settings.type === 'preview'
);

// Reason for change functionality
settings.reasonForChange = /\/rfc\//.test(window.location.pathname);
settings.incompleteAllowed = /\/inc\//.test(window.location.pathname);

settings.participant = /\/participant\//.test(window.location.pathname);

// Strict validation functionality (now true for everything but used to be specific to certain views)
settings.strictViolationSelector =
    '.oc-strict-constraint.invalid-constraint, .oc-strict-required.invalid-required, .oc-strict-relevant.invalid-relevant';

settings.strictViolationBlocksNavigation =
    settings.type !== 'view' && !/\/fs\/dn\//.test(window.location.pathname);
settings.openSingleDnThreadAutomaticallyUponLoadAndGoToDn =
    !/\/fs\/dn\//.test(window.location.pathname) && !settings.reasonForChange;

settings.autoQueries =
    settings.reasonForChange ||
    !/\/(view|dn|participant)\//.test(window.location.pathname);

if (/\/full\//.test(window.location.pathname)) {
    settings.fullRecord = true;
}

// For non-anonymous Participate views only
if (!settings.fullRecord && settings.participant) {
    settings.relevantIsStrict = true;
}

function _getAllQueryParams() {
    let val;
    let processedVal;
    const query = window.location.search.substring(1);
    const vars = query.split('&');
    const params = {};

    for (let i = 0; i < vars.length; i++) {
        const pair = vars[i].split('=');
        if (pair[0].length > 0) {
            val = decodeURIComponent(pair[1]);
            processedVal =
                val === 'true' ? true : val === 'false' ? false : val;
            params[pair[0]] = processedVal;
        }
    }

    return params;
}

export default settings;

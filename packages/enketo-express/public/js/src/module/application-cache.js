/**
 * Deals with storing the app using service workers.
 */

import events from './event';
import settings from './settings';
import { SW_MESSAGE_GET_VERSION } from './sw-constants';

// After every 12 hours we force enketo to wait for the offline-app-worker
// and local cache update before proceeding with initialization.
// This way, only once every 12 hours, when user has internet, we hold loading for possibly some seconds in slow connections
// but we ensure users get updates in a reasonable time.
const LAST_CHECK_KEY = 'enketo:sw-last-check';
const FORCE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Flag used to let the shared updatefound listener know whether the
// update was triggered by the blocking init check or by a periodic check.
let _initCheckInProgress = false;
let _isFirstInstall = false;

function _getLastCheckTime() {
    try {
        const val = localStorage.getItem(LAST_CHECK_KEY);

        return val ? parseInt(val, 10) : null;
    } catch {
        return null;
    }
}

function _setLastCheckTime() {
    try {
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    } catch {
        // ignore
    }
}

function _isForcedCheckDue() {
    if (!navigator.onLine) return false;
    const last = _getLastCheckTime();

    return last === null || Date.now() - last > FORCE_CHECK_INTERVAL_MS;
}

function init(survey) {
    if (!('serviceWorker' in navigator)) {
        if (location.protocol.startsWith('http:')) {
            console.error(
                'Service workers not supported on this http URL (insecure)'
            );
        } else {
            console.error(
                'Service workers not supported on this browser. This form cannot launch online'
            );
        }
        _reportOfflineLaunchCapable(false);

        return Promise.resolve(survey);
    }

    return navigator.serviceWorker
        .register(`${settings.basePath}/x/offline-app-worker.js`)
        .then((registration) => {
            setupRegistrationListeners(registration);

            if (registration.active) {
                _reportOfflineLaunchCapable(true);
            }

            // After an offline cache update, re-dispatch OfflineLaunchCapable
            // so the version is shown in the side slider.
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // _reportOfflineLaunchCapable(true);
            });

            // Periodic background check for long-lived tabs.
            // If a user keeps a tab open for days without reloading,
            // this ensures they still get notified of updates.
            _startPeriodicUpdateCheck(registration);

            _isFirstInstall = !registration.active;
            const shouldBlockOnCheck = !_isFirstInstall && _isForcedCheckDue();

            if (!shouldBlockOnCheck) {
                // No forced check needed — proceed immediately
                return Promise.resolve(survey);
            }

            // Block app init until update check completes.
            // If an update is found: dispatch ApplicationUpdated (triggers reload, never resolves).
            // If no update found: update timestamp and proceed.
            return new Promise((resolve) => {
                let settled = false;

                const proceedWithInit = () => {
                    if (settled) return;
                    settled = true;
                    _initCheckInProgress = false;
                    _setLastCheckTime();
                    resolve(survey);
                };

                _initCheckInProgress = true;

                // Trigger the blocking update check.
                // If an update is found, the shared updatefound listener
                // (registered in _startPeriodicUpdateCheck) handles it.
                // If no update, we proceed with init.
                registration
                    .update()
                    .then((reg) => {
                        if (!reg.installing) {
                            // No update found — proceed
                            proceedWithInit();
                        }
                        // Otherwise the updatefound handler takes over
                    })
                    .catch(() => {
                        // Update check failed (e.g. offline mid-check) — proceed anyway
                        proceedWithInit();
                    });

                // Failsafe: if check/update takes more than 10 seconds, proceed anyway
                setTimeout(proceedWithInit, 10000);
            });
        })
        .catch((err) => {
            console.error(
                'Offline application service worker registration failed: ',
                err
            );
            _reportOfflineLaunchCapable(true);

            return survey;
        });
}

/**
 * Sets up shared listeners for service worker registration events related to updates.
 * The same listeners are used for both the initial blocking check and the periodic background check.
 * When an update is detected, an ApplicationUpdated event is dispatched with the source of the update.
 */
function setupRegistrationListeners(registration) {
    // Single shared listener for updates — determines source from the flag
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (!newWorker) return;

        // On first install the worker activating is expected — not an "update"
        // so, no event dispatched and no reload triggered.
        if (_isFirstInstall) {
            _isFirstInstall = false;

            return;
        }

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
                const source = _initCheckInProgress ? 'init' : 'periodic';
                _initCheckInProgress = false;

                console.log(
                    `New offline application service worker activated (${source})!`
                );
                _setLastCheckTime();
                document.dispatchEvent(events.ApplicationUpdated({ source }));
            }
        });
    });
}

/**
 * Starts a periodic background update check so that long-lived tabs
 * (kept open for days without reloading) still detect new versions.
 */
function _startPeriodicUpdateCheck(registration) {
    setInterval(() => {
        if (!navigator.onLine) return;

        console.log(
            'Checking for offline application cache service worker update'
        );

        registration.update().catch(() => {
            // Silently ignore update check failures (e.g. network error)
        });
    }, FORCE_CHECK_INTERVAL_MS);
}

function _reportOfflineLaunchCapable(capable = true) {
    document.dispatchEvent(events.OfflineLaunchCapable({ capable }));
}

export default {
    init,
    get serviceWorkerScriptUrl() {
        if (
            'serviceWorker' in navigator &&
            navigator.serviceWorker.controller
        ) {
            return navigator.serviceWorker.controller.scriptURL;
        }

        return null;
    },

    /**
     * Returns the currently running (active/controlling) service worker for its
     * version string via postMessage.  This reflects what is actually executing
     * in the browser, not what is available on the server.
     *
     * @return {Promise<string>} resolves with the version string, or 'unknown'
     */
    getVersion() {
        if (
            !('serviceWorker' in navigator) ||
            !navigator.serviceWorker.controller
        ) {
            return Promise.resolve('unknown');
        }

        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
                resolve((event.data && event.data.version) || 'unknown');
            };
            navigator.serviceWorker.controller.postMessage(
                { type: SW_MESSAGE_GET_VERSION },
                [channel.port2]
            );
            // Fallback in case the service worker does not respond
            setTimeout(() => resolve('unknown'), 2000);
        });
    },
};

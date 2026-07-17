/**
 * Polls `predicate` until it returns true, or rejects after `timeout` ms.
 *
 * Useful for widgets whose event handlers do async work (e.g. awaiting a
 * promise, then a `FileReader` read) that can't be synchronized with a
 * fixed `setTimeout(fn, 0)`: depending on how long that work takes relative
 * to the timer, assertions can run before the handler has finished.
 * Sinon's fake timers don't help here since native browser APIs like
 * `FileReader` aren't driven by `setTimeout`/`setInterval`. Polling for the
 * actual expected state removes the race while still failing fast if the
 * condition is never met.
 *
 * @param {() => boolean} predicate
 * @param {number} [timeout]
 * @param {number} [interval]
 * @returns {Promise<void>}
 */
export function waitFor(predicate, timeout = 2000, interval = 10) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (predicate()) {
                resolve();
            } else if (Date.now() - start >= timeout) {
                reject(
                    new Error(
                        'waitFor: timed out waiting for expected condition'
                    )
                );
            } else {
                setTimeout(check, interval);
            }
        };
        check();
    });
}

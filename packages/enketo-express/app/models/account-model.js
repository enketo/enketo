/**
 * @module account-model
 */

const utils = require('../lib/utils');
const config = require('./config-model').server;

const customGetAccount = config['account lib']
    ? require(config['account lib']).getAccount
    : undefined;
const pending = {};
const { mainClient } = require('../lib/db');
// const debug = require( 'debug' )( 'account-model' );

/**
 * @typedef AccountObj
 * @property { string } linkedServer
 * @property { string } [openRosaServer]
 * @property { string } key
 * @property {number} quota
 */

/**
 * Obtains account.
 *
 * @static
 * @param {module:survey-model~SurveyObject} survey - survey object
 * @return {Promise<Error|AccountObj>} promise that resolves in {@link module:account-model~AccountObj|Account object}
 */
function get(survey) {
    let error;
    const server = _getServer(survey);

    if (!server) {
        error = new Error('Bad Request. Server URL missing.');
        error.status = 400;

        return Promise.reject(error);
    }
    if (!utils.isValidUrl(server)) {
        error = new Error('Bad Request. Server URL is not a valid URL.');
        error.status = 400;

        return Promise.reject(error);
    }
    if (/https?:\/\/testserver.com\/bob/.test(server)) {
        return Promise.resolve({
            linkedServer: server,
            key: 'abc',
            quota: 100,
        });
    }
    if (/https?:\/\/testserver.com\/noquota/.test(server)) {
        error = new Error('Forbidden. No quota left.');
        error.status = 403;

        return Promise.reject(error);
    }
    if (/https?:\/\/testserver.com\/noapi/.test(server)) {
        error = new Error('Forbidden. No API access granted.');
        error.status = 405;

        return Promise.reject(error);
    }
    if (/https?:\/\/testserver.com\/noquotanoapi/.test(server)) {
        error = new Error('Forbidden. No API access granted.');
        error.status = 405;

        return Promise.reject(error);
    }
    if (/https?:\/\/testserver.com\/notpaid/.test(server)) {
        error = new Error('Forbidden. The account is not active.');
        error.status = 403;

        return Promise.reject(error);
    }

    return _getAccount(server);
}

/**
 * Create an account
 *
 * @param  {{linkedServer: string, key: string}} account - [description]
 * @return {[type]}        [description]
 */
function set(account) {
    let error;
    let dbKey;
    const hardcodedAccount = _getHardcodedAccount();

    return new Promise((resolve, reject) => {
        if (!account.linkedServer || !account.key) {
            error = new Error('Bad Request. Server URL and/or API key missing');
            error.status = 400;
            reject(error);
        } else if (!utils.isValidUrl(account.linkedServer)) {
            error = new Error('Bad Request. Server URL is not a valid URL.');
            error.status = 400;
            reject(error);
        } else if (
            !account.key ||
            typeof account.key !== 'string' ||
            account.key.length === 0
        ) {
            error = new Error(
                'Bad Request. Account API key malformed or missing.'
            );
            error.status = 400;
            reject(error);
        } else {
            dbKey = `ac:${utils.cleanUrl(account.linkedServer)}`;
            if (pending[dbKey]) {
                error = new Error(
                    'Conflict. Busy handling pending request for same account'
                );
                error.status = 409;
                reject(error);
            }
            if (
                hardcodedAccount &&
                _isAllowed(hardcodedAccount, account.linkedServer)
            ) {
                resolve(account);
            } else {
                // to avoid issues with fast subsequent requests
                pending[dbKey] = true;

                mainClient.hgetall(dbKey, (error, obj) => {
                    if (error) {
                        delete pending[dbKey];
                        reject(error);
                    } else if (!obj || obj.openRosaServer) {
                        // also update if deprecated openRosaServer property is present
                        mainClient.hmset(dbKey, account, (error) => {
                            delete pending[dbKey];
                            if (error) {
                                reject(error);
                            }
                            // remove deprecated field, don't wait for result
                            if (obj && obj.openRosaServer) {
                                mainClient.hdel(dbKey, 'openRosaServer');
                            }
                            account.status = 201;
                            resolve(account);
                        });
                    } else if (!obj.linkedServer || !obj.key) {
                        delete pending[dbKey];
                        error = new Error('Account information is incomplete.');
                        error.status = 406;
                        reject(error);
                    } else {
                        delete pending[dbKey];
                        obj.status = 200;
                        resolve(obj);
                    }
                });
            }
        }
    });
}

/**
 * Update an account
 *
 * @param  {{linkedServer: string, key: string}} account - [description]
 * @return {[type]}        [description]
 */
function update(account) {
    let error;
    let dbKey;
    const hardcodedAccount = _getHardcodedAccount();

    return new Promise((resolve, reject) => {
        if (!account.linkedServer) {
            error = new Error('Bad Request. Server URL missing');
            error.status = 400;
            reject(error);
        } else if (!utils.isValidUrl(account.linkedServer)) {
            error = new Error('Bad Request. Server URL is not a valid URL.');
            error.status = 400;
            reject(error);
        } else if (
            !account.key ||
            typeof account.key !== 'string' ||
            account.key.length === 0
        ) {
            error = new Error(
                'Bad Request. Account API key malformed or missing.'
            );
            error.status = 400;
            reject(error);
        } else if (
            hardcodedAccount &&
            _isAllowed(hardcodedAccount, account.linkedServer)
        ) {
            resolve(account);
        } else {
            dbKey = `ac:${utils.cleanUrl(account.linkedServer)}`;
            mainClient.hgetall(dbKey, (error, obj) => {
                if (error) {
                    reject(error);
                } else if (!obj) {
                    error = new Error('Account Not found. Nothing to update');
                    error.status = 404;
                    reject(error);
                } else if (utils.areOwnPropertiesEqual(obj, account)) {
                    account.status = 200;
                    resolve(account);
                } else {
                    mainClient.hmset(dbKey, account, (error) => {
                        if (error) {
                            reject(error);
                        }
                        // remove deprecated field, don't wait for result
                        if (obj.openRosaServer) {
                            mainClient.hdel(dbKey, 'openRosaServer');
                        }
                        account.status = 201;
                        resolve(account);
                    });
                }
            });
        }
    });
}

/**
 * Remove an account
 *
 * @param  {{linkedServer: string, key: string}} account - [description]
 * @return {[type]}        [description]
 */
function remove(account) {
    let error;
    let dbKey;
    const hardcodedAccount = _getHardcodedAccount();

    return new Promise((resolve, reject) => {
        if (!account.linkedServer) {
            error = new Error('Bad Request. Server URL missing');
            error.status = 400;
            reject(error);
        } else if (!utils.isValidUrl(account.linkedServer)) {
            error = new Error('Bad Request. Server URL is not a valid URL.');
            error.status = 400;
            reject(error);
        } else if (
            hardcodedAccount &&
            _isAllowed(hardcodedAccount, account.linkedServer)
        ) {
            error = new Error(
                'Not Allowed. Hardcoded account cannot be removed via API.'
            );
            error.status = 405;
            reject(error);
        } else {
            dbKey = `ac:${utils.cleanUrl(account.linkedServer)}`;
            mainClient.hgetall(dbKey, (error, obj) => {
                if (error) {
                    reject(error);
                } else if (!obj) {
                    error = new Error('Not Found. Account not present.');
                    error.status = 404;
                    reject(error);
                } else {
                    mainClient.del(dbKey, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(account);
                        }
                    });
                }
            });
        }
    });
}

/**
 * Obtains a list of acccounts
 *
 * @return {[type]} [description]
 */
function getList() {
    let hardcodedAccount;
    let multi;
    const list = [];

    hardcodedAccount = _getHardcodedAccount();

    if (hardcodedAccount) {
        list.push(hardcodedAccount);
    }

    return new Promise((resolve, reject) => {
        mainClient.keys('ac:*', (error, accounts) => {
            if (error) {
                reject(error);
            } else if (accounts.length === 0) {
                resolve(list);
            } else if (accounts.length > 0) {
                multi = mainClient.multi();

                accounts.forEach((account) => {
                    multi.hgetall(account);
                });

                multi.exec((errors, replies) => {
                    if (errors) {
                        reject(errors[0]);
                    }
                    resolve(list.concat(replies));
                });
            }
        });
    });
}

/**
 * Check if account for passed survey is active, and not exceeding quota.
 * This passes back the original survey object and therefore differs from the get function!
 *
 * @static
 * @param {module:survey-model~SurveyObject} survey - survey object
 * @return {Promise<module:survey-model~SurveyObject>} updated SurveyObject
 */
function check(survey) {
    return get(survey).then((account) => {
        survey.account = account;

        return survey;
    });
}

/**
 * Checks if the provided serverUrl is part of the allowed 'linked' OpenRosa Server.
 *
 * @param { AccountObj } account - an account object
 * @param { string } serverUrl - server URL
 * @return { boolean } Whether server URL is allowed
 */
function _isAllowed(account, serverUrl) {
    return (
        account &&
        (account.linkedServer === '' ||
            new RegExp(`https?://${_stripProtocol(account.linkedServer)}`).test(
                serverUrl
            ))
    );
}

/**
 * Strips http(s):// from the provided url
 *
 * @param { string } url - URL
 * @return {string|null} stripped url
 */
function _stripProtocol(url) {
    if (!url) {
        return null;
    }

    // strip http(s)://
    if (/https?:\/\//.test(url)) {
        url = url.substring(url.indexOf('://') + 3);
    }

    return url;
}

/**
 * Obtains account from either configuration (hardcoded) or via custom function
 *
 * @param { string } serverUrl - The serverUrl to be used to look up the account.
 * @return { AccountObj } {@link module:account-model~AccountObj|Account object}
 */
function _getAccount(serverUrl) {
    const hardcodedAccount = _getHardcodedAccount();

    if (hardcodedAccount && _isAllowed(hardcodedAccount, serverUrl)) {
        return Promise.resolve(hardcodedAccount);
    }

    if (customGetAccount) {
        return customGetAccount(serverUrl, config['account api url']);
    }

    return new Promise((resolve, reject) => {
        mainClient.hgetall(`ac:${utils.cleanUrl(serverUrl)}`, (error, obj) => {
            if (error) {
                reject(error);
            }
            if (!obj) {
                error = new Error(
                    'Forbidden. This server is not linked with Enketo'
                );
                error.status = 403;
                reject(error);
            } else {
                // correct deprecated property name if necessary
                resolve({
                    linkedServer: obj.linkedServer
                        ? obj.linkedServer
                        : obj.openRosaServer,
                    key: obj.key,
                    quota: obj.quota || Infinity,
                });
            }
        });
    });
}

/**
 * Obtains the hardcoded account from the config
 *
 * @return { null|AccountObj } `null` or {@link module:account-model~AccountObj|Account object}
 */
function _getHardcodedAccount() {
    const app = require('../../config/express');
    const linkedServer = app.get('linked form and data server');

    // check if configuration is acceptable
    if (
        config['account manager api key'] ||
        !linkedServer ||
        typeof linkedServer['server url'] === 'undefined' ||
        typeof linkedServer['api key'] === 'undefined'
    ) {
        return null;
    }

    // do not add default branding
    return {
        linkedServer: linkedServer['server url'],
        key: linkedServer['api key'],
        quota: linkedServer.quota || Infinity,
    };
}

/**
 * Extracts the server from a survey object or server string.
 *
 * @param  { string|module:survey-model~SurveyObject } survey - Server string or survey object.
 * @return { string|null } server
 */
function _getServer(survey) {
    if (
        !survey ||
        (typeof survey === 'object' &&
            !survey.openRosaServer &&
            !survey.linkedServer)
    ) {
        return null;
    }
    if (typeof survey === 'string') {
        return survey;
    }

    return survey.linkedServer || survey.openRosaServer;
}

module.exports = {
    get,
    check,
    set,
    update,
    remove,
    getList,
};

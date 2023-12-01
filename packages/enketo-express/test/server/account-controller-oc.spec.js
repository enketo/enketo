// safer to ensure this here (in addition to grunt:env:test)
process.env.NODE_ENV = 'test';

const chai = require('chai');

const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const request = require('supertest');
const app = require('../../config/express');
const config = require('../../app/models/config-model').server;

config['account lib'] = undefined;
const accountModel = require('../../app/models/account-model');

chai.use(chaiAsPromised);

describe('OC Account manager API', () => {
    const validAccountManagerApiKey = config['account manager api key'];
    const invalidAccountManagerApiKey = 'bad';
    const validAuth = {
        Authorization: `Basic ${Buffer.from(
            `${validAccountManagerApiKey}:`
        ).toString('base64')}`,
    };
    const invalidAuth = {
        Authorization: `Basic ${Buffer.from(
            `${invalidAccountManagerApiKey}:`
        ).toString('base64')}`,
    };
    const validServer1 = 'https://octestserver1.com';
    const validServer2 = 'https://octestserver2.com';
    const invalidServer = 'octestserver1.com';
    const validApiKey1 = 'abcde';

    beforeEach((done) => {
        // add survey if it doesn't exist in the db
        accountModel
            .set({
                linkedServer: validServer1,
                key: validApiKey1,
            })
            .then(() => {
                done();
            });
    });

    afterEach((done) => {
        // remove the test accounts
        Promise.all([
            accountModel.remove({
                linkedServer: validServer1,
            }),
            accountModel.remove({
                linkedServer: validServer2,
            }),
        ])
            .then(() => {
                done();
            })
            .catch(() => {
                done();
            });
    });

    describe('Some setup checks', () => {
        it('We are in the "test" environment', () => {
            expect(app.get('env')).to.equal('test');
        });
    });

    describe('', () => {
        [
            // valid key, existing account
            {
                method: 'get',
                auth: true,
                status: 200,
            },
            {
                method: 'post',
                auth: true,
                status: 200,
            },
            {
                method: 'put',
                auth: true,
                status: 200,
            },
            {
                method: 'delete',
                auth: true,
                status: 204,
            },
            // valid key, non-existing account
            {
                method: 'get',
                server: validServer2,
                auth: true,
                status: 403,
            },
            {
                method: 'post',
                server: validServer2,
                auth: true,
                status: 201,
            },
            {
                method: 'put',
                server: validServer2,
                auth: true,
                status: 404,
            },
            {
                method: 'delete',
                server: validServer2,
                auth: true,
                status: 404,
            },
            // valid key, change existing account
            {
                method: 'put',
                server: validServer1,
                key: validServer2,
                auth: true,
                status: 201,
            },
            // invalid key
            {
                method: 'get',
                auth: false,
                status: 401,
            },
            {
                method: 'post',
                auth: false,
                status: 401,
            },
            {
                method: 'put',
                auth: false,
                status: 401,
            },
            {
                method: 'delete',
                auth: false,
                status: 401,
            },
            // missing key
            {
                method: 'get',
                auth: null,
                status: 401,
            },
            {
                method: 'post',
                auth: null,
                status: 401,
            },
            {
                method: 'put',
                auth: null,
                status: 401,
            },
            {
                method: 'delete',
                auth: null,
                status: 401,
            },
            // server_url malformed
            {
                method: 'get',
                auth: true,
                status: 400,
                server: invalidServer,
            },
            {
                method: 'post',
                auth: true,
                status: 400,
                server: invalidServer,
            },
            {
                method: 'put',
                auth: true,
                status: 400,
                server: invalidServer,
            },
            {
                method: 'delete',
                auth: true,
                status: 400,
                server: invalidServer,
            },
            // server_url not provided or empty
            {
                method: 'get',
                auth: true,
                status: 400,
                server: '',
            },
            {
                method: 'get',
                auth: true,
                status: 400,
                server: null,
            },
            {
                method: 'get',
                auth: true,
                status: 400,
                server: false,
            },
            {
                method: 'post',
                auth: true,
                status: 400,
                server: '',
            },
            {
                method: 'put',
                auth: true,
                status: 400,
                server: '',
            },
            {
                method: 'delete',
                auth: true,
                status: 400,
                server: '',
            },
            // api_key not provided or empty
            {
                method: 'get',
                auth: true,
                status: 200,
                key: '',
            },
            {
                method: 'post',
                auth: true,
                status: 400,
                key: '',
            },
            {
                method: 'post',
                auth: true,
                server: validServer2,
                status: 400,
                key: null,
            },
            {
                method: 'post',
                auth: true,
                server: validServer2,
                status: 400,
                key: false,
            },
            {
                method: 'put',
                auth: true,
                status: 400,
                key: '',
            },
            {
                method: 'delete',
                auth: true,
                status: 204,
                key: '',
            },
        ].forEach((test) => {
            const authDesc =
                test.auth === true
                    ? 'valid'
                    : test.auth === false
                    ? 'invalid'
                    : 'empty';
            const auth =
                test.auth === true
                    ? validAuth
                    : test.auth === false
                    ? invalidAuth
                    : {};
            const accountServer =
                typeof test.server !== 'undefined' ? test.server : validServer1;
            const accountKey =
                typeof test.key !== 'undefined' ? test.key : validApiKey1;
            const dataSendMethod = test.method === 'get' ? 'query' : 'send';

            it(`${test.method.toUpperCase()} /accounts/api/v1/account with ${authDesc} authentication and ${accountServer}, ${accountKey} responds with ${
                test.status
            }`, (done) => {
                request(app)
                    [test.method]('/accounts/api/v1/account')
                    .set(auth)
                    [dataSendMethod]({
                        server_url: accountServer,
                        api_key: accountKey,
                    })
                    .expect(test.status, done);
            });
        });
    });
});

// safer to ensure this here (in addition to grunt:env:test)
process.env.NODE_ENV = 'test';

const chai = require('chai');

const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const config = require('../../app/models/config-model').server;

config['account lib'] = undefined;
config['linked form and data server']['server url'] =
    'http://some.unused.url.com';
const model = require('../../app/models/account-model');
const app = require('../../config/express');

chai.use(chaiAsPromised);

describe('OC Account Model', () => {
    afterEach((done) => {
        // remove the test accounts
        Promise.all([
            model.remove({
                linkedServer: 'https://octest1.com/client1',
            }),
            model.remove({
                linkedServer: 'https://octest1.com/client2',
            }),
            model.remove({
                linkedServer: 'https://octest1.com/client3',
            }),
            model.remove({
                linkedServer: 'https://octest1.com/client4',
            }),
            model.remove({
                linkedServer: 'https://octest1.com/client5',
            }),
        ])
            .then(done)
            .catch(() => {
                done();
            });
    });

    describe('Some setup checks', () => {
        it('We are in the "test" environment', () => {
            expect(app.get('env')).to.equal('test');
        });
    });

    describe('set: when attempting to store new accounts', () => {
        let account;

        beforeEach(() => {
            account = {
                linkedServer: 'https://octest1.com/client2',
                key: 'abcde',
            };
        });

        it('returns an error if the linked Server is missing', () => {
            delete account.linkedServer;
            return expect(model.set(account)).to.eventually.be.rejected;
        });

        it('returns an error if the OpenRosa Form ID is missing', () => {
            delete account.key;
            return expect(model.set(account)).to.eventually.be.rejected;
        });

        it('returns an error if the OpenRosa Form ID is an empty string', () => {
            account.key = '';
            return expect(model.set(account)).to.eventually.be.rejected;
        });

        it('returns an error if the OpenRosa Server is an empty string', () => {
            account.linkedServer = '';
            return expect(model.set(account)).to.eventually.be.rejected;
        });

        it('returns an object with api key if succesful', () =>
            expect(model.set(account))
                .to.eventually.have.property('key')
                .and.to.equal('abcde'));

        it('drops nearly simultaneous set requests to avoid db corruption', () =>
            Promise.all([
                expect(model.set(account))
                    .to.eventually.have.property('key')
                    .and.to.equal('abcde'),
                expect(model.set(account)).to.eventually.be.rejected,
                expect(model.set(account)).to.eventually.be.rejected,
            ]));
    });

    describe('get: when attempting to obtain an account', () => {
        it('returns the account object when the account exists in db', () => {
            const account = {
                key: '2342',
                linkedServer: 'https://octest1.com/client2',
            };
            const getAccountPromise = model.set(account).then(model.get);
            return Promise.all([
                expect(getAccountPromise)
                    .to.eventually.have.property('key')
                    .and.to.equal(account.key),
                expect(getAccountPromise)
                    .to.eventually.have.property('linkedServer')
                    .and.to.equal(account.linkedServer),
            ]);
        });
    });

    describe('update: when updating an existing account', () => {
        it('it returns an error when the parameters are incorrect', () => {
            const account = {
                key: 'test',
                linkedServer: 'https://octest1.com/client3',
            };
            const promise = model.set(account).then((acc) => {
                acc.key = '';
                return model.update(acc);
            });
            return Promise.all([expect(promise).to.eventually.be.rejected]);
        });

        it('returns the edited account object when succesful', () => {
            const account = {
                key: 'test',
                linkedServer: 'https://octest1.com/client4',
            };
            const promise = model
                .set(account)
                .then(() => {
                    // change to http
                    account.linkedServer = 'http://octest1.com/client4';
                    return model.update(account);
                })
                .then(model.get);
            return Promise.all([
                expect(promise)
                    .to.eventually.have.property('key')
                    .and.to.equal('test'),
                expect(promise)
                    .to.eventually.have.property('linkedServer')
                    .and.to.equal('http://octest1.com/client4'),
            ]);
        });

        it('returns the edited account object when successful and called via update()', () => {
            const account = {
                key: 'test',
                linkedServer: 'https://octest1.com/client5',
            };
            const promise = model
                .set(account)
                .then(() => {
                    // change key
                    account.key = 'something else';
                    // set again
                    return model.update(account);
                })
                .then(model.get);
            return Promise.all([
                expect(promise)
                    .to.eventually.have.property('key')
                    .and.to.equal('something else'),
                expect(promise)
                    .to.eventually.have.property('linkedServer')
                    .and.to.equal('https://octest1.com/client5'),
            ]);
        });
    });

    describe('delete: when deleting an account', () => {
        it('it returns an error when the parameters are incorrect', () => {
            const account = {
                key: 'test',
                linkedServer: 'https://octest1/client3',
            };
            const promise = model.remove(account);
            return Promise.all([expect(promise).to.eventually.be.rejected]);
        });

        it('returns the account object when succesful', () => {
            const account = {
                key: 'test',
                linkedServer: 'https://octest1.com/client4',
            };
            const promise1 = model.set(account).then(model.remove);
            const promise2 = model.get(account);
            return Promise.all([
                expect(promise1)
                    .to.eventually.have.property('key')
                    .and.to.equal('test'),
                expect(promise1)
                    .to.eventually.have.property('linkedServer')
                    .and.to.equal('https://octest1.com/client4'),
                expect(promise2).to.eventually.be.rejected,
            ]);
        });

        it('it returns an error if the account does not exist', () => {
            const account = {
                key: 'test',
                linkedServer: 'https://octest1.com/nonexisting',
            };
            const promise = model.remove(account);
            return Promise.all([expect(promise).to.eventually.be.rejected]);
        });
    });

    describe('getList: getting a list of all accounts', () => {
        it('it returns the list correctly', () => {
            const account = {
                key: 'test',
                linkedServer: 'https://octest1.com/client3',
            };
            const promise = model.set(account).then(model.getList);

            return Promise.all([
                expect(promise).to.eventually.have.length(1),
                expect(promise).to.eventually.satisfy((accounts) =>
                    accounts.every(
                        (account) => account.linkedServer && account.key
                    )
                ),
            ]);
        });
    });
});

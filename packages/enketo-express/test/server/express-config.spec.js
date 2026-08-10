// safer to ensure this here (in addition to grunt:env:test)
process.env.NODE_ENV = 'test';

const chai = require('chai');

const { expect } = chai;
const request = require('supertest');
const config = require('../../app/models/config-model').server;

config['base path'] = '';

const app = require('../../config/express');

// Coverage for https://github.com/enketo/enketo/pull/1567 - the
// `X-Powered-By: Express` header leaks framework fingerprinting info and is
// recommended against by both Express and OWASP.
describe('Express app configuration', () => {
    it('does not send an X-Powered-By header', (done) => {
        request(app)
            .get('/nonexistent-path-for-header-check')
            .expect((res) => {
                expect(res.headers['x-powered-by']).to.equal(undefined);
            })
            .end(done);
    });
});

const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const { signedCookie } = require('cookie-parser');
const { jwtDecrypt } = require('jose');
const { deriveEncryptionKey } = require('../../app/lib/encryption');
const config = require('../../app/models/config-model').server;

const DAY_SECS = 24 * 60 * 60;

/**
 * @param {string[]} setCookieHeaders
 * @param {string} name
 * @return {{ value: string, maxAge: number }}
 */
const getCookie = (setCookieHeaders, name) => {
    const header = setCookieHeaders.find((cookie) =>
        cookie.startsWith(`${name}=`)
    );
    const value = decodeURIComponent(header.split(';')[0].split('=')[1]);
    const maxAge = Number(/Max-Age=(\d+)/.exec(header)[1]);

    return { value, maxAge };
};

describe('Authentication Controller', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {import('express').Application} */
    let app;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        const { authentication } = config['linked form and data server'];
        sandbox.stub(authentication, 'type').value('basic');
        // Tests run over http, so allow the login page and cookies without https
        sandbox.stub(authentication, 'allow insecure transport').value(true);

        app = require('../../config/express');
    });

    afterEach(() => {
        sandbox.restore();
    });

    /**
     * Submits the login form like a browser does, with the CSRF token and cookie
     * from the login page.
     *
     * @param {Record<string, string>} form
     */
    const login = async (form) => {
        const agent = request.agent(app);
        const loginPage = await agent.get('/login').expect(200);
        const [, csrfToken] = /name="_csrf" value="([^"]+)"/.exec(
            loginPage.text
        );

        return agent
            .post('/login')
            .type('form')
            .send({ _csrf: csrfToken, ...form });
    };

    [
        { remember: undefined, maxAgeSecs: DAY_SECS },
        { remember: 'true', maxAgeSecs: 30 * DAY_SECS },
    ].forEach(({ remember, maxAgeSecs }) => {
        it(`issues a JWE auth cookie that expires with the token (remember: ${remember})`, async () => {
            const form = { username: ' alice ', password: 'secret' };
            const response = await login(
                remember ? { ...form, remember } : form
            );

            expect(response.status).to.equal(200);

            const encryptionKey = app.get('encryption key');
            const { value, maxAge } = getCookie(
                response.headers['set-cookie'],
                app.get('authentication cookie name')
            );
            const { payload } = await jwtDecrypt(
                signedCookie(value, encryptionKey),
                deriveEncryptionKey(encryptionKey)
            );
            const nowSecs = Math.floor(Date.now() / 1000);

            expect(payload).to.include({ user: 'alice', pass: 'secret' });
            expect(maxAge).to.equal(maxAgeSecs);
            expect(payload.exp).to.be.closeTo(nowSecs + maxAgeSecs, 5);
        });
    });

    it('responds with an error when the username is missing', async () => {
        const response = await login({ password: 'secret' });

        expect(response.status).to.equal(500);
        expect(response.headers['set-cookie'] ?? []).to.satisfy((cookies) =>
            cookies.every((cookie) => !cookie.startsWith('__enketo_='))
        );
    });
});

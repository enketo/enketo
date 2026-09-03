process.env.NODE_ENV = 'test';

const jwt = require('jwt-simple');
const chai = require('chai');

const { expect } = chai;

const encryptionKey = 's0m3v3rys3cr3tk3y';

function makeMockReq(token) {
    return {
        app: {
            get(key) {
                if (key === 'linked form and data server') {
                    return { authentication: { type: 'basic' } };
                }
                if (key === 'authentication cookie name') {
                    return '__enketo';
                }
                if (key === 'encryption key') {
                    return encryptionKey;
                }
            },
        },
        signedCookies: { __enketo: token },
    };
}

const { getCredentials } = require('../../app/models/user-model');

describe('user-model', () => {
    describe('getCredentials', () => {
        it('returns credentials for a valid non-expired token', () => {
            const nowSecs = Math.floor(Date.now() / 1000);
            const token = jwt.encode(
                { user: 'alice', pass: 'secret', iat: nowSecs, exp: nowSecs + 3600 },
                encryptionKey
            );
            const creds = getCredentials(makeMockReq(token));
            expect(creds).to.deep.include({ user: 'alice', pass: 'secret' });
        });

        it('returns null for an expired token', () => {
            const pastSecs = Math.floor(Date.now() / 1000) - 7200;
            const token = jwt.encode(
                { user: 'alice', pass: 'secret', iat: pastSecs - 3600, exp: pastSecs },
                encryptionKey
            );
            const creds = getCredentials(makeMockReq(token));
            expect(creds).to.equal(null);
        });

        it('returns credentials for a legacy token without exp (backward-compatible)', () => {
            const token = jwt.encode(
                { user: 'alice', pass: 'secret' },
                encryptionKey
            );
            const creds = getCredentials(makeMockReq(token));
            expect(creds).to.deep.include({ user: 'alice', pass: 'secret' });
        });

        it('returns null when no cookie is present', () => {
            const req = makeMockReq(undefined);
            req.signedCookies.__enketo = undefined;
            const creds = getCredentials(req);
            expect(creds).to.equal(null);
        });
    });
});

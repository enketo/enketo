const { expect } = require('chai');
const { EncryptJWT } = require('jose');
const { deriveEncryptionKey } = require('../../app/lib/encryption');
const userModel = require('../../app/models/user-model');

const ENCRYPTION_KEY = 's0m3v3rys3cr3tk3y';
const derivedKey = deriveEncryptionKey(ENCRYPTION_KEY);

function makeReq(options = {}) {
    const { jwToken, authType = 'basic', queryParam } = options;
    return {
        app: {
            get(key) {
                if (key === 'authentication cookie name') return '__enketo_';
                if (key === 'encryption key') return ENCRYPTION_KEY;
                if (key === 'linked form and data server') {
                    return {
                        authentication: {
                            type: authType,
                            'query parameter': 'token',
                        },
                    };
                }
            },
        },
        signedCookies: { '__enketo_': jwToken },
        query: queryParam ? { token: queryParam } : {},
        headers: {},
    };
}

async function makeValidToken(overrides = {}) {
    const nowSecs = Math.floor(Date.now() / 1000);
    return new EncryptJWT({ user: 'alice', pass: 'secret', ...overrides })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime(nowSecs + 3600)
        .encrypt(derivedKey);
}

describe('user-model', () => {
    describe('getCredentials', () => {
        it('returns credentials from a valid JWE token', async () => {
            const token = await makeValidToken();
            const creds = await userModel.getCredentials(makeReq({ jwToken: token }));
            expect(creds).to.deep.equal({ user: 'alice', pass: 'secret' });
        });

        it('returns null for an expired JWE token', async () => {
            const nowSecs = Math.floor(Date.now() / 1000);
            const token = await new EncryptJWT({ user: 'alice', pass: 'secret' })
                .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
                .setIssuedAt()
                .setExpirationTime(nowSecs - 10)
                .encrypt(derivedKey);

            const creds = await userModel.getCredentials(makeReq({ jwToken: token }));
            expect(creds).to.be.null;
        });

        it('returns null for an old signed JWT (pre-migration token)', async () => {
            // jwt-simple produces a 3-part compact JWS; jwtDecrypt expects a 5-part JWE
            const oldToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWxpY2UiLCJwYXNzIjoic2VjcmV0In0.fakeSignature';
            const creds = await userModel.getCredentials(makeReq({ jwToken: oldToken }));
            expect(creds).to.be.null;
        });

        it('returns null when no cookie is present', async () => {
            const creds = await userModel.getCredentials(makeReq({ jwToken: undefined }));
            expect(creds).to.be.null;
        });

        it('returns bearer credentials for token auth type', async () => {
            const creds = await userModel.getCredentials(
                makeReq({ authType: 'token', queryParam: 'mytoken123' })
            );
            expect(creds).to.deep.equal({ bearer: 'mytoken123' });
        });
    });
});

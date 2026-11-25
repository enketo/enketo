const request = require('supertest');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const forge = require('node-forge');
const nock = require('nock');
const { expect } = require('chai');
const sinon = require('sinon');
const communicator = require('../../app/lib/communicator');
const mediaLib = require('../../app/lib/media');
const app = require('../../config/express');

/**
 * @return {{key: string, cert: string}} a self-signed certificate for localhost, valid for a day
 */
const createLocalhostCertificate = () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });
    const certificate = forge.pki.createCertificate();
    const subject = [{ name: 'commonName', value: 'localhost' }];

    certificate.publicKey = forge.pki.publicKeyFromPem(publicKey);
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date(Date.now() - 60 * 1000);
    certificate.validity.notAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
    certificate.setSubject(subject);
    certificate.setIssuer(subject);
    certificate.setExtensions([
        {
            name: 'subjectAltName',
            altNames: [
                { type: 2, value: 'localhost' },
                { type: 7, ip: '127.0.0.1' },
            ],
        },
    ]);
    certificate.sign(
        forge.pki.privateKeyFromPem(privateKey),
        forge.md.sha256.create()
    );

    return { key: privateKey, cert: forge.pki.certificateToPem(certificate) };
};

const testHTMLBody = 'im in.';
const portHTML = 1234;
const testHTMLURL = `http://localhost:${portHTML}/`;
const testHTMLMetaURL = `http://0.0.0.0:${portHTML}/`;
const testHTMLValidHTTPSURL =
    'https://www.w3.org/People/mimasa/test/imgformat/img/w3c_home_2.jpg';

describe('Media controller', () => {
    const enketoId = 'surveyA';
    const hostURLs = [testHTMLURL, testHTMLMetaURL, testHTMLValidHTTPSURL];

    /** @type {sinon.SinonSandbox} */
    let sandbox;

    /** @type {sinon.SinonFakeTimers} */
    let timers;

    /** @type {string} */
    let requestURL;

    /** @type {string} */
    let requestMetaURL;

    /** @type {string} */
    let requestValidHTTPSURL;

    /** @type {string[]} */
    let mediaURLs;

    /** @type {http.Server} */
    let server;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        timers = sinon.useFakeTimers({
            toFake: ['setTimeout'],
        });

        sandbox.stub(mediaLib, 'getHostURLOptions').callsFake((req) => ({
            basePath: app.get('base path'),
            deviceId: 'fake',
            requestPath: req.url,
        }));

        const manifest = [
            {
                filename: 'request.html',
                downloadUrl: testHTMLURL,
            },
            {
                filename: 'meta.html',
                downloadUrl: testHTMLMetaURL,
            },
            {
                filename: 'https.jpg',
                downloadUrl: testHTMLValidHTTPSURL,
            },
        ];

        sandbox.stub(communicator, 'getManifest').resolves({ manifest });

        const mediaMap = await mediaLib.getMediaMap(
            enketoId,
            manifest,
            mediaLib.getHostURLOptions({
                url: `${app.get('base path')}transform/xform/${enketoId}`,
                headers: {},
            })
        );

        requestURL = mediaMap['request.html'];
        requestMetaURL = mediaMap['meta.html'];
        requestValidHTTPSURL = mediaMap['https.jpg'];

        mediaURLs = [requestURL, requestMetaURL, requestValidHTTPSURL];

        const { origin, pathname } = new URL(testHTMLValidHTTPSURL);

        nock(origin)
            .get(pathname)
            .reply(200, { hostURL: testHTMLValidHTTPSURL });

        server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(testHTMLBody);
        });

        await new Promise((resolve, reject) => {
            server.on('error', reject);
            server.listen(portHTML, () => {
                server.removeListener('error', reject);
                resolve();
            });
        });
    });

    afterEach(async () => {
        timers.runAll();
        timers.restore();

        let caught;

        try {
            await new Promise((resolve, reject) => {
                if (server == null) {
                    reject();
                }

                server.close((error) => {
                    if (error != null) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            caught = error;
        }

        nock.cleanAll();
        sandbox.restore();

        if (caught != null) {
            throw caught;
        }
    });

    it('requests the URL in a cached media map', async () => {
        for await (const [index, mediaURL] of mediaURLs.entries()) {
            const hostURL = hostURLs[index];
            const { origin, pathname } = new URL(hostURL);

            nock(origin).get(pathname).reply(200, { hostURL });

            await request(app).get(mediaURL).expect(200, { hostURL });
        }
    });

    describe('redirects to media hosted elsewhere', () => {
        const cookie = 'kobonaut=secret';
        const credentials = { user: 'user', pass: 'secret' };

        /** @type {{key: string, cert: string}} */
        let tls;

        /** @type {http.Server} */
        let openRosaServer;

        /** @type {https.Server} */
        let remoteServer;

        // Like the internal OpenRosa URL: http, redirecting to where a file is hosted
        /** @type {string} */
        let openRosaOrigin;

        // The same server under another host name
        /** @type {string} */
        let otherHostOrigin;

        // Another host, over https
        /** @type {string} */
        let remoteOrigin;

        /** @type {Record<string, http.IncomingHttpHeaders>} */
        let receivedHeaders;

        /**
         * @param {http.Server} target - the server to start on a free port
         * @return {Promise<number>} the port
         */
        const listen = (target) =>
            new Promise((resolve, reject) => {
                target.once('error', reject);
                target.listen(0, '127.0.0.1', () => {
                    resolve(target.address().port);
                });
            });

        /**
         * @param {string} protocol - the server's protocol
         * @return {http.RequestListener} a handler that records the headers per URL
         * and redirects or serves a file
         */
        const handler = (protocol) => (req, res) => {
            const origin = `${protocol}//${req.headers.host}`;

            receivedHeaders[`${origin}${req.url}`] = req.headers;

            const redirects = {
                '/same-host': '/file.csv',
                '/other-host': `${otherHostOrigin}/file.csv`,
                '/other-host-auth': `${otherHostOrigin}/auth.csv`,
                '/remote': `${remoteOrigin}/file.csv`,
                '/insecure': `${openRosaOrigin}/file.csv`,
                '/invalid': 'http://[invalid',
                '/loop': '/loop',
            };

            if (redirects[req.url]) {
                res.writeHead(302, { location: redirects[req.url] });
            } else if (req.url === '/auth.csv' && !req.headers.authorization) {
                res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="x"' });
            } else if (
                req.url === '/auth-with-location.csv' &&
                !req.headers.authorization
            ) {
                res.writeHead(401, {
                    'WWW-Authenticate': 'Basic realm="x"',
                    location: `${otherHostOrigin}/file.csv`,
                });
            } else {
                res.writeHead(200, { 'Content-Type': 'text/csv' });
                res.write(`${origin} csv`);
            }
            res.end();
        };

        before(() => {
            tls = createLocalhostCertificate();
        });

        beforeEach(async () => {
            receivedHeaders = {};

            // Following a redirect clears the client's timeout, which a real clearTimeout
            // can't do for a fake setTimeout: the timeout would then fire in afterEach
            timers.restore();
            timers = sinon.useFakeTimers({
                toFake: ['setTimeout', 'clearTimeout'],
            });

            mediaLib.getHostURLOptions.callsFake((req) => ({
                auth: { ...credentials },
                basePath: app.get('base path'),
                cookie,
                requestPath: req.url,
            }));

            // Trusts the test server's self-signed certificate
            const { getUpdatedRequestOptions } = communicator;

            sandbox
                .stub(communicator, 'getUpdatedRequestOptions')
                .callsFake((options) => ({
                    ...getUpdatedRequestOptions(options),
                    ca: tls.cert,
                }));

            openRosaServer = http.createServer(handler('http:'));
            remoteServer = https.createServer(tls, handler('https:'));

            const [openRosaPort, remotePort] = await Promise.all([
                listen(openRosaServer),
                listen(remoteServer),
            ]);

            openRosaOrigin = `http://localhost:${openRosaPort}`;
            otherHostOrigin = `http://127.0.0.1:${openRosaPort}`;
            remoteOrigin = `https://localhost:${remotePort}`;
        });

        afterEach(async () => {
            await Promise.all(
                [openRosaServer, remoteServer].map(
                    (target) =>
                        new Promise((resolve) => {
                            target.close(resolve);
                        })
                )
            );
        });

        const getMedia = (hostURL) => {
            sandbox.stub(mediaLib, 'getHostURL').resolves(hostURL);

            return request(app).get(requestURL);
        };

        it('follows a redirect from http to https', async () => {
            await getMedia(`${openRosaOrigin}/remote`).expect(
                200,
                `${remoteOrigin} csv`
            );
        });

        it('sends the cookies to the OpenRosa server, but not to another host', async () => {
            await getMedia(`${openRosaOrigin}/other-host`).expect(
                200,
                `${otherHostOrigin} csv`
            );

            expect(
                receivedHeaders[`${openRosaOrigin}/other-host`].cookie
            ).to.equal(cookie);
            expect(
                receivedHeaders[`${otherHostOrigin}/file.csv`]
            ).to.not.have.property('cookie');
        });

        it('does not send the credentials to another host that asks for them', async () => {
            await getMedia(`${openRosaOrigin}/other-host-auth`).expect(401);

            expect(
                receivedHeaders[`${otherHostOrigin}/auth.csv`]
            ).to.not.have.property('authorization');
        });

        it('does not tell another host which URL it was redirected from', async () => {
            await getMedia(`${openRosaOrigin}/remote`).expect(200);

            expect(
                receivedHeaders[`${remoteOrigin}/file.csv`]
            ).to.not.have.property('referer');
        });

        it('keeps the cookies on a redirect to the same host', async () => {
            await getMedia(`${openRosaOrigin}/same-host`).expect(
                200,
                `${openRosaOrigin} csv`
            );

            expect(
                receivedHeaders[`${openRosaOrigin}/file.csv`].cookie
            ).to.equal(cookie);
        });

        it('does not follow a redirect from https to http', async () => {
            await getMedia(`${remoteOrigin}/insecure`)
                .expect(502)
                .expect((response) => {
                    expect(response.headers).to.not.have.property('location');
                });

            expect(receivedHeaders).to.not.have.property(
                `${openRosaOrigin}/file.csv`
            );
        });

        it('does not follow a redirect to an invalid URL', async () => {
            await getMedia(`${openRosaOrigin}/invalid`).expect(502);
        });

        it('answers once when there are too many redirects', async () => {
            // Only the error handler sets a status for this request
            const setStatus = sandbox.spy(app.response, 'status');

            await getMedia(`${openRosaOrigin}/loop`).expect(500);

            expect(setStatus.args).to.deep.equal([[500]]);
        });

        it('authenticates to the OpenRosa server even if its 401 has a location', async () => {
            await getMedia(`${openRosaOrigin}/auth-with-location.csv`).expect(
                200,
                `${openRosaOrigin} csv`
            );

            expect(
                receivedHeaders[`${openRosaOrigin}/auth-with-location.csv`]
                    .authorization
            ).to.equal(
                `Basic ${Buffer.from('user:secret').toString('base64')}`
            );
            expect(receivedHeaders).to.not.have.property(
                `${otherHostOrigin}/file.csv`
            );
        });

        it('handles redirects in the print view too', async () => {
            sandbox
                .stub(mediaLib, 'getHostURL')
                .callsFake(async (options) =>
                    options.requestPath.endsWith('insecure')
                        ? `${remoteOrigin}/insecure`
                        : `${openRosaOrigin}/remote`
                );
            const printReferer = 'https://enketo.example.org/x/abc?print=true';

            await request(app)
                .get(requestURL)
                .set('referer', printReferer)
                .expect(200, `${remoteOrigin} csv`);
            await request(app)
                .get(`${requestURL}?insecure`)
                .set('referer', printReferer)
                .expect(502);
        });
    });
});

const { expect } = require('chai');
const sinon = require('sinon');
const { buildDefaultCSP, tileSource } = require('../../app/lib/csp');

/**
 * @param {string} policy - Content-Security-Policy header value
 * @return {Record<string, Array<string>>} Sources by directive
 */
const parse = (policy) =>
    Object.fromEntries(
        policy.split('; ').map((directive) => {
            const [name, ...sources] = directive.split(' ');

            return [name, sources];
        })
    );

describe('CSP library', () => {
    describe('tileSource', () => {
        [
            [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://tile.openstreetmap.org',
            ],
            [
                'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                'https://*.tile.openstreetmap.fr',
            ],
            [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                'https://server.arcgisonline.com',
            ],
            [
                'HTTPS://Tiles.Example.com:8443/{z}/{x}/{y}.png',
                'https://tiles.example.com:8443',
            ],
            ['http://tiles.local/{z}/{x}/{y}.png', 'http://tiles.local'],
            ['//{s}.tile.example.com/{z}/{x}/{y}.png', '*.tile.example.com'],
            [
                'https://user:key@tiles.example.com/{z}/{x}/{y}.png',
                'https://tiles.example.com',
            ],
        ].forEach(([url, expected]) => {
            it(`turns ${url} into ${expected}`, () => {
                expect(tileSource(url)).to.equal(expected);
            });
        });

        [
            'GOOGLE_SATELLITE',
            '/tiles/{z}/{x}/{y}.png',
            'https://tiles.{s}.example.com/{z}/{x}/{y}.png',
            '',
        ].forEach((url) => {
            it(`ignores "${url}"`, () => {
                expect(tileSource(url)).to.equal(undefined);
            });
        });
    });

    describe('buildDefaultCSP', () => {
        let warn;

        beforeEach(() => {
            warn = sinon.stub(console, 'warn');
        });

        afterEach(() => {
            warn.restore();
        });

        it('allows OpenStreetMap and the address search when no maps are configured', () => {
            const csp = parse(buildDefaultCSP({}));

            expect(csp['default-src']).to.deep.equal(["'self'", 'blob:']);
            expect(csp['script-src']).to.deep.equal([
                "'self'",
                "'unsafe-inline'",
                'data:',
            ]);
            expect(csp['img-src']).to.deep.equal([
                "'self'",
                'data:',
                'blob:',
                'https://tile.openstreetmap.org',
            ]);
            expect(csp['connect-src']).to.deep.equal([
                "'self'",
                'blob:',
                'https://tile.openstreetmap.org',
                'https://maps.googleapis.com',
            ]);
            expect(csp).not.to.have.property('frame-src');
            expect(csp).not.to.have.property('font-src');
        });

        it('allows the tile hosts of every configured map in img-src and connect-src', () => {
            const csp = parse(
                buildDefaultCSP({
                    maps: [
                        {
                            name: 'humanitarian',
                            tiles: [
                                'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                            ],
                        },
                        {
                            name: 'satellite',
                            tiles: [
                                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                            ],
                        },
                        {
                            name: 'terrain',
                            tiles: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                        },
                        {
                            name: 'streets',
                            tiles: [
                                'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            ],
                        },
                    ],
                })
            );
            const tiles = [
                'https://*.tile.openstreetmap.fr',
                'https://server.arcgisonline.com',
                'https://*.tile.opentopomap.org',
                'https://*.tile.openstreetmap.org',
            ];

            expect(csp['img-src']).to.include.members(tiles);
            expect(csp['connect-src']).to.include.members(tiles);
            expect(csp['img-src']).not.to.include(
                'https://tile.openstreetmap.org'
            );
        });

        it('lists each source once', () => {
            const policy = buildDefaultCSP({
                maps: [
                    {
                        tiles: [
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        ],
                    },
                    {
                        tiles: [
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        ],
                    },
                ],
            });

            expect(
                parse(policy)['img-src'].filter(
                    (source) => source === 'https://tile.openstreetmap.org'
                )
            ).to.have.length(1);
        });

        it('allows the Google Maps hosts only when a Google layer is configured', () => {
            const without = parse(buildDefaultCSP({}));
            const csp = parse(
                buildDefaultCSP({
                    maps: [{ name: 'google', tiles: 'GOOGLE_SATELLITE' }],
                })
            );

            expect(without['script-src']).not.to.include(
                'https://*.googleapis.com'
            );
            expect(csp['script-src']).to.include.members([
                'https://*.googleapis.com',
                'https://*.gstatic.com',
                'https://*.google.com',
            ]);
            // These directives no longer fall back to default-src, so they must keep its sources
            expect(csp['font-src']).to.deep.equal([
                "'self'",
                'blob:',
                'https://fonts.gstatic.com',
            ]);
            expect(csp['frame-src']).to.deep.equal([
                "'self'",
                'blob:',
                'https://*.google.com',
            ]);
            expect(csp['img-src']).not.to.include('GOOGLE_SATELLITE');
            expect(warn.called).to.equal(false);
        });

        it('treats only the layers the geopicker supports as Google layers', () => {
            const csp = parse(
                buildDefaultCSP({
                    maps: [{ name: 'typo', tiles: 'GOOGLE_STREETS' }],
                })
            );

            expect(csp['script-src']).not.to.include(
                'https://*.googleapis.com'
            );
            expect(csp).not.to.have.property('font-src');
        });

        it('warns about tile URLs it cannot allow', () => {
            const url = 'https://tiles.{s}.example.com/{z}/{x}/{y}.png';
            const csp = parse(buildDefaultCSP({ maps: [{ tiles: [url] }] }));

            expect(csp['img-src']).to.deep.equal(["'self'", 'data:', 'blob:']);
            expect(warn.calledOnce).to.equal(true);
            expect(warn.firstCall.args[0]).to.include(url);
        });

        it('allows Google Analytics only when it is the analytics service and has a measurement ID', () => {
            const google = { analytics: { measurementId: 'G-123' } };
            const csp = parse(buildDefaultCSP({ analytics: 'google', google }));

            expect(csp['script-src']).to.include(
                'https://*.googletagmanager.com'
            );
            expect(csp['img-src']).to.include('https://*.google-analytics.com');
            expect(csp['connect-src']).to.include.members([
                'https://*.google-analytics.com',
                'https://*.analytics.google.com',
            ]);

            [
                { analytics: 'piwik', google },
                {
                    analytics: 'google',
                    google: { analytics: { measurementId: '' } },
                },
            ].forEach((config) => {
                expect(
                    parse(buildDefaultCSP(config))['script-src']
                ).not.to.include('https://*.googletagmanager.com');
            });
        });

        it('allows the Piwik tracker origin only when Piwik is the analytics service', () => {
            const piwik = {
                analytics: {
                    'tracker url': 'https://stats.example.org/piwik/',
                },
            };
            const csp = parse(buildDefaultCSP({ analytics: 'piwik', piwik }));

            ['script-src', 'img-src', 'connect-src'].forEach((directive) => {
                expect(csp[directive]).to.include('https://stats.example.org');
            });
            expect(
                parse(buildDefaultCSP({ analytics: 'google', piwik }))[
                    'script-src'
                ]
            ).not.to.include('https://stats.example.org');
            expect(
                parse(
                    buildDefaultCSP({
                        analytics: 'piwik',
                        piwik: { analytics: { 'tracker url': '' } },
                    })
                )['script-src']
            ).to.deep.equal(["'self'", "'unsafe-inline'", 'data:']);
        });

        it('allows a Piwik tracker URL without a protocol', () => {
            const csp = parse(
                buildDefaultCSP({
                    analytics: 'piwik',
                    piwik: {
                        analytics: { 'tracker url': '//enketo.piwikpro.com/' },
                    },
                })
            );

            ['script-src', 'img-src', 'connect-src'].forEach((directive) => {
                expect(csp[directive]).to.include('enketo.piwikpro.com');
            });
        });
    });
});

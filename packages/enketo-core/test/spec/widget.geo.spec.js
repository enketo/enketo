import L from 'leaflet';
import 'leaflet.gridlayer.googlemutant';
import Geopicker from '../../src/widget/geo/geopicker';
import {
    createTestCoordinates,
    mockGetCurrentPosition,
} from '../helpers/geolocation';
import loadForm from '../helpers/load-form';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM = `<form class="or">
        <label class="question">
            <input name="/data/geo" type="text" data-type-xml="geoshape"/>
        </label>
    </form>`;
const SHAPE =
    '7.9377 -11.5845 0 0;7.9324 -11.5902 0 0;7.927 -11.5857 0 0;7.9377 -11.5845 0 0';

runAllCommonWidgetTests(Geopicker, FORM, SHAPE);

describe('Google Maps tile layer plugin', () => {
    // Regression test for https://github.com/enketo/enketo/issues/1574 -
    // leaflet.gridlayer.googlemutant@0.16.0 is incompatible with leaflet@1.9.4
    // and fails with `L.GridLayer.GoogleMutant is not a constructor`.
    it('registers a working L.gridLayer.googleMutant constructor', () => {
        expect(typeof L.gridLayer.googleMutant).to.equal('function');
        expect(() =>
            L.gridLayer.googleMutant({ type: 'roadmap' })
        ).not.to.throw();
    });
});

describe('geoshape widget', () => {
    let geoshapePicker;

    beforeEach(() => {
        const fragment = document.createRange().createContextualFragment(FORM);
        const control = fragment.querySelector('input');
        geoshapePicker = new Geopicker(control);
    });

    mockGetCurrentPosition(
        createTestCoordinates({
            latitude: 48.66,
            longitude: -120.5,
            accuracy: 2500.12,
            altitude: 123,
        })
    );

    describe('KML to Leaflet conversion', () => {
        const kmlCoordinates =
            '81.601884,44.160723 83.529902,43.665148 82.947737,44.248831 81.509322,44.321015';
        const a = {
            kml: `<coordinates>${kmlCoordinates}</coordinates>`,
            result: [
                [44.160723, 81.601884],
                [43.665148, 83.529902],
                [44.248831, 82.947737],
                [44.321015, 81.509322],
            ],
        };
        const b = {
            kml: '<coordinates>   11.111,22.222 33.333,44.444  </coordinates>',
            result: [
                [22.222, 11.111],
                [44.444, 33.333],
            ],
        };
        const gobbledigook = '<something< notquite </right>';

        it('works for space-separated KML <coordinates>', () => {
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(a.kml)
            ).to.deep.equal(a.result);
        });

        it('works for newline-separated KML <coordinates>', () => {
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(
                    a.kml.replace(' ', '\n')
                )
            ).to.deep.equal(a.result);
        });

        it('ignores gobbledigook outside of <coordinates>', () => {
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(
                    a.kml + gobbledigook
                )
            ).to.deep.equal(a.result);
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(
                    gobbledigook + a.kml
                )
            ).to.deep.equal(a.result);
        });

        it('only extracts the values of the first <coordinates> if multiple are present', () => {
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(
                    a.kml + b.kml
                )
            ).to.deep.equal(a.result);
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(
                    b.kml + a.kml
                )
            ).to.deep.equal(b.result);
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(
                    gobbledigook + b.kml + gobbledigook + a.kml + gobbledigook
                )
            ).to.deep.equal(b.result);
        });

        it('works for the content of a single <coordinates> without the tags', () => {
            expect(
                geoshapePicker._convertKmlCoordinatesToLeafletCoordinates(
                    kmlCoordinates
                )
            ).to.deep.equal(a.result);
        });
    });

    describe('tile layer options', () => {
        // Coverage for https://github.com/enketo/enketo/pull/1565 - ensures
        // `referrerPolicy` configured on a map layer actually reaches the
        // Leaflet TileLayer instance, not just the intermediate options object.
        it('passes a configured referrerPolicy through to the Leaflet tile layer', async () => {
            const map = {
                tiles: ['https://example.com/{z}/{x}/{y}.png'],
                referrerPolicy: 'no-referrer-when-downgrade',
            };

            const layer = await geoshapePicker._getLeafletTileLayer(map, 0);

            expect(layer.options.referrerPolicy).to.equal(
                'no-referrer-when-downgrade'
            );
        });

        it('defaults referrerPolicy to false when not configured', async () => {
            const map = {
                tiles: ['https://example.com/{z}/{x}/{y}.png'],
            };

            const layer = await geoshapePicker._getLeafletTileLayer(map, 0);

            expect(layer.options.referrerPolicy).to.equal(false);
        });
    });

    it('does not load a geopicker widget for setvalue references within an input', () => {
        const form = loadForm('setvalue-setgeopoint-geopoint.xml');

        form.init();

        const geopickers = form.view.html.querySelectorAll(
            '[name="/data/rpt/foo"] ~ .geopicker'
        );

        expect(geopickers.length).to.equal(0);
    });

    it('does not load a geopicker widget for setgeopoint references within an input', () => {
        const form = loadForm('setvalue-setgeopoint-geopoint.xml');

        form.init();

        const geopickers = form.view.html.querySelectorAll(
            '[name="/data/rpt/bar"] ~ .geopicker'
        );

        expect(geopickers.length).to.equal(0);
    });
});

const EARTH_EQUATORIAL_RADIUS_METERS = 6378100;
const PRECISION = 100;

const { asString } = require('./utils/xpath-cast');

function _toLatLngs(geopoints) {
    return geopoints.map((geopoint) => geopoint.trim().split(' '));
}

// converts degrees to radians
function _toRadians(angle) {
    return (angle * Math.PI) / 180;
}

// check if all geopoints are valid (copied from Enketo FormModel)
function _latLngsValid(latLngs) {
    return latLngs.every(
        (coords) =>
            coords[0] !== '' &&
            coords[0] >= -90 &&
            coords[0] <= 90 &&
            coords[1] !== '' &&
            coords[1] >= -180 &&
            coords[1] <= 180 &&
            (typeof coords[2] === 'undefined' ||
                !Number.isNaN(Number(coords[2]))) &&
            (typeof coords[3] === 'undefined' ||
                (!Number.isNaN(Number(coords[3])) && coords[3] >= 0))
    );
}

/**
 * Adapted from https://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {{lat:number, lng: number}} p1
 * @param {{lat:number, lng: number}} p2
 * @returns {number}
 */
function _distanceBetween(p1, p2) {
    const Δλ = _toRadians(p1.lng - p2.lng);
    const φ1 = _toRadians(p1.lat);
    const φ2 = _toRadians(p2.lat);
    return (
        Math.acos(
            Math.sin(φ1) * Math.sin(φ2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
        ) * EARTH_EQUATORIAL_RADIUS_METERS
    );
}

/**
 * Adapted from https://github.com/Leaflet/Leaflet.draw/blob/3cba37065ea5be28f42efe9cc47836c9e3f5db8c/src/ext/GeometryUtil.js#L3-L20
 */
function area(geopoints) {
    const latLngs = _toLatLngs(geopoints);

    if (!_latLngsValid(latLngs)) {
        return Number.NaN;
    }

    const pointsCount = latLngs.length;
    let area = 0.0;

    if (pointsCount > 2) {
        for (let i = 0; i < pointsCount; i++) {
            const p1 = {
                lat: latLngs[i][0],
                lng: latLngs[i][1],
            };
            const p2 = {
                lat: latLngs[(i + 1) % pointsCount][0],
                lng: latLngs[(i + 1) % pointsCount][1],
            };
            area +=
                _toRadians(p2.lng - p1.lng) *
                (2 +
                    Math.sin(_toRadians(p1.lat)) +
                    Math.sin(_toRadians(p2.lat)));
        }
        area =
            (area *
                EARTH_EQUATORIAL_RADIUS_METERS *
                EARTH_EQUATORIAL_RADIUS_METERS) /
            2.0;
    }
    return Math.abs(Math.round(area * PRECISION)) / PRECISION;
}

/**
 * @param {any} geopoints
 * @returns
 */
function distance(geopoints) {
    const latLngs = _toLatLngs(geopoints);

    if (!_latLngsValid(latLngs)) {
        return Number.NaN;
    }

    const pointsCount = latLngs.length;
    let distance = 0.0;

    if (pointsCount > 1) {
        for (let i = 1; i < pointsCount; i++) {
            const p1 = {
                lat: latLngs[i - 1][0],
                lng: latLngs[i - 1][1],
            };
            const p2 = {
                lat: latLngs[i][0],
                lng: latLngs[i][1],
            };

            distance += _distanceBetween(p1, p2);
        }
    }

    return Math.abs(Math.round(distance * PRECISION)) / PRECISION;
}

module.exports = {
    asGeopoints,
    area,
    distance,
};

function asGeopoints(r) {
    if (r.t === 'arr' && r.v.length > 1) {
        return r.v.map(asString);
    }
    return asString(r).split(';');
}

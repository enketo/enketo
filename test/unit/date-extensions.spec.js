/**
 * @module date.spec
 * @see {@link https://github.com/medic/cht-core/blob/2c1db1618bdafc5ec14c3a27aa4a37249fcc1b4a/webapp/tests/mocha/unit/enketo/medic-xpath-extensions.spec.js}
 *
 * Note: These tests were adapted from `medic/cht-core`.
 */

const { assert } = require('chai');
const sinon = require('sinon');
const { getTimezoneOffsetAsTime, toISOLocalString } = require('../../src/date-extensions');

describe('Date helpers', () => {
  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  /** @type {number} */
  let timezoneOffset;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    timezoneOffset = 0;

    sandbox.stub(Date.prototype, 'getTimezoneOffset')
      .callsFake(() => timezoneOffset);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('legacy prototype methods', () => {
    describe('getTimezoneOffsetAsTime', () => {
      it('returns the time zone offset in hours when given a time zone difference in minutes', () => {
        timezoneOffset = -60;

        assert.equal((new Date()).getTimezoneOffsetAsTime(), '+01:00');
      });

      it('returns a negative time zone offset when given a positive time zone difference', () => {
        timezoneOffset = 60;

        assert.equal((new Date()).getTimezoneOffsetAsTime(), '-01:00');
      });
    });

    describe('toISOLocalString', () => {
      it('returns the ISO local string consistent with the time zone offset', () => {
        const date = new Date('August 19, 1975 23:15:30 GMT+07:00');
        timezoneOffset = -60;

        assert.equal(date.toISOLocalString(), '1975-08-19T17:15:30.000+01:00');

        timezoneOffset = 60;

        assert.equal(date.toISOLocalString(), '1975-08-19T15:15:30.000-01:00');
      });
    });
  });

  describe('plain functions', () => {
    describe('getTimezoneOffsetAsTime', () => {
      it('returns the time zone offset in hours when given a time zone difference in minutes', () => {
        timezoneOffset = -60;

        assert.equal(getTimezoneOffsetAsTime(new Date()), '+01:00');
      });

      it('returns a negative time zone offset when given a positive time zone difference', () => {
        timezoneOffset = 60;

        assert.equal(getTimezoneOffsetAsTime(new Date()), '-01:00');
      });
    });

    describe('toISOLocalString', () => {
      it('returns the ISO local string consistent with the time zone offset', () => {
        const date = new Date('August 19, 1975 23:15:30 GMT+07:00');
        timezoneOffset = -60;

        assert.equal(toISOLocalString(date), '1975-08-19T17:15:30.000+01:00');

        timezoneOffset = 60;

        assert.equal(toISOLocalString(date), '1975-08-19T15:15:30.000-01:00');
      });
    });
  });
});

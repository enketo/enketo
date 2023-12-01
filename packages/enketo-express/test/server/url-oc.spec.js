const { expect } = require('chai');
const { getSubmissionUrlAPI2 } = require('../../app/lib/url-oc');

describe('URL crafting functionality', () => {
    describe('for API 2', () => {
        [
            [
                'https://jmac.ngrok.io/OpenClinica/rest2/openrosa/S_RIVERS(TEST)',
                '/fieldsubmission/DeL3te/ecid/3232a/something/else',
                'https://jmac.ngrok.io/OpenClinica/rest2/openrosa/S_RIVERS(TEST)/fieldsubmission/ecid/3232a/something/else',
            ],
            [
                'http://localhost:3000',
                '/fieldsubmission/DeL3te/ecid/3232a/something/else',
                'http://localhost:3000/fieldsubmission/ecid/3232a/something/else',
            ],
        ].forEach(([server, path, expected]) => {
            it(`returns ${expected}`, () => {
                expect(getSubmissionUrlAPI2(server, path)).to.equal(expected);
            });
        });
    });
});

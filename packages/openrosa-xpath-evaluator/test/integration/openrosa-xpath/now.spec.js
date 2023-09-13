const { assert, initDoc } = require('../helpers');

describe('#now()', () => {
    const doc = initDoc('');

    // ODK spec says:
    // > Deviates from XForms 1.0 in that it returns the current date and time
    // > including timezone offset (i.e. not normalized to UTC) as described
    // > under the dateTime datatype.
    it('should return a timestamp for this instant', () => {
        // this check might fail if run at precisely midnight ;-)

        // given
        const now = new Date();
        const today = `${now.getFullYear()}-${(1 + now.getMonth())
            .toString()
            .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

        // when
        const result = doc.xEval(
            'now()',
            null,
            XPathResult.STRING_TYPE
        ).stringValue;

        assert.equal(today, result.split('T')[0]);

        // assert timezone is included
        assert.match(result, /-07:00$/);
    });
});

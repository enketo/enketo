define(['src/openrosa-xpath-extensions', 'chai', 'lodash'], function(or, chai, _) {
  describe('#date-format()', function() {
    it("should return empty string if it can't parse a date", function() {
      // when
      var formattedDate = or['format-date']('abc', '%Y');

      // then
      assert.equal(formattedDate.v, '');
    });
  });
});


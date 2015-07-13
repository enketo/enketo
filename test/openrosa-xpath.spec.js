define(['src/openrosa-xpath', 'chai'], function(openrosa_xpath, chai) {
  var assert = chai.assert;

  describe('test setup', function() {
    it('should provide `assert`', function() {
      assert.ok(assert);
    });
  });

  describe('openrosa-xpath', function() {
    it('should provide a function', function() {
      assert.typeOf(openrosa_xpath, 'function');
    });

    describe('#uuid()', function() {
      it('should provide an RFC 4122 version 4 compliant UUID string', function() {
        // when
        var provided = openrosa_xpath('uuid()');

        // then
        assert.match(provided, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });
  });
});

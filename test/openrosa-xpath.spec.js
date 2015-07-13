define(['src/openrosa-xpath', 'chai'], function(openrosa_xpath, chai) {
  var assert = chai.assert;

  describe('test setup', function() {
    it('should provide `assert`', function() {
      assert.ok(assert);
    });
  });

  describe('openrosa-xpath', function() {
    it('should provide a function', function() {
      assert.ok(openrosa_xpath);
    });
  });
});

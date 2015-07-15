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

    describe('#decimal-date-time()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#pow()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#indexed-repeat()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#format-date()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#coalesce()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#join()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#max()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#min()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#random()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#substr()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#int()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });

    describe('#uuid()', function() {
      it('should provide an RFC 4122 version 4 compliant UUID string', function() {
        // when
        var provided = openrosa_xpath('uuid()');

        // then
        assert.match(provided, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });

    describe('#regex()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#now()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#today()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#date()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#if()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#boolean-from-string()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#checklist()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#selected()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#selected-at()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#round()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#area()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
    describe('#position()', function() { it('should have tests', function() { assert.notOk('TODO'); }); });
  });
});

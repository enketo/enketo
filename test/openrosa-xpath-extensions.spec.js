define(['src/openrosa-xpath-extensions', 'chai', 'lodash'], function(or, chai, _) {
  describe('#date()', function() {
    describe('when called with integers', function() {
      it('should return a date type', function() {
        // expect
        assert.equal(or.date(0).t, 'date');
      });
      it('should return a value of type Date', function() {
        // expect
        assert.ok(or.date(0).v instanceof Date);
      });

      _.forEach({
        '1969-12-31': -1,
        '1970-01-01': 0,
        '1970-01-02': 1,
        '1971-02-05': 400,
      }, function(arg, expected) {
        it('should convert ' + arg + ' to ' + expected, function() {
          // expect
          assert.equal(or.date(arg).v.toISOString().slice(0, 10), expected);
        });
      });
    });

    describe('when called with valid strings', function() {
      _.forEach([
        '1969-12-31',
        '1970-01-01',
        '1970-01-02',
        '1971-02-05',
      ], function(arg) {
        it('should return a date type', function() {
          assert.equal(or.date(arg).t, 'date');
        });
        it('should return a value of type Date', function() {
          assert.ok(or.date(arg).v instanceof Date);
        });
        it('should return the correct date', function() {
          assert.equal(or.date(arg).v.toISOString().slice(0, 10), arg);
        });
      });
    });

    describe('when called with invalid strings', function() {
      _.forEach([
          'nonsense',
          '99-12-31',
      ], function(arg) {
        it('should return a string type', function() {
          assert.equal(or.date(arg).t, 'str');
        });
        it('should convert "' + arg + '" to "Invalid Date"', function() {
          assert.equal(or.date(arg).v, 'Invalid Date');
        });
      });
    });
  });

  describe('#date-format()', function() {
    it("should return empty string if it can't parse a date", function() {
      // when
      var formattedDate = or['format-date']('abc', '%Y');

      // then
      assert.equal(formattedDate.v, '');
    });
  });

  describe('#today()', function() {
    it('should return a result of type `date`', function() {
      assert.equal(or.today().t, 'date');
    });

    it('should return a value which is instance of Date', function() {
      assert.ok(or.today().v instanceof Date);
    });
  });
});


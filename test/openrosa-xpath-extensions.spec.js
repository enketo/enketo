define(['src/openrosa-xpath-extensions', 'chai', 'lodash'], function(or, chai, _) {
  var f = or.func;

  describe('#date()', function() {
    describe('when called with integers', function() {
      it('should return a date type', function() {
        // expect
        assert.equal(f.date(0).t, 'date');
      });
      it('should return a value of type Date', function() {
        // expect
        assert.ok(f.date(0).v instanceof Date);
      });

      _.forEach({
        '1969-12-31': -1,
        '1970-01-01': 0,
        '1970-01-02': 1,
        '1971-02-05': 400,
      }, function(arg, expected) {
        it('should convert ' + arg + ' to ' + expected, function() {
          // expect
          assert.equal(f.date(arg).v.toISOString().slice(0, 10), expected);
        });
      });
    });

    describe('when called with floats', function() {
      it('should return a date type', function() {
        // expect
        assert.equal(f.date(1.11596).t, 'date');
      });
      it('should return a value of type Date', function() {
        // expect
        assert.ok(f.date(1.11596).v instanceof Date);
      });

      _.forEach({
        '1969-12-31': -1.234567,
        '1970-01-01': 0.0001,
        '1970-01-02': 1.99999,
        '1971-02-05': 400.5,
      }, function(arg, expected) {
        it('should convert ' + arg + ' to ' + expected, function() {
          // expect
          assert.equal(f.date(arg).v.toISOString().slice(0, 10), expected);
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
          assert.equal(f.date(arg).t, 'date');
        });
        it('should return a value of type Date', function() {
          assert.ok(f.date(arg).v instanceof Date);
        });
        it('should return the correct date', function() {
          assert.equal(f.date(arg).v.toISOString().slice(0, 10), arg);
        });
      });
    });

    describe('when called with invalid strings', function() {
      _.forEach([
          'nonsense',
          '99-12-31',
      ], function(arg) {
        it('should return a string type', function() {
          assert.equal(f.date(arg).t, 'str');
        });
        it('should convert "' + arg + '" to "Invalid Date"', function() {
          assert.equal(f.date(arg).v, 'Invalid Date');
        });
      });
    });
  });

  describe('#date-format()', function() {
    it("should return empty string if it can't parse a date", function() {
      // when
      var formattedDate = f['format-date']('abc', '%Y');

      // then
      assert.equal(formattedDate.v, '');
    });
  });

  describe('#now()', function() {
    it('should return a result of type `date`', function() {
      assert.equal(f.now().t, 'date');
    });

    it('should return a value which is instance of Date', function() {
      assert.ok(f.now().v instanceof Date);
    });
  });

  describe('#today()', function() {
    it('should return a result of type `date`', function() {
      assert.equal(f.today().t, 'date');
    });

    it('should return a value which is instance of Date', function() {
      assert.ok(f.today().v instanceof Date);
    });

    it('should have a time set to midnight', function() {
      var today = f.today().v;

      assert.equal(today.getHours(), 0);
      assert.equal(today.getMinutes(), 0);
      assert.equal(today.getSeconds(), 0);
    });
  });

  describe('medic mobile extensions', function() {
    // TODO these should NOT be in here - please move them to a separate
    // extensions file

    describe('#difference-in-months', function() {
      [
        [ "2015-10-01", "2015-10-01", 0, ],
        [ "2015-09-01", "2015-10-01", 1, ],
        [ "2015-09-02", "2015-10-01", 0, ],
        [ "2015-10-01", "2015-11-01", 1, ],
        [ "2015-10-02", "2015-11-01", 0, ],
        [ "2014-10-01", "2015-10-01", 12, ],
        [ "2014-10-02", "2015-10-01", 11, ],
        [ "2015-10-01", "2014-10-01", -12, ],
      ].forEach(function(example) {
        var d1 = example[0],
            d2 = example[1],
            expectedDifference = example[2];

        it('should report difference between ' + d1 + ' and ' + d2 + ' as ' + expectedDifference, function() {
          assert.equal(f['difference-in-months'](d1, d2).v, expectedDifference);
        });
      });
    });
  });
});


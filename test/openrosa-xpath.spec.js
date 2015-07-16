define(['src/openrosa-xpath', 'chai', 'lodash'], function(openrosa_xpath, chai, _) {
  var TODO = function() { false && assert.notOk('TODO'); },
      assert = chai.assert,
      xEval,
      simpleValueIs = function(textValue) {
        var xml = '<simple><xpath><to><node>' + textValue +
                '</node></to></xpath><empty/></simple>',
            doc = new DOMParser().parseFromString(xml, 'application/xml');
        xEval = function(e) {
          return openrosa_xpath.call(doc, e, doc, null,
              XPathResult.STRING_TYPE, null);
        }
      };

  beforeEach(function() {
    // reset xEval for simple tests which don't define a doc
    xEval = openrosa_xpath;
  });

  describe('openrosa-xpath', function() {
    it('should provide a function', function() {
      assert.typeOf(openrosa_xpath, 'function');
    });

    describe('#decimal-date-time()', function() { it('should have tests', function() { TODO(); }); });

    describe('#pow()', function() {
      describe('should return power of text values', function() {
        it('3^0', function() {
          // given
          simpleValueIs('3');

          assert.equal(xEval('pow(/simple/xpath/to/node, 0)').numberValue, 1);
        });
        it('1^3', function() {
          // given
          simpleValueIs('1');

          assert.equal(xEval('pow(/simple/xpath/to/node, 3)').numberValue, 1);
        });
        it('4^2', function() {
          // given
          simpleValueIs('4');

          assert.equal(xEval('pow(/simple/xpath/to/node, 2)').numberValue, 16);
        });
      });
    });

    describe('#indexed-repeat()', function() { it('should have tests', function() { TODO(); }); });
    describe('#format-date()', function() { it('should have tests', function() { TODO(); }); });

    describe('#coalesce()', function() {
      it('should return first value if provided via xpath', function() {
        // given
        simpleValueIs('first');

        // expect
        assert.equal(xEval('coalesce(/simple/xpath/to/node, "whatever")').stringValue,
            'first');
      });
      it('should return first value if provided via string', function() {
        // expect
        assert.equal(xEval('coalesce("FIRST", "whatever")').stringValue,
            'FIRST');
      });
      it('should return second value from xpath if first value is empty string', function() {
        // given
        simpleValueIs('second');

        // expect
        assert.equal(xEval('coalesce("", /simple/xpath/to/node)').stringValue,
            'second');
      });
      it('should return second value from string if first value is empty string', function() {
        // expect
        assert.equal(xEval('coalesce("", "SECOND")').stringValue, 'SECOND');
      });
      it('should return second value from xpath if first value is empty xpath', function() {
        // given
        simpleValueIs('second');

        // expect
        assert.equal(xEval('coalesce(/simple/empty, /simple/xpath/to/node)').stringValue,
            'second');
      });
      it('should return second value from string if first value is empty xpath', function() {
        // given
        simpleValueIs('');

        // expect
        assert.equal(xEval('coalesce(/simple/xpath/to/node, "SECOND")').stringValue,
            'SECOND');
      });
    });

    describe('#join()', function() { it('should have tests', function() { TODO(); }); });
    describe('#max()', function() { it('should have tests', function() { TODO(); }); });
    describe('#min()', function() { it('should have tests', function() { TODO(); }); });

    describe('#random()', function() {
      it('should return a number', function() {
        var vals = [];
        _.times(10, function() {
          // when
          var val = xEval('random()').numberValue;

          // then
          assert.typeOf(val, 'number');

          vals.push(val);
        });

        // check the numbers are a bit random
        assert.equal(_.uniq(vals).length, vals.length);
      });
    });

    describe('#substr()', function() {
      it('should give the rest of a string if supplied with only startIndex', function() {
        // given
        simpleValueIs('0123456789');
        
        // expect
        assert.equal(xEval('substr(/simple/xpath/to/node, 5)').stringValue,
            '56789');
      });
      it('should give substring from start to finish if supplied with 2 indexes', function() {
        // given
        simpleValueIs('0123456789');
        
        // expect
        assert.equal(xEval('substr(/simple/xpath/to/node, 2, 4)').stringValue,
            '23');
      });
    });

    describe('#int()', function() {
      it('should convert a string to an integer', function() {
        // given
        simpleValueIs('123');

        // then
        assert.equal(xEval('int(/simple/xpath/to/node)').numberValue, 123);
      });
      it('should convert a decimal to an integer', function() {
        // given
        simpleValueIs('123.456');

        // then
        assert.equal(xEval('int(/simple/xpath/to/node)').numberValue, 123);
      });
      // TODO it's not clear from the spec what else this should do
    });

    describe('#uuid()', function() {
      it('should provide an RFC 4122 version 4 compliant UUID string', function() {
        // when
        var provided = xEval('uuid()');

        // then
        assert.match(provided.stringValue,
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });

    describe('#regex()', function() {
      it('should return `true` if value matches supplied regex', function() {
        // given
        simpleValueIs('123');

        // expect
        assert.ok(xEval('regex(/simple/xpath/to/node, "[0-9]{3}")').booleanValue);
      });
      // This test assumes that regex matching is for the whole value, so start
      // and end marks do not need to be included.  This seems logical, but is
      // not explicitly stated in the spec.
      it('should return `false` if value matches supplied regex', function() {
        // given
        simpleValueIs('1234');

        // expect
        assert.ok(xEval('regex(/simple/xpath/to/node, "[0-9]{3}")').booleanValue);
      });
    });

    describe('#now()', function() {
      it('should return a timestamp for this instant', function() {
        var before = Date.now(),
            val = xEval('now()').numberValue,
            after = Date.now();

        assert.ok(before <= val && after >= val);
      });
    });

    describe('#today()', function() {
      it('should return today\'s date', function() {
        // given
        var today = new Date(),
            zeroPad = function(n) { return n >= 10 ? n : '0' + n; };
        today = today.getFullYear() + '-' + zeroPad(today.getMonth()+1) + '-' +
            zeroPad(today.getDate());

        // expect
        assert.equal(xEval('today()').stringValue, today);
      });
    });

    describe('#date()', function() { it('should have tests', function() { TODO(); }); });
    describe('#if()', function() { it('should have tests', function() { TODO(); }); });

    describe('#boolean-from-string()', function() {
      _.forEach({
        '1': true,
        'true':true,
        'True':false,
        '0':false,
        '':false,
        'false':false,
        'nonsense':false
      }, function(expectedBoolean, nodeValue) {
        it('should evaluate `' + nodeValue +
            '` as ' + expectedBoolean.toString().toUpperCase(), function() {
          // given
          simpleValueIs(nodeValue);

          // then
          assert.equal(xEval('boolean-from-string(/simple/xpath/to/node)').stringValue,
              expectedBoolean.toString());
        });
      });
    });

    describe('#checklist()', function() { it('should have tests', function() { TODO(); }); });

    describe('#selected()', function() {
      it('should return true if requested item is in list', function() {
        // given
        simpleValueIs('one two three');

        // expect
        assert.ok(xEval('selected(/simple/xpath/to/node, "one")').booleanValue);
        assert.ok(xEval('selected(/simple/xpath/to/node, "two")').booleanValue);
        assert.ok(xEval('selected(/simple/xpath/to/node, "three")').booleanValue);
      });
      it('should return false if requested item not in list', function() {
        // given
        simpleValueIs('one two three');

        // expect
        assert.notOk(xEval('selected(/simple/xpath/to/node, "on")').booleanValue);
        assert.notOk(xEval('selected(/simple/xpath/to/node, "ne")').booleanValue);
        assert.notOk(xEval('selected(/simple/xpath/to/node, "four")').booleanValue);
      });
    });

    describe('#selected-at()', function() { it('should have tests', function() { TODO(); }); });
    describe('#round()', function() { it('should have tests', function() { TODO(); }); });
    describe('#area()', function() { it('should have tests', function() { TODO(); }); });
    describe('#position()', function() { it('should have tests', function() { TODO(); }); });
  });
});

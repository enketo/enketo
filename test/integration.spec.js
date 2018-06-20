define(['src/openrosa-xpath-extensions', 'src/extended-xpath', 'src/translate', 'chai', 'lodash'],
function(openRosaXpathExtensions, ExtendedXpathEvaluator, translate, chai, _) {
  const SIMPLE_DATE_MATCH = /^\d{4}-\d\d-\d\d$/;
  const FULL_DATE_MATCH = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d\d \d{4} \d\d:\d\d:\d\d GMT([+-]\d\d\d\d \(.+\))?/;
  const assert = chai.assert;

  function TODO() { if(false) assert.notOk('TODO'); }

  const extendedXpathEvaluator = new ExtendedXpathEvaluator(
      function wrappedXpathEvaluator(v) {
        return doc.evaluate.call(doc, v, doc, null,
            XPathResult.ANY_TYPE, null);
      },
      openRosaXpathExtensions(translate));

  let doc, xEval;
  function initDoc(xml) {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
    xEval = function(e) {
      return extendedXpathEvaluator.evaluate(e);
    };
  }
  function simpleValueIs(textValue) {
    initDoc(`<simple><xpath><to>
               <node>${textValue}</node>
             </to></xpath><empty/></simple>`);
  }
  const initBasicXmlDoc = () => simpleValueIs('');

  beforeEach(function() {
    initBasicXmlDoc();
  });


  describe('basic xpath', function() {
    describe('comparing node values', function() {
      describe('to integer values', function() {
        it('should support equality operator', function() {
          // given
          simpleValueIs(1);

          // expect
          assert.isTrue(xEval('/simple/xpath/to/node = 1').booleanValue);
        });
        it('should support inequality operator', function() {
          // given
          simpleValueIs(1);

          // expect
          assert.isFalse(xEval('/simple/xpath/to/node != 1').booleanValue);
        });
        it('should support comparators', function() {
          // given
          simpleValueIs(1);

          // expect
          assert.isFalse(xEval('/simple/xpath/to/node < 1').booleanValue);
          assert.isFalse(xEval('/simple/xpath/to/node > 1').booleanValue);
          assert.isTrue(xEval('/simple/xpath/to/node <= 1').booleanValue);
          assert.isTrue(xEval('/simple/xpath/to/node >= 1').booleanValue);
        });
      });
      describe('to string values', function() {
        it('should support equality operator', function() {
          // given
          simpleValueIs(1);

          // expect
          assert.isTrue(xEval('/simple/xpath/to/node = "1"').booleanValue);
        });
        it('should support inequality operator', function() {
          // given
          simpleValueIs(1);

          // expect
          assert.isFalse(xEval('/simple/xpath/to/node != "1"').booleanValue);
        });
      });
    });
  });

  describe('openrosa-xpath', function() {
    it('should process simple xpaths', function() {
      // given
      simpleValueIs('val');

      // expect
      assert.equal(xEval('/simple/xpath/to/node').stringValue, 'val');
    });

    describe('#concat', function() {
      it('should concatenate two xpath values', function() {
        // given
        simpleValueIs('jaja');

        // expect
        assert.equal(xEval('concat(/simple/xpath/to/node, /simple/xpath/to/node)').stringValue,
            'jajajaja');
      });
      it('should concatenate two string values', function() {
        // expect
        assert.equal(xEval('concat("port", "manteau")').stringValue,
            'portmanteau');
      });
      it('should concatenate a string and an xpath value', function() {
        // given
        simpleValueIs('port');

        // expect
        assert.equal(xEval('concat(/simple/xpath/to/node, "manteau")').stringValue,
            'portmanteau');
      });
      it('should concatenate an xpath and a string value', function() {
        // given
        simpleValueIs('port');

        // expect
        assert.equal(xEval('concat(/simple/xpath/to/node, "manteau")').stringValue,
            'portmanteau');
      });
    });

    describe('#date-time()', function() {
      describe('valid date string', function() {
        it('should be left alone', function() {
          assert.equal(xEval("date-time('1970-01-01')").stringValue, '1970-01-01');
        });
      });

      describe('valid date-time string', function() {
        it('should be converted to date string', function() {
          assert.equal(xEval("date-time('1970-01-01T21:50:49Z')").stringValue, '1970-01-01');
        });
      });

      describe('positive number', function() {
        _.forEach({
          'date-time(0)': '1970-01-01',
          'date-time(1)': '1970-01-02',
        }, function(expected, expr) {
          it(expr + ' should be converted to ' + expected, function() {
            assert.equal(xEval(expr).stringValue, expected);
          });
        });
      });

      describe('invalid date-time', function() {
        it('should not parse, but instead should return a String', function() {
          assert.equal(xEval("date-time('nonsense')").stringValue, 'Invalid Date');
        });
      });
    });

    describe('#date()', function() {
      describe('valid date string', function() {
        it('should be left alone', function() {
          assert.equal(xEval("date('1970-01-01')").stringValue, '1970-01-01');
        });
      });

      describe('date string with single-digit day or month values', function() {
        it('should insert zeroes', function() {
          assert.equal(xEval("date('1970-1-2')").stringValue, '1970-01-02');
        });
      });

      describe('number', function() {
        _.forEach({
          'date(0)': '1970-01-01',
          'date(1)': '1970-01-02',
          'date(1.5)': '1970-01-02',
          'date(-1)': '1969-12-31',
        }, function(expected, expr) {
          it(expr + ' should be converted to ' + expected, function() {
            assert.equal(xEval(expr).stringValue, expected);
          });
        });
      });

      describe('invalid date', function() {
        it('should not parse, but instead should return a String', function() {
          assert.equal(xEval("date('nonsense')").stringValue, 'Invalid Date');
        });
      });

      describe('comparisons', function() {
        _.forEach({
            'date("2001-12-26") > date("2001-12-25")': true,
            'date("2001-12-26") < date("2001-12-25")': false,
            'date("1969-07-20") < date("1969-07-21")': true,
            'date("1969-07-20") > date("1969-07-21")': false,
            'date("2004-05-01") = date("2004-05-01")': true,
            'date("2004-05-01") != date("2004-05-01")': false,
            '"string" != date("1999-09-09")': true,
            '"string" = date("1999-09-09")': false,
            'date(0) = date("1970-01-01")': true,
            'date(0) != date("1970-01-01")': false,
            'date(1) = date("1970-01-02")': true,
            'date(1) != date("1970-01-02")': false,
            'date(-1) = date("1969-12-31")': true,
            'date(-1) != date("1969-12-31")': false,
            'date(14127) = date("2008-09-05")': true,
            'date(14127) != date("2008-09-05")': false,
            'date(-10252) = date("1941-12-07")': true,
            'date(-10252) != date("1941-12-07")': false,
            'date("2012-01-01") < today()': true,
            'date("2012-01-01") > today()': false,
            'date("2100-01-02") > today()': true,
            'date("2100-01-02") < today()': false,
        }, function(expected, expr) {
          it('should evaluate \'' + expr + '\' to: ' + expected, function() {
            assert.equal(xEval(expr).booleanValue, expected);
          });
        });
      });
      describe('math', function() {
        _.forEach({
            'date("2001-12-26") + 5': '2001-12-31',
            'date("2001-12-26") - 5': '2001-12-21',
            '5 + date("2001-12-26")': '2001-12-31',
            '-5 + date("2001-12-26")': '2001-12-21',
            '3 + date("2001-12-26") + 5': '2002-01-03',
            '3 + date("2001-12-26") - 5': '2001-12-24',
        }, function(expected, expr) {
          it('should evaluate \'' + expr + '\' to: ' + expected, function() {
            assert.equal(xEval(expr).stringValue, expected);
          });
        });
      });
    });

    describe('#floor()', function() {
      _.forEach({
        '3': 3,
        '12.5': 12,
        '-3.75': -4,
      }, function(expected, decimal) {
        var expr = 'floor(' + decimal + ')';
        it('should convert ' + expr + ' to ' + expected, function() {
          // given

          // expect
          assert.equal(xEval(expr).numberValue, expected);
        });
      });
    });

    describe('#number()', function() {
      describe('called on a date string', function() {
        _.forEach({
            'number("1970-01-01")': '0',
            'number("1970-01-02")': '1',
            'number("1969-12-31")': '-1',
            'number("2008-09-05")': '14127',
            'number("1941-12-07")': '-10252',
        }, function(expectedResult, expr) {
          it(expr + ' should be ' + expectedResult + ' days since the epoch', function() {
            TODO();
          });
        });
      });
    });

    describe('#decimal-date()', function() {
      _.forEach({
        'decimal-date("1970-01-01")' : 0,
        'decimal-date("1970-01-02")' : 1,
        'decimal-date("1969-12-31")' : -1,
      }, function(expectedDaysSinceEpoch, expr) {
        it('should convert ' + expr + ' into ' + expectedDaysSinceEpoch, function() {
          assert.equal(xEval(expr).numberValue, expectedDaysSinceEpoch);
        });
      });
    });

    describe('#decimal-date-time()', function() {
      _.forEach({
        'decimal-date-time("1970-01-01T00:00:00Z")' : 0,
        'decimal-date-time("1970-01-02T00:00:00Z")' : 1,
        'decimal-date-time("1969-12-31T00:00:00Z")' : -1,
      }, function(expectedDaysSinceEpoch, expr) {
        it('should convert ' + expr + ' into ' + expectedDaysSinceEpoch, function() {
          assert.equal(xEval(expr).numberValue, expectedDaysSinceEpoch);
        });
      });
    });

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

    describe('#format-date()', function() {
      _.forEach({
        'format-date("2001-12-31", "%b %e, %Y")': 'Dec 31, 2001',
      }, function(expected, expr) {
        it(expr + ' should evaluate to ' + expected, function() {
          assert.equal(xEval(expr).stringValue, expected);
        });
      });
    });

    describe('#format-date-time()', function() {
      _.forEach({
        'format-date-time("2001-12-31", "%b %e, %Y")': 'Dec 31, 2001',
      }, function(expected, expr) {
        it(expr + ' should evaluate to ' + expected, function() {
          assert.equal(xEval(expr).stringValue, expected);
        });
      });
    });

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


    describe('#if()', function() {
      it('should return first option if true', function() {
        // given
        var val = xEval('if(true(), "a", "b")');

        // expect
        assert.equal(val.stringValue, 'a');
      });
      it('should return second option if false', function() {
        // given
        var val = xEval('if(false(), "a", "b")');

        // expect
        assert.equal(val.stringValue, 'b');
      });
    });

    describe('#false()', function() {
      it('should evaluate to false', function() {
        assert.equal(xEval('false()').booleanValue, false);
      });
    });

    describe('#true()', function() {
      it('should evaluate to true', function() {
        assert.equal(xEval('true()').booleanValue, true);
      });
    });

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

    describe('#round()', function() {
      describe('with a single argument', function() {
        _.forEach({
          '1': 1,
          '1.1': 1,
          '1.5': 2,
          '-1': -1,
          '-1.1': -1,
          '-1.5': -2,
        }, function(expected, input) {
          // when
          var expr = 'round("{1}")'
              .replace('{1}', input);

          it('should evaluate ' + expr + ' to ' + expected, function() {
            // expect
            assert.equal(xEval(expr).numberValue, expected);
          });
        });
      });

      describe('with two arguments', function() {
        describe('with num_digits = 0', function() {
          _.forEach({
            '1': 1,
            '1.1': 1,
            '1.5': 2,
            '-1': -1,
            '-1.1': -1,
            '-1.5': -2,
          }, function(expected, input) {
            // given
            var expr = 'round("{1}", "0")'
                .replace('{1}', input);

            it('should evaluate ' + expr + ' to ' + expected, function() {
              // expect
              assert.equal(xEval(expr).numberValue, expected);
            });
          });
        });

        describe('with num_digits > 0', function() {
          _.forEach([
            [ '0', 1, '0' ],
            [ '1', 1, '1' ],
            [ '1', 2, '1' ],
            [ '23.7825', 2, '23.78' ],
            [ '23.7825', 1, '23.8' ],
            [ '2.15', 1, '2.2' ],
            [ '2.149', 1, '2.1' ],
            [ '-1.475', 2, '-1.48' ],
          ], function(data) {
            // given
            var number = data[0];
            var numDigits = data[1];
            var expected = data[2];

            // and
            var expr = 'round("{1}", "{2}")'
                .replace('{1}', number)
                .replace('{2}', numDigits);

            it('should evaluate ' + expr + ' to ' + expected, function() {
              // when
              var res = xEval(expr);

              // then
              assert.equal(res.resultType, XPathResult.NUMBER_TYPE);
              assert.equal(res.stringValue, expected);
            });
          });
        });

        describe('with num_digits < 0', function() {
          _.forEach([
            [ '0', -1, 0 ],
            [ '1', -1, 0 ],
            [ '1', -2, 0 ],
            [ '23.7825', -2, 0 ],
            [ '23.7825', -1, 20 ],
            [ '2.15', -1, 0 ],
            [ '2.149', -1, 0 ],
            [ '-1.475', -2, 0 ],
            [ '21.5', -1, 20 ],
            [ '626.3', -3, 1000 ],
            [ '1.98', -1, 0 ],
            [ '-50.55', -2, -100 ],
          ], function(data) {
            // given
            var number = data[0];
            var numDigits = data[1];
            var expected = data[2];

            // and
            var expr = 'round("{1}", "{2}")'
                .replace('{1}', number)
                .replace('{2}', numDigits);

            it('should evaluate ' + expr + ' to ' + expected, function() {
              // when
              var res = xEval(expr);

              // then
              assert.equal(res.resultType, XPathResult.NUMBER_TYPE);
              assert.equal(res.stringValue, expected);
            });
          });
        });
      });
    });

    describe('#area()', function() { it('should have tests', function() { TODO(); }); });
    describe('#position()', function() { it('should have tests', function() { TODO(); }); });
  });


  describe('infix operators', function() {
    describe('math operators', function() {
      describe('with numbers', function() {
        _.forEach({
          '1 + 1' : 2,
          '1 - 1' : 0,
          '1 * 1' : 1,
          '1 div 1' : 1,
          '1 mod 1' : 0,
          '2 + 1' : 3,
          '2 - 1' : 1,
          '2 * 1' : 2,
          '2 div 1' : 2,
          '2 mod 1' : 0,
          '1 + 2' : 3,
          '1 - 2' : -1,
          '1 * 2' : 2,
          '1 div 2' : 0.5,
          '1 mod 2' : 1,
        }, function(expected, expr) {
          it('should evaluate "' + expr + '" as ' + expected, function() {
            assert.equal(xEval(expr).stringValue, expected);
          });
        });
      });
    });
    describe('boolean operators', function() {
      describe('with numbers', function() {
        _.forEach({
          '1 = 1' : true,
          '1 != 1' : false,
          '1 = 2' : false,
          '1 != 2' : true,
          '1 < 2' : true,
          '1 > 2' : false,
          '2 < 1' : false,
          '2 > 1' : true,
          '1 <= 2' : true,
          '1 >= 2' : false,
          '2 <= 1' : false,
          '2 >= 1' : true,
          '1 <= 1' : true,
          '1 >= 1' : true,
          '1 &lt; 2' : true,
          '1 &gt; 2' : false,
          '2 &lt; 1' : false,
          '2 &gt; 1' : true,
          '1 &lt;= 2' : true,
          '1 &gt;= 2' : false,
          '2 &lt;= 1' : false,
          '2 &gt;= 1' : true,
          '1 &lt;= 1' : true,
          '1 &gt;= 1' : true,

          /* weird spacing */
          '1=1' : true,
          '1= 1' : true,
          '1 =1' : true,
          '2=1' : false,
          '2= 1' : false,
          '2 =1' : false,
          '1!=1' : false,
          '1!= 1' : false,
          '1 !=1' : false,
          '2!=1' : true,
          '2!= 1' : true,
          '2 !=1' : true,
          '1<1' : false,
          '1< 1' : false,
          '1 <1' : false,
          '2<1' : false,
          '2< 1' : false,
          '2 <1' : false,
          '1>1' : false,
          '1> 1' : false,
          '1 >1' : false,
          '2>1' : true,
          '2> 1' : true,
          '2 >1' : true,
          '1<=1' : true,
          '1<= 1' : true,
          '1 <=1' : true,
          '2<=1' : false,
          '2<= 1' : false,
          '2 <=1' : false,
          '1>=1' : true,
          '1>= 1' : true,
          '1 >=1' : true,
          '2>=1' : true,
          '2>= 1' : true,
          '2 >=1' : true,
          '1&lt;1' : false,
          '1&lt; 1' : false,
          '1 &lt;1' : false,
          '2&lt;1' : false,
          '2&lt; 1' : false,
          '2 &lt;1' : false,
          '1&gt;1' : false,
          '1&gt; 1' : false,
          '1 &gt;1' : false,
          '2&gt;1' : true,
          '2&gt; 1' : true,
          '2 &gt;1' : true,
          '1&lt;=1' : true,
          '1&lt;= 1' : true,
          '1 &lt;=1' : true,
          '2&lt;=1' : false,
          '2&lt;= 1' : false,
          '2 &lt;=1' : false,
          '1&gt;=1' : true,
          '1&gt;= 1' : true,
          '1 &gt;=1' : true,
          '2&gt;=1' : true,
          '2&gt;= 1' : true,
          '2 &gt;=1' : true,
        }, function(expectedBoolean, expr) {
          it('should evaluate "' + expr + '" as ' + expectedBoolean.toString().toUpperCase(), function() {
            assert.equal(xEval(expr).booleanValue, expectedBoolean);
          });
        });
      });
      describe('with strings', function() {
        _.forEach({
          '"1" = "1"' : true,
          '"1" = "2"' : false,
          '"1" != "1"' : false,
          '"1" != "2"' : true,
          '"1" < "2"' : true,
          '"1" > "2"' : false,
          '"2" < "1"' : false,
          '"2" > "1"' : true,
          '"1" <= "2"' : true,
          '"1" >= "2"' : false,
          '"2" <= "1"' : false,
          '"2" >= "1"' : true,
          '"1" <= "1"' : true,
          '"1" >= "1"' : true,
          '"1" &lt; "2"' : true,
          '"1" &gt; "2"' : false,
          '"2" &lt; "1"' : false,
          '"2" &gt; "1"' : true,
          '"1" &lt;= "2"' : true,
          '"1" &gt;= "2"' : false,
          '"2" &lt;= "1"' : false,
          '"2" &gt;= "1"' : true,
          '"1" &lt;= "1"' : true,
          '"1" &gt;= "1"' : true,
          '"aardvark" < "aligator"' : true,
          '"aardvark" <= "aligator"' : true,
          '"aligator" < "aardvark"' : false,
          '"aligator" <= "aardvark"' : false,
          '"possum" > "aligator"' : true,
          '"possum" >= "aligator"' : true,
          '"aligator" > "possum"' : false,
          '"aligator" >= "possum"' : false,
        }, function(expectedBoolean, expr) {
          it('should evaluate "' + expr + '" as ' + expectedBoolean.toString().toUpperCase(), function() {
            assert.equal(xEval(expr).booleanValue, expectedBoolean);
          });
        });
      });
      describe('with booleans', function() {
        _.forEach({
          'true() and true()': true,
          'false() and true()': false,
          'true() and false()': false,
          'false() and false()': false,
          'true() or true()': true,
          'false() or true()': true,
          'true() or false()': true,
          'false() or false()': false,
        }, function(expectedBoolean, expr) {
          it('should evaluate "' + expr + '" as ' + expectedBoolean.toString().toUpperCase(), function() {
            assert.equal(xEval(expr).booleanValue, expectedBoolean);
          });
        });
      });
    });
  });

  describe('date comparison', function() {
    function relativeDateAsString(offset, noQuotes) {
      var d = new Date(),
          ret = noQuotes ? '' : '"';
      d.setDate(d.getDate() + offset);
      ret +=
          d.getFullYear() + '-' +
          zeroPad(d.getMonth()+1, 2) + '-' +
          zeroPad(d.getDate(), 2);

      return ret + (noQuotes ? '' : '"');
    }

    var zeroPad = function(n) { return n >= 10 ? n : '0' + n; },
        yesterdayString = relativeDateAsString(-1),
        todayString = relativeDateAsString(0),
        tomorrowString = relativeDateAsString(1);

    describe('yesterday', function() {
      it('should be less than today()', function() {
        assert.ok(xEval(yesterdayString + ' < today()').booleanValue);
      });

      it('should be less than or equal to today()', function() {
        assert.ok(xEval(yesterdayString + ' <= today()').booleanValue);
      });

      it('should not be greater than today()', function() {
        assert.notOk(xEval(yesterdayString + ' > today()').booleanValue);
      });

      it('should not be greater than or equal to today()', function() {
        assert.notOk(xEval(yesterdayString + ' >= today()').booleanValue);
      });
    });

    describe('today', function() {
      it('should be less than today()', function() {
        assert.ok(xEval(todayString + ' < today()').booleanValue);
      });

      it('should be less than or equal to today()', function() {
        assert.ok(xEval(todayString + ' <= today()').booleanValue);
      });

      it('should not be greater than today()', function() {
        assert.notOk(xEval(todayString + ' > today()').booleanValue);
      });

      it('should be greater than or equal to today()', function() {
        assert.notOk(xEval(todayString + ' >= today()').booleanValue);
      });
    });

    describe('today()', function() {
      it('should not be less than yesterday', function() {
        assert.notOk(xEval('today() < ' + yesterdayString).booleanValue);
      });

      it('should not be less than or equal to yesterday', function() {
        assert.notOk(xEval('today() <= ' + yesterdayString).booleanValue);
      });

      it('should be greater than yesterday', function() {
        assert.ok(xEval('today() > ' + yesterdayString).booleanValue);
      });

      it('should be greater than or equal to yesterday', function() {
        assert.ok(xEval('today() >= ' + yesterdayString).booleanValue);
      });


      it('should not be less than today', function() {
        assert.notOk(xEval('today() < ' + todayString).booleanValue);
      });

      it('because it is a precise moment, should not be less than or equal to today', function() {
        assert.notOk(xEval('today() <= ' + todayString).booleanValue);
      });

      it('because it is a precise moment, should be greater than today', function() {
        assert.ok(xEval('today() > ' + todayString).booleanValue);
      });

      it('because it is a precise moment, should be greater than or equal to today', function() {
        assert.ok(xEval('today() >= ' + todayString).booleanValue);
      });


      it('should be less than tomorrow', function() {
        assert.ok(xEval('today() < ' + tomorrowString).booleanValue);
      });

      it('should be less than or equal to tomorrow', function() {
        assert.ok(xEval('today() <= ' + tomorrowString).booleanValue);
      });

      it('should not be greater than tomorrow', function() {
        assert.notOk(xEval('today() > ' + tomorrowString).booleanValue);
      });

      it('should not be greater than or equal to tomorrow', function() {
        assert.notOk(xEval('today() >= ' + tomorrowString).booleanValue);
      });
    });

    describe('tomorrow', function() {
      it('should not be less than today()', function() {
        assert.notOk(xEval(tomorrowString + ' < today()').booleanValue);
      });

      it('should not be less than or equal to today()', function() {
        assert.notOk(xEval(tomorrowString + ' <= today()').booleanValue);
      });

      it('should be greater than today()', function() {
        assert.ok(xEval(tomorrowString + ' > today()').booleanValue);
      });

      it('should be greater than or equal to today()', function() {
        assert.ok(xEval(tomorrowString + ' >= today()').booleanValue);
      });
    });

    describe('comparisons with a field', function() {
      describe('set to today', function() {
        beforeEach(function() {
          simpleValueIs(relativeDateAsString(0, true));
        });

        it('should be less than tomorrow', function() {
          assert.ok(xEval('/simple/xpath/to/node < today() + 1').booleanValue);
        });

        it('should not be greater than tomorrow', function() {
          assert.notOk(xEval('/simple/xpath/to/node > today() + 1').booleanValue);
        });

        it('should be greater than yesterday', function() {
          assert.ok(xEval('/simple/xpath/to/node > today() - 1').booleanValue);
        });

        it('should not be less than yesterday', function() {
          assert.notOk(xEval('/simple/xpath/to/node < today() - 1').booleanValue);
        });

        describe('with brackets', function() {
          it('should be less than tomorrow', function() {
            assert.ok(xEval('/simple/xpath/to/node < (today() + 1)').booleanValue);
          });

          it('should not be greater than tomorrow', function() {
            assert.notOk(xEval('/simple/xpath/to/node > (today() + 1)').booleanValue);
          });

          it('should be greater than yesterday', function() {
            assert.ok(xEval('/simple/xpath/to/node > (today() - 1)').booleanValue);
          });

          it('should not be less than yesterday', function() {
            assert.notOk(xEval('/simple/xpath/to/node < (today() - 1)').booleanValue);
          });
        });
      });
    });

  });

  describe('some complex examples', function() {
    _.forEach({
      'concat("uuid:", uuid())':/uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/,
      '"2015-07-15" &lt; today()': true,
      '"2015-07-15" < today()' : true,
      "'2015-07-15' &lt; today()" : true,
      "'2015-07-15' < today()" : true,
      "'raw-string'" : 'raw-string',
      'format-date-time(date-time(decimal-date-time("2003-03-12") + 280), "%b %e, %Y")': /Dec 17, 2003/,
      "decimal-date-time(today()- 60 )": /^-?[0-9]+(\.[0-9]+)?$/,
      "date-time(decimal-date-time(today()- 60 ))": /\d{4}-\d{2}-\d{2}/,
      "if(selected( 'date' ,'date'), 'first' ,'second')": /^first$/,
      "if(selected( 'approx' ,'date'), 'first' ,'second')": /^second$/,
      "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, 'testing')": /testing/,
      "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, concat('testing', '1', '2', '3', '...'))": /testing/,
      "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, date-time(0))": FULL_DATE_MATCH,
      "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, date-time(decimal-date-time(today() - 60)))": FULL_DATE_MATCH,
      "if(selected( /model/instance[1]/pregnancy/group_lmp/lmp_method ,'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date ,date-time(decimal-date-time(today()- 60 )))": FULL_DATE_MATCH,
      'if(true(), today(), today())': FULL_DATE_MATCH,
      'if(false(), today(), today())': FULL_DATE_MATCH,
      'if(true(), "", today())': /^$/,
      'if(false(), "", today())': FULL_DATE_MATCH,
      'if(true(), today(), "")': FULL_DATE_MATCH,
      'if(false(), today(), "")': /^$/,
      'coalesce(today(), "")': FULL_DATE_MATCH,
      'coalesce("", today())': FULL_DATE_MATCH,
      'not(true())': 'false',
      'not(false())': 'true',
      'not(not(true()))': 'true',
      'not(not(false()))': 'false',
      'true() or true() or true()': true,
      'true() or true() or false()': true,
      'true() or false() or true()': true,
      'false() or true() or true()': true,
      'true() or false() or false()': true,
      'false() or true() or false()': true,
      'false() or false() or true()': true,
      'false() or false() or false()': false,
      '(true() or true()) or true()': true,
      '(true() or true()) or false()': true,
      '(true() or false()) or true()': true,
      '(false() or true()) or true()': true,
      '(true() or false()) or false()': true,
      '(false() or true()) or false()': true,
      '(false() or false()) or true()': true,
      '(false() or false()) or false()': false,
      'true() or (true() or true())': true,
      'true() or (true() or false())': true,
      'true() or (false() or true())': true,
      'false() or (true() or true())': true,
      'true() or (false() or false())': true,
      'false() or (true() or false())': true,
      'false() or (false() or true())': true,
      'false() or (false() or false())': false,
      '(true() and true()) or true()': true,
      '(true() and true()) or false()': true,
      '(true() and false()) or true()': true,
      '(false() and true()) or true()': true,
      '(true() and false()) or false()': false,
      '(false() and true()) or false()': false,
      '(false() and false()) or true()': true,
      '(false() and false()) or false()': false,
      'true() or (true() and true())': true,
      'true() or (true() and false())': true,
      'true() or (false() and true())': true,
      'false() or (true() and true())': true,
      'true() or (false() and false())': true,
      'false() or (true() and false())': false,
      'false() or (false() and true())': false,
      'false() or (false() and false())': false,
      '(true() or true()) and true()': true,
      '(true() or true()) and false()': false,
      '(true() or false()) and true()': true,
      '(false() or true()) and true()': true,
      '(true() or false()) and false()': false,
      '(false() or true()) and false()': false,
      '(false() or false()) and true()': false,
      '(false() or false()) and false()': false,
      '(true() and true()) and true()': true,
      '(true() and true()) and false()': false,
      '(true() and false()) and true()': false,
      '(false() and true()) and true()': false,
      '(true() and false()) and false()': false,
      '(false() and true()) and false()': false,
      '(false() and false()) and true()': false,
      '(false() and false()) and false()': false,
      'true() and true() and true()': true,
      'true() and true() and false()': false,
      'true() and false() and true()': false,
      'false() and true() and true()': false,
      'true() and false() and false()': false,
      'false() and true() and false()': false,
      'false() and false() and true()': false,
      'false() and false() and false()': false,
      'true() and (true() or true())': true,
      'true() and (true() or false())': true,
      'true() and (false() or true())': true,
      'true() and (false() or false())': false,
      'false() and (true() or true())': false,
      'false() and (true() or false())': false,
      'false() and (false() or true())': false,
      'false() and (false() or false())': false,
      '(true() and true()) or (false() and false())': true,
      '(true() and true()) and (false() and false())': false,
      '(true() and true()) and (false() or true())': true,
      '((true() or false()) and (false() or true())) and (false() or true())': true,
      '((true() or false()) and (false() or false())) and (false() or true())': false,
      '-1': /^-1$/,
      '1-1': /^0$/,
      '1+1': /^2$/,
      '0 > 0': false,
      '(0 > 0)': false,
      'false() != "true"': true,
      '(false() != "true")': true,
      '(0 = 0) and (false() != "true")': true,
      '0 = 0 and false() != "true"': true,
      '(0 > 0) and (false() != "true")': false,
      '0 > 0 and false() != "true"': false,
      'difference-in-months("2005-12-12", "2012-01-15")': 73,
      "if( /something, 'A', 'B' )": 'B',
      "if( /something  != '', 'A', 'B' )": 'B',
      "if( '' != '', 'A', 'B' )": 'B',
      "if( true(), 'A', 'B' )": 'A',
      "if ( /something, 'A', 'B' )": 'B',
      "if ( /something  != '', 'A', 'B' )": 'B',
      "if ( '' != '', 'A', 'B' )": 'B',
      "if ( true(), 'A', 'B' )": 'A',
      "not(selected(../dob_method,'approx'))": true,
      "not(not(selected(../dob_method,'approx')))": false,
      "selected(../dob_method,'approx')": false,
      "if(not(selected( ../dob_method,'approx')),  ../dob_calendar, date-time( decimal-date-time( today() ) - (365.25 * ../age_years) - (30.5 * ../age_months ) ) )": '',
      "if(not(selected( ../dob_method,'approx')),  ../dob_calendar, date-time( decimal-date-time( today() ) - (365.25 * ../age_years ) - (30.5 * ../age_months ) ) )": '',
      "date-time( decimal-date-time( today() ) - (365.25 * ../age_years) - (30.5 * ../age_months ) )": SIMPLE_DATE_MATCH,
      "date-time( decimal-date-time( today() ) - (365.25 * ../age_years ) - (30.5 * ../age_months ) )": SIMPLE_DATE_MATCH,
      "(365.25 * ../age_years) - (30.5 * ../age_months )": 0,
      "(365.25 * ../age_years )": 0,
      "(365.25 * ../age_years)": 0,
      "(30.5 * ../age_months )": 0,
      "(30.5 * ../age_months)": 0,
      "(../age_months )": '',
      "(../age_months)": '',
      "(0) - (0)": 0,
      "30.5 * ../age_months": 0,
      "2*3": 6,
      "(2*3)": 6,
      "2 * 3": 6,
      "(2 * 3)": 6,
      "2+3": 5,
      "(2+3)": 5,
      "2 + 3": 5,
      "(2 + 3)": 5,
      "today() < (today() + 1)": true,
      "today() > (today() + 1)": false,
      "today() < '1970-06-03'": false,
      "today() > '1970-06-03'": true,
      "today() + 1 < '1970-06-03'": false,
      "today() + 1 > '1970-06-03'": true,
      '.': '',

      // These tests exposed a weird bug which would return "Too many tokens" if dot was followed by a comparator
      ".>1": false,
      ".> 1": false,
      ". >1": false,
      ". > 1": false,
      ".>=1": false,
      ".>= 1": false,
      ". >=1": false,
      ". >= 1": false,
      ".<1": true,
      ".< 1": true,
      ". <1": true,
      ". < 1": true,
      ".<=1": true,
      ".<= 1": true,
      ". <=1": true,
      ". <= 1": true,

      '1=1': true,
      '1=0': false,
      '0=1': false,

      '1 =1': true,
      '1 =0': false,
      '0 =1': false,

      '1= 1': true,
      '1= 0': false,
      '0= 1': false,

      '1 = 1': true,
      '1 = 0': false,
      '0 = 1': false,

      "../some-path='some-value'": false,
      '../some-path="some-value"': false,
      "../some-path= 'some-value'": false,
      "../some-path ='some-value'": false,
      "../some-path = 'some-value'": false,

      "'some-value'=../some-path": false,
      '"some-value"=../some-path': false,
      "'some-value'= ../some-path": false,
      "'some-value' =../some-path": false,
      "'some-value' = ../some-path": false,

    }, function(matcher, expression) {
      it('should convert "' + expression + '" to match "' + matcher + '"', function() {
        var evaluated = xEval(expression);

        switch(typeof matcher) {
          case 'boolean': return assert.equal(evaluated.booleanValue, matcher);
          case 'number': return assert.equal(evaluated.numberValue, matcher);
          case 'string': return assert.equal(evaluated.stringValue, matcher);
          default: assert.match(evaluated.stringValue, matcher);
        }
      });
    });
  });
});

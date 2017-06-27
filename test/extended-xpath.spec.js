define(['src/extended-xpath', 'chai', 'lodash'], function(ExtendedXpathEvaluator, chai, _) {
  var docs = '',
      DATE_MATCH = '(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d\\d 20\\d\\d \\d\\d:\\d\\d:\\d\\d GMT([+-]\\d\\d\\d\\d \(.+\))?',
      examples = {
        'false':
          /false/,
        'true':
          /true/,
        '"double-string"':
          /^double-string$/,
        "'single-string'":
          /^single-string$/,
        '"string(shhh)"':
            /^string\(shhh\)$/,
        'date()':
            new RegExp('^' + DATE_MATCH + '$'),
        'upcase("spOtTy")':
            /^SPOTTY$/,
        'concat("single")':
            /^single$/,
        'concat("a","b")':
            /^ab$/,
        'concat("a","b","c")':
            /^abc$/,
        'concat("a", "b", "c")':
            /^abc$/,
        '"plus" + "one"':
            /^plusone$/,
        '"plus" + "one" + "plus" + "two"':
            /^plusoneplustwo$/,
        'upcase("what") + upcase("ever")':
            /^WHATEVER$/,
        'downcase("Fox"+"Trot")':
            /^foxtrot$/,
        'downcase("Fox" + "Trot")':
            /^foxtrot$/,
        'concat(date())':
            new RegExp('^' + DATE_MATCH + '$'),
        'concat(date(), "X")':
            new RegExp('^' + DATE_MATCH + 'X$'),
        'concat("X", date())':
            new RegExp('^X' + DATE_MATCH + '$'),
        '"Today\'s date: " + date()':
            new RegExp('^Today\'s date: ' + DATE_MATCH + '$'),
        'concat("Report::", "Today\'s date: " + date())':
            new RegExp('^Report::Today\'s date: ' + DATE_MATCH + '$'),
        'concat(concat(upcase("Big") + downcase("Little")) + "Average", " by ", concat("Some", " ", "Author"))':
            /^BIGlittleAverage by Some Author$/,
        '/xpath/expression':
            /^<xpath:\/xpath\/expression>$/,
        '"string-prefix-" + /xpath/expression':
            /^string-prefix-<xpath:\/xpath\/expression>$/,
        '/xpath/expression + "-string-suffix"':
            /^<xpath:\/xpath\/expression>-string-suffix$/,
        'concat("Evaluates to: ", /xpath/expression)':
            /^Evaluates to: <xpath:\/xpath\/expression>$/,
        '3':
            /^3$/,
        '3.1416':
            /^3.1416$/,
        '-3':
            /^-3$/,
        '-3.1416':
            /^-3.1416$/,
        '1 + 1':
            /^2$/,
        '1 - 1':
            /^0$/,
        '10 div 100':
            /^0.1$/,
        'random()':
            /^0.\d+$/,
        'random() div 10':
            /^0.0\d+$/,
        '12 mod 5':
            /^2$/,
        'reverse("hello " + "friend")':
            /^dneirf olleh$/,
        'reverse("hello ") + reverse("friend")':
            /^ ollehdneirf$/,
        'native_function()':
            /^<xpath:native_function\(\)>$/,
        'native_function(3)':
            /^<xpath:native_function\(3\)>$/,
        'native_function("string-arg")':
            /^<xpath:native_function\("string-arg"\)>$/,
        'native_function(\'string-with-escaped-"-arg\')':
            /^<xpath:native_function\('string-with-escaped-"-arg'\)>$/,
        'native_function(1, 2, 3, "a", \'b\', "c")':
            /^<xpath:native_function\(1, 2, 3, "a", "b", "c"\)>$/,
        'native-function()':
            /^<xpath:native-function\(\)>$/,
        'native-function(3)':
            /^<xpath:native-function\(3\)>$/,
        'native-function("string-arg")':
            /^<xpath:native-function\("string-arg"\)>$/,
        'native-function(1, 2, 3, "a", \'b\', "c")':
            /^<xpath:native-function\(1, 2, 3, "a", "b", "c"\)>$/,
        'native-function1(native-function2() + native-function3()) + native-function4(native-function5() + native-function6())':
            /^<xpath:native-function1\("<xpath:native-function2\(\)><xpath:native-function3\(\)>"\)><xpath:native-function4\("<xpath:native-function5\(\)><xpath:native-function6\(\)>"\)>$/,
        'native-function-with-space-before-bracket ()':
            /^<xpath:native-function-with-space-before-bracket\(\)>$/,
        '3 * 2 + 1':
          /^7$/,
        '1 + 2 * 3':
          /^7$/,
        '1 > 0':
          /^true$/,
        '1 > 1':
          /^false$/,
        '1 < 1':
          /^false$/,
        '1 > -1':
          /^true$/,
        '1 < -1':
          /^false$/,
        '-1 > 1':
          /^false$/,
        '-1 < 1':
          /^true$/,
        '-1 > -1':
          /^false$/,
        '-1 < -1':
          /^false$/,
        '-1 < -2':
          /^false$/,
      },
      trickyStandardXpath_supported = [
        '/model/instance[1]//*',
        '/model/instance[1]/*/meta/*',
        './author',
        'author',
        'first.name',
        '/bookstore',
        '//author',
        'author/first-name',
        'bookstore//title',
        'bookstore/*/title',
        'bookstore//book/excerpt//emph',
        './/title',
        'author/*',
        'book/*/last-name',
        '@style',
        'price/@exchange',
        'price/@exchange/total',
        'book[@style]',
        'book/@style',
        './first-name',
        'first-name',
        'author[1]',
        'author[first-name][3]',
        'my:book',
        'x/y[1]',
        'x[1]/y[2]',
        'book[excerpt]',
        'book[excerpt]/title',
        'book[excerpt]/author[degree]',
        'book[author/degree]',
        'author[degree][award]',
        'ancestor::book[1]',
        'ancestor::book[author][1]',
        'ancestor::author[parent::book][1]',
        '../../some-path',
        '*/*',
        '*[@specialty]',
        '@*',
        '@my:*',
        'my:*',
        'author[degree and award]',
        'author[(degree or award) and publication]',
        'author[degree and not(publication)]',
        'author[not(degree or award) and publication]',
        'author[. = "Matthew Bob"]',
        'author[last-name = "Bob" and ../price &gt; 50]',
        'author[not(last-name = "Bob")]',
        'author[first-name = "Bob"]',
        'author[last-name = "Bob" and first-name = "Joe"]',
        'author[* = "Bob"]',
        'author[last-name = "Bob"]',
        'author[last-name[1] = "Bob"]',
        'author[last-name [position()=1]= "Bob"]',
        'book[last()]',
        'book/author[last()]',
        'book[position() &lt;= 3]',
        'book[/bookstore/@specialty=@style]',
        'degree[position() &lt; 3]',
        'degree[@from != "Harvard"]',
        'p/text()[2]',
        'price[@intl = "Canada"]',
        'x/y[position() = 1]',
        '(book/author)[last()]',
        '(x/y)[1]',
      ],
      trickyStandardXpath_unsupported = [
      ],
      xp = {
        str: function(v) { return { t:'str', v:v }; },
        num: function(v) { return { t:'num', v:v }; },
      },
      _document = function(line) {
        docs += line + '\n';
      },
      extendedXpathEvaluator = new ExtendedXpathEvaluator(
        function wrappedXpathEvaluator(xpath) {
          return { resultType:XPathResult.STRING_TYPE, stringValue:'<xpath:' + xpath + '>' };
        },
        {
          func: {
            upcase: function(it) { return xp.str(it.toUpperCase()); },
            downcase: function(it) { return xp.str(it.toLowerCase()); },
            date: function() { return xp.str(new Date().toString()); },
            concat: function() {
              var i, acc = '';
              for(i=0; i<arguments.length; ++i) acc += arguments[i];
              return xp.str(acc);
            },
            random: function() { return xp.num(Math.random()); },
            reverse: function(it) { return xp.str(it.split('').reverse().join('')); },
          },
        }
      );

  describe('ExtendedXpathEvaluator', function() {

    describe('should delegate to the wrpaped evaluator when', function() {
      _.forIn({
        UNORDERED_NODE_ITERATOR_TYPE: 4,
        RDERED_NODE_ITERATOR_TYPE: 5,
        UNORDERED_NODE_SNAPSHOT_TYPE: 6,
        ORDERED_NODE_SNAPSHOT_TYPE: 7,
        ANY_UNORDERED_NODE_TYPE: 8,
        FIRST_ORDERED_NODE_TYPE: 9,
      }, function(typeVal, typeName) {
        it(typeName + ' is requested', function() {
          // given
          var wrappedCalls = [],
              evaluator = new ExtendedXpathEvaluator(function() {
                  wrappedCalls.push(Array.prototype.slice.call(arguments));
                },
                { func:{} }),
              someExpr = '/a/b/c', someContextNode = {}, someNamespaceResolver = {}, someResult = {};

          // when
          evaluator.evaluate(someExpr, someContextNode, someNamespaceResolver, typeVal, someResult);

          // given
          assert.deepEqual(wrappedCalls, [[someExpr, someContextNode, someNamespaceResolver, typeVal, someResult]]);
        });
      });
    });

    _.map(examples, function(expected, expr) {
      it(expr + ' should be evaluated', function() {
        if(typeof expected === 'string') {
          assert.equal(
            extendedXpathEvaluator.evaluate(expr).stringValue,
            expected);
        } else {
          assert.match(
            extendedXpathEvaluator.evaluate(expr).stringValue,
            expected);
        }
      });
    });

    describe('Supported XPath expressions', function() {
      it('has a documentation header', function() {
        _document('## Supported XPath expressions:');
        _document('');
      });

      _.each(trickyStandardXpath_supported, function(expr) {
        it(expr + ' should be delegated to the regular XPath evaluator', function() {
          _document('* `' + expr + '`');

          assert.equal(
            extendedXpathEvaluator.evaluate(expr).stringValue,
            '<xpath:' + expr + '>');
        });
      });

      it('has a documentation footer', function() {
        _document('');
        _document('');
      });
    });

    // Documents standard XPath expressions which are not currently supported
    describe('Unsupported XPath expressions', function() {
      it('has a documentation header', function() {
        _document('## Unsupported XPath expressions:');
        _document('');
      });

      _.each(trickyStandardXpath_unsupported, function(expr) {
        it(expr + ' should not be parsed correctly', function() {
          _document('* `' + expr + '`');

          // expect
          try {
            extendedXpathEvaluator.evaluate(expr);
            assert.notEqual(
              extendedXpathEvaluator.evaluate(expr).stringValue,
              '<xpath:' + expr + '>');
          } catch(e) {
            if(e.message.indexOf('Too many tokens.') === 0) {
              // expected
            } else throw e;
          }
        });
      });
    });

    describe('DOCUMENTATION', function() {
      it('supports the following:', function() {
        console.log('\n' + docs);
      });
    });
  });
});

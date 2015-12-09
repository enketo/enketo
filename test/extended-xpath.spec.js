define(['src/extended-xpath', 'chai', 'lodash'], function(ExtendedXpathEvaluator, chai, _) {
  var DATE_MATCH = '(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d\\d 2015 \\d\\d:\\d\\d:\\d\\d GMT([+-]\\d\\d\\d\\d \(.+\))?',
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
      },
      xp = {
        str: function(v) { return { t:'str', v:v }; },
        num: function(v) { return { t:'num', v:v }; },
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
    _.collect(examples, function(expected, expr) {
      it(expr + ' should be evaluated', function() {
        assert.match(
          extendedXpathEvaluator.evaluate(expr).stringValue,
          expected);
      });
    });
  });
});

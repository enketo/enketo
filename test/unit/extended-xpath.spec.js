// TODO this can be moved to test/unit
const ExtendedXPathEvaluator = require('../../src/extended-xpath');
const assert = require('chai').assert;
const _ = require('lodash');

var DATE_MATCH = '(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d\\d 20\\d\\d \\d\\d:\\d\\d:\\d\\d GMT([+-]\\d\\d\\d\\d (.+))?',
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
          /^NaN$/,
      'upcase("what")':
          /^WHAT$/,
      'concat(date())':
          new RegExp('^' + DATE_MATCH + '$'),
      'concat(date(), "X")':
          new RegExp('^' + DATE_MATCH + 'X$'),
      'concat("X", date())':
          new RegExp('^X' + DATE_MATCH + '$'),
      'concat("Report::", "Today\'s date: ", date())':
          new RegExp('^Report::Today\'s date: ' + DATE_MATCH + '$'),
      'concat(concat(upcase("Big"), downcase("Little")), "Average", " by ", concat("Some", " ", "Author"))':
          /^BIGlittleAverage by Some Author$/,
      '/xpath/expression':
          /^<xpath:\/xpath\/expression>$/,
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
          /^(0\.\d+)|(\d\.\d+e-\d)$/,
      'random() div 10':
          /^(0\.0\d+)|(\d\.\d+e-\d)$/,
      '12 mod 5':
          /^2$/,
      'reverse("hello")':
          /^olleh$/,
      'native_function()':
          /^<xpath:native_function\(\)>$/,
      'native_function(3)':
          /^<xpath:native_function\(3\)>$/,
      'native_function("string-arg")':
          /^<xpath:native_function\("string-arg"\)>$/,
      'native_function(\'string-with-escaped-"-arg\')':
          /^<xpath:native_function\('string-with-escaped-"-arg'\)>$/,
      'native_function(1, 2, 3, "a", \'b\', "c")':
          /^<xpath:native_function\(1,2,3,"a",'b',"c"\)>$/,
      'native-function()':
          /^<xpath:native-function\(\)>$/,
      'native-function(3)':
          /^<xpath:native-function\(3\)>$/,
      'native-function("string-arg")':
          /^<xpath:native-function\("string-arg"\)>$/,
      'native-function(1, 2, 3, "a", \'b\', "c")':
          /^<xpath:native-function\(1,2,3,"a",'b',"c"\)>$/,
      /*
      // Not clear what to do here as correcting this requires knowledge of return types of native functions.
      'native-function1(native-function2() + native-function3()) + native-function4(native-function5() + native-function6())':
          /^<xpath:native-function1\("<xpath:native-function2\(\)><xpath:native-function3\(\)>"\)><xpath:native-function4\("<xpath:native-function5\(\)><xpath:native-function6\(\)>"\)>$/,
      */
      'native-function-with-space-before-bracket ()':
          /^<xpath:native-function-with-space-before-bracket\(\)>$/,
      '3 * 2 + 1':
        /^7$/,
      '2 + 3 * 4 + 5 * 6 + 7 * 8 + 9':
        /^109$/,
      '2+3*4+5*6+7*8+9':
        /^109$/,
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
      '0.23':
        /^0.23$/,
      '.23':
        /^0.23$/,
      'concat(0+1,3-1,6 div 2,4*1)':
        /^1234$/,
      '0 or 1':
        true,
      '1 or throw-overkeen-error()':
        /^true/,
      '1 or 1 + throw-overkeen-error()':
        /^true/,
      '1 or throw-overkeen-error() + 1':
        /^true/,
      '0 and 1':
        false,
      '0 and throw-overkeen-error()':
        false,
      '0 and 1 + throw-overkeen-error()':
        false,
      '0 and throw-overkeen-error() + 1':
        false,
      '(1 or 1) or 1':
        true,
      '0 = 0 and false() != "true"':
        true,
      '1 or 1 and 0':
        true,
      '0 and 0 or 1':
        true,
      '0 and 1 or 1':
        true,
      '1 and 0 or 1':
        /^true/,
      '0 and throw-overkeen-error() or 1':
        true,
      '0 and (throw-overkeen-error())':
        false,
      '0 and concat(throw-overkeen-error())':
        false,
      '1 or /explode':
        /^true/,
      '1 or 1 + /explode':
        /^true/,
      '1 or /explode + 1':
        /^true/,
      '0 and /explode':
        false,
      '0 and 1 + /explode':
        false,
      '0 and /explode + 1':
        false,
      '0 and /explode or 1':
        true,
      '0 and (/explode)':
        false,
      '0 and concat(/explode)':
        false,
      '0 and /explode[/explode]':
        false,
      '1 div 0':
        Infinity,
      '-1 div 0':
        -Infinity,
    },
    trickyStandardXpath_supported = [
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
      'book/*/last-name',
      '@style',
      'price/@exchange',
      'price/@exchange/total',
      'book/@style',
      './first-name',
      'first-name',
      'my:book',
      '../../some-path',
      '*/*',
      '@*',
      '@my:*',
      'my:*',
    ],
    xp = {
      str: function(v) { return { t:'str', v:v }; },
      num: function(v) { return { t:'num', v:v }; },
    },
    extendedXPathEvaluator = new ExtendedXPathEvaluator(
      {
        evaluate: xpath => {
          if(xpath === 'throw-overkeen-error()') throw new Error('This path should not have been evaluated, because and/or should be lazy!');
          if(xpath === '/explode') throw new Error('The forbidden path was accessed!');
          return { resultType:XPathResult.STRING_TYPE, stringValue:'<xpath:' + xpath + '>' };
        },
      },
      {
        func: {
          upcase: function(it) { return xp.str(it.v.toUpperCase()); },
          downcase: function(it) { return xp.str(it.v.toLowerCase()); },
          date: function() { return xp.str(new Date().toString()); },
          concat: function() {
            var i, acc = '';
            for(i=0; i<arguments.length; ++i) acc += arguments[i].v;
            return xp.str(acc);
          },
          random: function() { return xp.num(Math.random()); },
          reverse: function(it) { return xp.str(it.v.split('').reverse().join('')); },
        },
      }
    );

describe('ExtendedXpathEvaluator', function() {
  _.map(examples, function(expected, expr) {
    it(`${expr} should evaluate to ${expected}`, function() {
      switch(typeof expected) {
        case 'boolean': return assert.equal(extendedXPathEvaluator.evaluate(expr).booleanValue, expected);
        case 'number':  return assert.equal(extendedXPathEvaluator.evaluate(expr).numberValue,  expected);
        case 'string':  return assert.equal(extendedXPathEvaluator.evaluate(expr).stringValue,  expected);
        default:        return assert.match(extendedXPathEvaluator.evaluate(expr).stringValue,  expected);
      }
    });
  });

  describe('Supported XPath expressions', function() {
    _.each(trickyStandardXpath_supported, function(expr) {
      it(expr + ' should be delegated to the regular XPath evaluator', function() {
        assert.equal(
          extendedXPathEvaluator.evaluate(expr).stringValue,
          '<xpath:' + expr + '>');
      });
    });
  });
});

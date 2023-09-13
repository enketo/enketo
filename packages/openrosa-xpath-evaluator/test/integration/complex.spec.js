const _ = require('lodash');

const { initDoc, assert } = require('./helpers');

const SIMPLE_DATE_MATCH = /^\d{4}-[0-1]\d-[0-3]\d$/;
const SIMPLE_DATE_OR_DATE_TIME_MATCH =
    /^\d{4}-[0-1]\d-[0-3]\d(T[0-2]\d:[0-5]\d:[0-5]\d\.\d\d\d(Z|[+-][0-1]\d(:[0-5]\d)?))?$/;

describe('some complex examples', () => {
    const doc = initDoc('');

    _.forEach(
        {
            'concat("uuid:", uuid())':
                /uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/,
            '"2015-07-15" < today()': true,
            "'2015-07-15' > today()": false,
            "'raw-string'": 'raw-string',
            'format-date-time(date-time(decimal-date-time("2003-03-12") + 280), "%b %e, %Y")':
                /^Dec 17, 2003$/,
            'decimal-date-time(today()- 60 )': /^-?[0-9]+(\.[0-9]+)?$/,
            'date-time(decimal-date-time(today()- 60 ))': SIMPLE_DATE_MATCH,
            "if(selected('date' ,'date'), 'first' ,'second')": /^first$/,
            "if(selected('approx' ,'date'), 'first' ,'second')": /^second$/,
            "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, 'testing')":
                /testing/,
            "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, concat('testing', '1', '2', '3', '...'))":
                /testing/,
            "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, date-time(0))":
                SIMPLE_DATE_OR_DATE_TIME_MATCH,
            "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method, 'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date, date-time(decimal-date-time(today() - 60)))":
                SIMPLE_DATE_MATCH,
            "if(selected(/model/instance[1]/pregnancy/group_lmp/lmp_method ,'date'), /model/instance[1]/pregnancy/group_lmp/lmp_date ,date-time(decimal-date-time(today()- 60 )))":
                SIMPLE_DATE_MATCH,
            'if(true(), today(), today())': SIMPLE_DATE_MATCH,
            'if(false(), today(), today())': SIMPLE_DATE_MATCH,
            'if(true(), "", today())': /^$/,
            'if(false(), "", today())': SIMPLE_DATE_MATCH,
            'if(true(), today(), "")': SIMPLE_DATE_MATCH,
            'if(false(), today(), "")': /^$/,
            'coalesce(today(), "")': SIMPLE_DATE_MATCH,
            'coalesce("", today())': SIMPLE_DATE_MATCH,
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
            "if(/something, 'A', 'B' )": 'B',
            "if(/something  != '', 'A', 'B' )": 'B',
            "if('' != '', 'A', 'B' )": 'B',
            "if(true(), 'A', 'B' )": 'A',
            "if (/something, 'A', 'B' )": 'B',
            "if (/something  != '', 'A', 'B' )": 'B',
            "if ('' != '', 'A', 'B' )": 'B',
            "if (true(), 'A', 'B' )": 'A',
            "not(selected(../dob_method,'approx'))": true,
            "not(not(selected(../dob_method,'approx')))": false,
            "selected(../dob_method,'approx')": false,
            '(0) - (0)': 0,
            '2*3': 6,
            '(2*3)': 6,
            '2 * 3': 6,
            '(2 * 3)': 6,
            '2+3': 5,
            '(2+3)': 5,
            '2 + 3': 5,
            '(2 + 3)': 5,
            '2 + 4': '6',
            'today() < (today() + 1)': true,
            'today() > (today() + 1)': false,
            "today() < '1970-06-03'": false,
            "today() > '1970-06-03'": true,
            "today() + 1 < '1970-06-03'": false,
            "today() + 1 > '1970-06-03'": true,
            '.': [(node) => assert.equal(node.nodeName, '#document')],

            // Bracketed expressions inside vs outside function calls:

            1: 1,
            '(1)': 1,
            '(1 + 1) - 1': 1,
            '((1 + 1) - 1)': 1,
            '-1 + (1 + 1)': 1,
            '(-1 + (1 + 1))': 1,

            3: 3,
            '(3)': 3,
            '(1 + 1) + 1': 3,
            '((1 + 1) + 1)': 3,

            'cos(3)': Math.cos(3),
            'cos((1 + 1) + 1)': Math.cos(3),

            'cos(1)': Math.cos(1),
            'cos((1 + 1) - 1)': Math.cos(1),
            'cos(-1 + (1 + 1))': Math.cos(1),

            // These tests exposed a weird bug which would return "Too many tokens" if dot was followed by a comparator
            // In all these tests, the root node is being passed to `number()` to allow its comparison with the number
            // 1.  The text is null, so its numeric value is NaN.  This makes all comparisons return false.

            '.>1': false,
            '.> 1': false,
            '. >1': false,
            '. > 1': false,
            '.>=1': false,
            '.>= 1': false,
            '. >=1': false,
            '. >= 1': false,
            '.<1': false,
            '.< 1': false,
            '. <1': false,
            '. < 1': false,
            '.<=1': false,
            '.<= 1': false,
            '. <=1': false,
            '. <= 1': false,

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
        },
        (matcher, expression) => {
            it(`should convert "${expression}" to match "${matcher}"`, () => {
                const evaluated = doc.xEval(expression);

                if (Array.isArray(matcher)) {
                    matcher.forEach((nodeMatcher) => {
                        nodeMatcher(evaluated.iterateNext());
                    });
                    assert.isNull(evaluated.iterateNext());
                } else {
                    switch (typeof matcher) {
                        case 'boolean':
                            assert.equal(evaluated.booleanValue, matcher);
                            return;

                        case 'number':
                            assert.equal(evaluated.numberValue, matcher);
                            return;

                        case 'string':
                            assert.equal(evaluated.stringValue, matcher);
                            return;

                        default:
                            assert.match(evaluated.stringValue, matcher);
                    }
                }
            });
        }
    );
});

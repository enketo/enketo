const {
    initDoc,
    assert,
    assertNumber,
    assertNumberValue,
    assertBoolean,
} = require('../helpers');

describe('number operators', () => {
    describe('+', () => {
        [
            ['1+1', 2],
            ['0+1', 1],
            ['0+0', 0],
            ['0+-0', 0],
            ['-1 + 1', 0],
            ['-1 +-1', -2],
            ['1.05+2.05', 3.0999999999999996],
            // [".5   \n +.5+.3", 1.3],
            ['5+4+1+-1+-4', 5],
            // ["'1'+'1'", 2],
            ['.55+ 0.56', 1.11],
            ['1.0+1.0', 2],
            ['true()+true()', 2],
            ['false()+1', 1],
            ['(1 div 0) * 0', NaN],
            ['(1 div 0) + 1', Number.POSITIVE_INFINITY],
            ['(-1 div 0) + 1', Number.NEGATIVE_INFINITY],
            ['1 + (-1 div 0)', Number.NEGATIVE_INFINITY],
            ['(1 div 0) + (-1 div 0)', NaN],
            ["number('a') + 0", NaN],
            ["0 + number('a')", NaN],
        ].forEach(([expr, expected]) => {
            it(`should evaluate ${expr} as ${expected}`, () => {
                assertNumber(expr, expected);
            });
        });
    });

    describe('-', () => {
        it('without spacing works', () => {
            assertNumber('1-1', 0);
        });

        it('with spacing works', () => {
            assertNumber('1 - 1', 0);
        });

        it('with combo with/without spacing 1 works', () => {
            assertNumber('1 -1', 0);
        });

        it('with combo with/without spacing 2 works', () => {
            assertNumber('1- 1', 0);
        });

        it('with string without spacing BEFORE - fails', () => {
            const doc = initDoc('');
            const test = () => {
                doc.xEval(doc, null, "'asdf'- 'asdf'", XPathResult.NUMBER_TYPE);
            };
            assert.throw(test);
        });

        it('with string without spacing AFTER - fails ', () => {
            assertNumberValue("'asdf' -'asdf'", NaN);
        });

        it('with strings', () => {
            assertNumberValue("'asdf' - 'asdf'", NaN);
        });

        [
            ['1-1', 0],
            ['0 -1', -1],
            ['0-0', 0],
            ['0- -0', 0],
            ['-1-1', -2],
            ['-1 --1', 0],
            ['1.05-2.05', -0.9999999999999998],
            ['.5-.5-.3', -0.3],
            ['5- 4-1--1--4', 5],
            ["'1'-'1'", 0],
            ['.55  - 0.56', -0.010000000000000009],
            ['1.0-1.0', 0],
            ['true()  \n\r\t -true()', 0],
            ['false()-1', -1],
            ['(1 div 0) - 1', Number.POSITIVE_INFINITY],
            ['(-1 div 0) - 1', Number.NEGATIVE_INFINITY],
            ["number('a') - 0", NaN],
            ["0 - number('a')", NaN],
        ].forEach(([expr, expected]) => {
            it(`should evaluate ${expr} as ${expected}`, () => {
                assertNumberValue(expr, expected);
            });
        });
    });

    describe('mod', () => {
        it('without spacing works', () => {
            assertNumberValue('1mod1', 0);
        });

        it('without spacing AFTER mod works', () => {
            assertNumberValue('1 mod1', 0);
        });

        it('without spacing BEFORE mod works', () => {
            assertNumberValue('1mod 1', 0);
        });

        it('with numbers-as-string works', () => {
            assertNumberValue("'1'mod'1'", 0);
        });

        it('without spacing after mod and a string fails', () => {
            const doc = initDoc('');
            const test = () => {
                doc.xEval(doc, null, "'1' mod/html'", XPathResult.NUMBER_TYPE);
            };
            assert.throw(test);
        });

        it('without spacing before mod and a string works', () => {
            assertNumber("'1'mod '1'", 0);
        });

        [
            ['5 mod 2', 1],
            ['5 mod -2 ', 1],
            ['-5 mod 2', -1],
            [' -5 mod -2 ', -1],
            ['5 mod 1.5', 0.5],
            ['6.4 mod 2.1', 0.10000000000000009],
            ['5.3 mod 1.1', 0.8999999999999995],
            ['-0.4 mod .2', 0],
            ['1 mod -1', 0],
            ['0 mod 1', 0],
            ['10 mod (1 div 0)', 10],
            ['-10 mod (-1 div 0)', -10],
        ].forEach(([expr, expected]) => {
            it(`Should evaluate '${expr}} as '${expected}'`, () =>
                assertNumber(expr, expected));
        });

        ['0 mod 0', '1 mod 0', '(1 div 0) mod 1', '(-1 div 0) mod 1'].forEach(
            (expr) => {
                it(`should evaluate '${expr}' as NaN`, () =>
                    assertNumber(expr, NaN));
            }
        );
    });

    it('div without spacing', () => {
        assertNumberValue('1div1', 1);
    });

    it('div without spacing AFTER div', () => {
        assertNumberValue('1 div1', 1);
    });

    it('div without spacing BEFORE div', () => {
        assertNumberValue('1div 1', 1);
    });

    it('div without spacing and numbers-as-string', () => {
        assertNumberValue("'1'div'1'", 1);
    });

    it('div without spacing AFTER div and number-as-string', () => {
        assertNumberValue("'1' div'1'", 1);
    });

    it('div without spacing BEFORE div and number-as-string', () => {
        assertNumberValue("'1'div '1'", 1);
    });

    describe('div', () => {
        [
            ['1div 1', 1],
            ['0 div 1', 0],
            ['-1 div 1', -1],
            ['-1 div 1', -1],
            ['1.05 div 2.05', 0.5121951219512195],
            ['.5 div .5 div .3', 3.3333333333333335],
            ['5 div 4 div 1 div -1 div -4', 0.3125],
            ["'1' div '1'", 1],
            ['.55 div 0.56', 0.9821428571428571],
            ['1.0 div 1.0', 1],
            ['true() div true()', 1],
            ['false() div 1', 0],
            ['1 div 0', Number.POSITIVE_INFINITY],
            ['-1 div 0', Number.NEGATIVE_INFINITY],
        ].forEach(([expr, expected]) => {
            it(`should evaluate '${expr}' as '${expected}'`, () =>
                assertNumberValue(expr, expected));
        });

        [['0 div 0'], ['0 div -0'], ["number('a') div 0"]].forEach((t) => {
            assertNumberValue(t[0], NaN);
        });
    });

    it('* works as expected', () => {
        [
            ['1*1', 1],
            ['9 * 2', 18],
            ['9 * -1', -9],
            ['-10 *-11', 110],
            ['-1 * 1', -1],
            ['0*0', 0],
            ['0*1', 0],
            ['-1*0', 0],
            ['-15.*1.5', -22.5],
            ['1.5 * 3', 4.5],
            ['(1 div 0) * 1', Number.POSITIVE_INFINITY],
            ['(-1 div 0) * -1', Number.POSITIVE_INFINITY],
            ['(1 div 0) * -1', Number.NEGATIVE_INFINITY],
        ].forEach((t) => {
            assertNumber(t[0], t[1]);
        });

        [["number('a') * 0"]].forEach((t) => {
            assertNumber(t[0], NaN);
        });
    });

    describe('*,+,-,mod,div precedence rules are applied correctly', () => {
        [
            ['1+2*3', 7],
            ['2*3+1', 7],
            ['1-10 mod 3 div 3', 0.6666666666666667],
            ['4-3*4+5-1', -4],
            ['(4-3)*4+5-1', 8],
            ['8 div 2 + 4', 8],
        ].forEach(([expr, expected]) => {
            it(`should evaluated '${expr}' as '${expected}'`, () =>
                assertNumber(expr, expected));
        });
    });

    it('works with different return type', () => {
        assertBoolean('1 + 1', true);
        assertBoolean('0 + 1', true);
        assertBoolean('0 + 0', false);
    });

    describe('with nodesets', () => {
        let doc;

        beforeEach(() => {
            doc = initDoc(`
        <data>
          <p>1</p>
          <p>2</p>
          <p>3</p>
          <p>4</p>
        </data>`);
        });

        [
            ['/data/p[1] + /data/p[2]', 3],
            ['/data/p[1]+ /data/p[2]', 3],
            ['/data/p[1] +/data/p[2]', 3],
            ['/data/p[1]+/data/p[2]', 3],
            ['/data/p[4] - /data/p[2]', 2],
            ['/data/p[4]- /data/p[2]', 2],
            ['/data/p[4] -/data/p[2]', 2],
            ['/data/p[4]-/data/p[2]', 2],
            ['/data/p[2] * /data/p[3]', 6],
            ['/data/p[2]* /data/p[3]', 6],
            ['/data/p[2] */data/p[3]', 6],
            ['/data/p[2]*/data/p[3]', 6],
        ].forEach(([expr, value]) => {
            it(`should evaluate ${expr} as ${value}`, () => {
                // given
                const node = doc.getElementById('testFunctionNodeset2');

                // expect
                assertNumberValue(node, null, expr, value);
            });
        });
    });
});

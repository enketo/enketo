const _ = require('lodash');

const {assertBoolean, assertString, assertNumberValue, initDoc} = require('./helpers');

describe('infix operators', () => {
  describe('math operators', () => {
    describe('with numbers', () => {
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
      }, (expected, expr) => {
        it('should evaluate "' + expr + '" as ' + expected, () => {
          assertString(expr, expected);
        });

        const spaceless = expr.replace(/\s/g, '');
        it('should evaluate "' + spaceless + '" as ' + expected, () => {
          assertString(spaceless, expected);
        });
      });
    });
  });
  describe('boolean operators', () => {
    describe('with numbers', () => {
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
      }, (expectedBoolean, expr) => {
        it('should evaluate "' + expr + '" as ' + expectedBoolean.toString().toUpperCase(), () => {
          assertBoolean(expr, expectedBoolean);
        });
      });
    });
    describe('with strings', () => {
      _.forEach({
        '"1" = "1"' : true,
        '"1" = "2"' : false,
        '"1" != "1"' : false,
        '"1" != "2"' : true,
        // > When neither object to be compared is a node-set and the operator
        // > is <=, <, >= or >, then the objects are compared by converting both
        // > objects to numbers and comparing the numbers according to IEEE 754.
        //   - https://www.w3.org/TR/1999/REC-xpath-19991116/#booleans
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
        '"aardvark" < "aligator"' : false,
        '"aardvark" <= "aligator"' : false,
        '"aligator" < "aardvark"' : false,
        '"aligator" <= "aardvark"' : false,
        '"possum" > "aligator"' : false,
        '"possum" >= "aligator"' : false,
        '"aligator" > "possum"' : false,
        '"aligator" >= "possum"' : false,
      }, (expectedBoolean, expr) => {
        it('should evaluate "' + expr + '" as ' + expectedBoolean.toString().toUpperCase(), () => {
          assertBoolean(expr, expectedBoolean);
        });
      });
    });
    describe('with booleans', () => {
      _.forEach({
        'true() and true()': true,
        'false() and true()': false,
        'true() and false()': false,
        'false() and false()': false,
        'true() or true()': true,
        'false() or true()': true,
        'true() or false()': true,
        'false() or false()': false,
      }, (expectedBoolean, expr) => {
        it('should evaluate "' + expr + '" as ' + expectedBoolean.toString().toUpperCase(), () => {
          assertBoolean(expr, expectedBoolean);
        });
      });
    });
  });

  describe('with nodes', () =>{
    const doc = initDoc(`
    <data>
      <a>1</a>
      <b>2</b>
    </data>`);

    _.forEach({
      '/data/a!= /data/b': true,
      '/data/a!=/data/b': true,
      '/data/a!= "1"': false,
      '/data/a!="1"': false,
      '"1" != /data/a': false,
      '"1"!= /data/a': false,
      '"1"!=/data/a': false,

      '/data/a<= /data/b': true,
      '/data/a<=/data/b': true,
      '/data/a<= "1"': true,
      '/data/a<="1"': true,
      '"1" <= /data/a': true,
      '"1"<= /data/a': true,
      '"1"<=/data/a': true,

      '/data/a>= /data/b': false,
      '/data/a>=/data/b': false,
      '/data/a>= "1"': true,
      '/data/a>="1"': true,
      '"1" >= /data/a': true,
      '"1">= /data/a': true,
      '"1">=/data/a': true,
    }, (expectedBoolean, expr) => {
      it('should evaluate "' + expr + '" as ' + expectedBoolean.toString().toUpperCase(), () => {
        assertBoolean(doc, null, expr, expectedBoolean);
      });
    });
  });

  describe('number operations', () => {
    it( '*,+,-,mod,div precedence rules are applied correctly', () => {
      [
          [ "1+2*3", 7 ],
          [ "2*3+1", 7 ],
          [ "1-10 mod 3 div 3", 0.6666666666666667 ],
          [ "4-3*4+5-1", -4 ],
          [ "(4-3)*4+5-1", 8 ],
          [ "8 div 2 + 4", 8 ]
      ].forEach(([expr, expected]) => {
          assertNumberValue(expr, expected);
      });

      assertNumberValue('1-1', 0);
      assertNumberValue('1 - 1', 0);
    });

    describe('node-based calculatations with strings', () => {
      let doc;

      beforeEach(() => {
        doc = initDoc(`<data><number id="num">4</number></data>`);
      });

      it('should support simple addition', () => {
        // It doesn't matter whether a string or number is requested, an infix operator should ensure that both
        // left and right operands are converted to numbers during evaluation.
        // If multiple nodes are returned, the value of the first node will be used.
        assertString('/data/number + 1', '5');
      });

      it('should support addition without spaces around the operator', () => {
        // expect
        assertString('/data/number+1', '5');
      });

      it('should support relative nodesets with strings', () => {
        // expect
        assertString(doc.getElementById('num'), null, '../number + 1', '5');
      });

      it('should support relative nodesets with strings without spaces around the operator', () => {
        // expect
        assertString(doc.getElementById('num'), null, '../number+1', '5');
      });
    });

    it('calculation with multiple nodes operand returned as string', () => {
      initDoc(`
      <data>
        <number>4</number>
        <number>10</number>
      </data>`);

      // It doesn't matter whether a string or number is requested, an infix operator should ensure that both 
      // left and right operands are converted to numbers during evaluation.
      // If multiple nodes are returned, the value of the first node will be used.
      assertString('/data/number + 1', '5');
    });
  });
});

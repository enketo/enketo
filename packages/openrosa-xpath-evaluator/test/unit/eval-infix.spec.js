const { assert } = require('chai');
const { encodeOp, wrapVal } = require('./utils');

const evalInfix = require('../../src/utils/operation').handleOperation;

describe('evalInfix()', () => {
    describe('booleans', () => {
        /* see https://www.w3.org/TR/1999/REC-xpath-19991116/#booleans */

        describe('OrExpr', () => {
            /*
             * An or expression is evaluated by evaluating each operand and converting
             * its value to a boolean as if by a call to the boolean function. The
             * result is true if either value is true and false otherwise. The right
             * operand is not evaluated if the left operand evaluates to true.
             */

            singleOpTestsFor(
                '|',
                //  lhs,   rhs, expected
                [false, false, false],
                [false, true, true],
                [true, false, true],
                [true, true, true],

                [0, false, false],
                [false, 0, false],
                [1, false, true],
                [false, 1, true],

                ['', false, false],
                [false, '', false],
                ['a', false, true],
                [false, 'a', true],

                [[], false, false],
                [false, [], false],
                [[''], false, true],
                [false, [''], true]
            );
        });

        describe('AndExpr', () => {
            /**
             * An and expression is evaluated by evaluating each operand and converting
             * its value to a boolean as if by a call to the boolean function. The
             * result is true if both values are true and false otherwise. The right
             * operand is not evaluated if the left operand evaluates to false.
             */

            singleOpTestsFor(
                '&',
                //  lhs,   rhs, expected
                [false, false, false],
                [false, true, false],
                [true, false, false],
                [true, true, true],

                [0, false, false],
                [false, 0, false],
                [1, false, false],
                [false, 1, false],
                [true, 1, true],
                [1, true, true],
                [1, 1, true],

                ['', false, false],
                [false, '', false],
                ['a', false, false],
                [false, 'a', false],
                [false, 'a', false],
                [true, 'a', true],
                ['a', true, true],
                ['a', 'a', true],

                [[], false, false],
                [false, [], false],
                [[''], false, false],
                [false, [''], false],
                [false, [''], false],
                [true, [''], true],
                [[''], true, true],
                [[''], [''], true]
            );
        });

        describe('RelationalExpr', () => {
            /**
             * An EqualityExpr (that is not just a RelationalExpr) or a RelationalExpr
             * (that is not just an AdditiveExpr) is evaluated by comparing the
             * objects that result from evaluating the two operands. Comparison of the
             * resulting objects is defined in the following three paragraphs. First,
             * comparisons that involve node-sets are defined in terms of comparisons
             * that do not involve node-sets; this is defined uniformly for =, !=, <=,
             * <, >= and >. Second, comparisons that do not involve node-sets are
             * defined for = and !=. Third, comparisons that do not involve node-sets
             * are defined for <=, <, >= and >.
             */

            const SIMPLE_EQUALITY = [
                // lhs, rhs, expected

                // boolean vs boolean
                [false, false, true],
                [false, true, false],
                [true, false, false],
                [true, true, true],

                // boolean vs number (converts to boolean)
                [0, false, true],
                [false, 0, true],
                [1, false, false],
                [false, 1, false],
                [true, 1, true],
                [1, true, true],

                // boolean vs string (converts to boolean)
                ['', false, true],
                [false, '', true],
                ['a', false, false],
                [false, 'a', false],
                [false, 'a', false],
                [true, 'a', true],
                ['a', true, true],
                ['a', 'a', true],

                // number vs number
                [0, 0, true],
                [1, 0, false],
                [0, 1, false],

                // number vs string (converts to number)
                [0, '0', true],
                [1, '0', false],
                [0, '1', false],
                ['0', 0, true],
                ['1', 0, false],
                ['0', 1, false],

                // string vs string
                ['a', 'a', true],
                ['b', 'a', false],
                ['a', 'b', false],
                ['a', 'a', true],
                ['b', 'a', false],
                ['a', 'b', false],
            ];

            singleOpTestsFor('=', ...SIMPLE_EQUALITY);
            singleOpTestsFor(
                '!=',
                ...SIMPLE_EQUALITY.map(([lhs, rhs, areEqual]) => [
                    lhs,
                    rhs,
                    !areEqual,
                ])
            );

            specifiedOpTestsFor(
                // If both objects to be compared are node-sets, then the comparison
                // will be true if and only if there is a node in the first node-set and
                // a node in the second node-set such that the result of performing the
                // comparison on the string-values of the two nodes is true.
                // N.B. UNLIKE SIMPLE_EQUALITY ABOVE, IN THESE CASES THE NOT-EQUALS
                // OPERATOR IS NOT THE DIRECT INVERSE OF THE EQUALS OPERATOR

                //  lhs, op, rhs, expected
                [[], '=', [], false],
                [[], '!=', [], false],

                [['a'], '=', ['b'], false],
                [['a'], '!=', ['b'], true],

                [['a'], '=', ['b', 'a'], true],
                [['a'], '!=', ['b', 'a'], true],

                [['a', 'b'], '=', ['b'], true],
                [['a', 'b'], '!=', ['b'], true],

                // If one object to be compared is a node-set and the other is a number,
                // then the comparison will be true if and only if there is a node in
                // the node-set such that the result of performing the comparison on the
                // number to be compared and on the result of converting the
                // string-value of that node to a number using the number function is true.
                [1, '=', [], false],
                [1, '!=', [], false],

                [1, '=', ['1'], true],
                [1, '!=', ['1'], false],

                [1, '=', ['1', '2'], true],
                [1, '!=', ['1', '2'], true],

                [[], '=', 1, false],
                [[], '!=', 1, false],

                [['1'], '=', 1, true],
                [['1'], '!=', 1, false],

                [['1', '2'], '=', 1, true],
                [['1', '2'], '!=', 1, true],

                // If one object to be compared is a node-set and the other is a string,
                // then the comparison will be true if and only if there is a node in
                // the node-set such that the result of performing the comparison on the
                // string-value of the node and the other string is true.
                ['a', '=', [], false],
                ['a', '!=', [], false],

                ['a', '=', ['a'], true],
                ['a', '!=', ['a'], false],

                ['a', '=', ['a', 'b'], true],
                ['a', '!=', ['a', 'b'], true],

                [[], '=', 'a', false],
                [[], '!=', 'a', false],

                [['a'], '=', 'a', true],
                [['a'], '!=', 'a', false],

                [['a', 'b'], '=', 'a', true],
                [['a', 'b'], '!=', 'a', true],

                // If one object to be compared is a node-set and the other is a boolean,
                // then the comparison will be true if and only if the result of performing
                // the comparison on the boolean and on the result of converting the
                // node-set to a boolean using the boolean function is true.
                // N.B. THIS BEHAVIOUR IS DIFFERENT TO THAT WHEN COMPARING NODESETS TO
                // NUMBERS OR STRINGS
                [false, '=', [], true],
                [false, '!=', [], false],
                [true, '=', [], false],
                [true, '!=', [], true],

                [false, '=', [''], false],
                [false, '!=', [''], true],
                [true, '=', [''], true],
                [true, '!=', [''], false],

                [[], '=', false, true],
                [[], '!=', false, false],
                [[], '=', true, false],
                [[], '!=', true, true],

                [[''], '=', false, false],
                [[''], '!=', false, true],
                [[''], '=', true, true],
                [[''], '!=', true, false]
            );

            // When neither object to be compared is a node-set and the operator is <=,
            // <, >= or >, then the objects are compared by converting both objects to
            // numbers and comparing the numbers according to IEEE 754. The < comparison
            // will be true if and only if the first number is less than the second
            // number. The <= comparison will be true if and only if the first number
            // is less than or equal to the second number. The > comparison will be
            // true if and only if the first number is greater than the second number.
            // The >= comparison will be true if and only if the first number is
            // greater than or equal to the second number.
            singleOpTestsFor(
                '<',
                // TODO
                // lhs, rhs, expected

                // boolean vs boolean
                [false, false, false],
                [false, true, true],
                [true, false, false],
                [true, true, false],

                // number vs boolean
                [false, 1, true],
                [false, 0, false],
                [true, 0, false],
                [true, 1, false],
                [1, false, false],
                [0, false, false],
                [0, true, true],
                [1, true, false],

                // number vs number
                [0, 1, true],
                [0, 0, false],
                [1, 0, false],
                [1, 1, false],

                // number vs nodeset
                [0, [], false],
                [-1, [1, 2, 3], true],
                [0, [1, 2, 3], true],
                [2, [1, 2, 3], true],
                [5, [1, 2, 3], false],
                [[], 0, false],
                [[1, 2, 3], -1, false],
                [[1, 2, 3], 0, false],
                [[1, 2, 3], 2, true],
                [[1, 2, 3], 5, true]
            );

            singleOpTestsFor(
                '>=',
                // lhs, rhs, expected

                // boolean vs boolean
                [false, false, true],
                [false, true, false],
                [true, false, true],
                [true, true, true],

                // number vs boolean
                [false, 1, false],
                [false, 0, true],
                [true, 0, true],
                [true, 1, true],
                [1, false, true],
                [0, false, true],
                [0, true, false],
                [1, true, true],

                // number vs number
                [0, 1, false],
                [0, 0, true],
                [1, 0, true],
                [1, 1, true],
                [0, -1, true],
                [0, -0, true],
                [-1, 0, false],
                [-1, 1, false],

                // number vs nodeset
                [0, [], false],
                [-1, [1, 2, 3], false],
                [0, [1, 2, 3], false],
                [2, [1, 2, 3], true],
                [5, [1, 2, 3], true],
                [[], 0, false],
                [[1, 2, 3], -1, true],
                [[1, 2, 3], 0, true],
                [[1, 2, 3], 2, true],
                [[1, 2, 3], 5, false]
            );
        });
    });

    // see https://www.w3.org/TR/1999/REC-xpath-19991116/#numbers
    describe('numbers', () => {
        singleOpTestsFor('+', [1, 1, 2]);
        singleOpTestsFor('-', [2, 1, 1]);
        singleOpTestsFor('*', [2, 3, 6]);
        singleOpTestsFor('%', [4, 3, 1]);
        singleOpTestsFor('/', [8, 4, 2]);
    });
});

function specifiedOpTestsFor(...testCases) {
    testCases.forEach(([lhs, op, rhs, expected]) =>
        testCaseFor(lhs, op, rhs, expected)
    );
}

function singleOpTestsFor(op, ...testCases) {
    describe(op, () =>
        testCases.forEach(([lhs, rhs, expected]) =>
            testCaseFor(lhs, op, rhs, expected)
        )
    );
}

function testCaseFor(lhs, op, rhs, expected) {
    it(`should evaluate "${JSON.stringify(lhs)} ${op} ${JSON.stringify(
        rhs
    )}" as ${expected}`, () => {
        // when
        const res = evalInfix(wrapVal(lhs), encodeOp(op), wrapVal(rhs));

        // then
        assert.equal(res, expected);
    });
}

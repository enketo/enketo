const { initDoc, assertBoolean } = require('../../helpers');

const assertOps1 = (...args) => {
  const expected = args[args.length-1];
  const val2 = args[args.length-2];
  const val1 = args[args.length-3];
  const node = args.length > 3 ? args[args.length-4] : null;
  ['=', '!='].map((op, idx) => {
    const expr = `${val1} ${op} ${val2}`;
    if(node) {
      assertBoolean(node, null, expr, expected[idx]);
    } else {
      assertBoolean(expr, expected[idx]);
    }
  });
};

const assertOps2 = (...args) => {
  const expected = args[args.length-1];
  const val2 = args[args.length-2];
  const val1 = args[args.length-3];
  const node = args.length > 3 ? args[args.length-4] : null;
  ['<', '<=', '>', '>=' ].map((op, idx) => {
    const expr = `${val1} ${op} ${val2}`;
    if(node) {
      assertBoolean(node, null, expr, expected[idx]);
    } else {
      assertBoolean(expr, expected[idx]);
    }
  });
};


describe('Comparison operator', () => {

  it('correctly evaluates = and !=', () => {
    assertOps1(1, 1, [true, false]);
    assertOps1(1, 0, [false, true]);
    assertOps1(1, '1', [true, false]);
    assertOps1(1, '0', [false, true]);
    assertOps1(1, 'true()', [true, false]);
    assertOps1(1, 'false()', [false, true]);
    assertOps1(0, 'false()', [true, false]);
    assertOps1('true()', 'true()', [true, false]);
    assertOps1('false()', 'false()', [true, false]);
    assertOps1('true()', 1, [true, false]);
    assertOps1('true()', '""', [false, true]);
    // assertOps1('false()', 0, [false, true]);
    assertOps1('false()', '""', [true, false]);
    assertOps1('"1a"', '"1a"', [true, false]);
    assertOps1('"1"', '"0"', [false, true]);
    assertOps1('""', '""', [true, false]);
    assertOps1('""', '"0"', [false, true]);
  });

  it('correctly evaluates <, <=, > and >=', () => {
    assertOps2("1", "2", [true, true, false, false]);
    assertOps2("1", "1", [false, true, false, true ]);
    assertOps2("1", "0", [false, false, true, true ]);
    assertOps2("1", "'2'", [true, true, false, false ]);
    assertOps2("1", "'1'", [false, true, false, true ]);
    assertOps2("1", "'0'", [false, false, true, true ]);
    assertOps2("2", "true()", [false, false, true, true]);
    assertOps2("1", "true()", [false, true, false, true]);
    assertOps2("1", "false()", [false, false, true, true]);
    assertOps2("0", "false()", [false, true, false, true]);
    assertOps2("0", "true()", [true, true, false, false]);
    assertOps2("true()", "2", [true, true, false, false]);
    assertOps2("true()", "1", [false, true, false, true]);
    assertOps2("false()", "1", [true, true, false, false]);
    assertOps2("false()", "0", [false, true, false, true]);
    assertOps2("true()", "0", [false, false, true, true]);
    assertOps2("true()", "true()", [false, true, false, true]);
    assertOps2("true()", "false()", [false, false, true, true]);
    assertOps2("false()", "false()", [false, true, false, true]);
    assertOps2("false()", "true()", [true, true, false, false]);
    assertOps2("true()", "'1'", [false, true, false, true]);
    assertOps2("true()", "''", [false, false, false, false]);
    assertOps2("false()", "'0'", [false, true, false, true]);
    assertOps2("false()", "''", [false, false, false, false]);
    assertOps2("'2'", "1", [false, false, true, true]);
    assertOps2("'1'", "1", [false, true, false, true]);
    assertOps2("'0'", "1", [true, true, false, false]);
    assertOps2("'1'", "true()", [false, true, false, true]);
    assertOps2("''", "true()", [false, false, false, false]);
    assertOps2("'0'", "false()", [false, true, false, true]);
    assertOps2("''", "false()", [false, false, false, false]);
    // assertOps2("'1a'", "'1a'", [false, false, false, false]);
    assertOps2("'1'", "'0'", [false, false, true, true]);
    // assertOps2("''", "''", [false, false, false, false]);
    // assertOps2("''", "'0'", [false, false, false, false]);
  });

  describe('with nodes', () => {
    let doc;
    beforeEach(() => {
      doc = initDoc(`
        <div id="ComparisonOperatorCase">
          <div id="ComparisonOperatorCaseNodesetNegative5to5">
            <div>-5</div>
            <div>-4</div>
            <div>-3</div>
            <div>-2</div>
            <div>-1</div>
            <div>0</div>
            <div>1</div>
            <div>2</div>
            <div>3</div>
            <div>4</div>
            <div>5</div>
          </div>
          <div id="ComparisonOperatorCaseNodesetEmpty">
          </div>
          <div id="ComparisonOperatorCaseNodesetStrings">
            <div>aaa</div>
            <div>bbb</div>
            <div>cccccc</div>
            <div>ddd</div>
            <div>eee</div>
          </div>
        </div>`);
    });

    it('compare =, != with nodes', () => {
      // assertOps1(doc,
      //   "id('ComparisonOperatorCaseNodesetNegative5to5')/*",
      //   "id('ComparisonOperatorCaseNodesetEmpty')/*", [false, false]);
      // assertOps1(doc,
      //   "id('ComparisonOperatorCaseNodesetNegative5to5')/*",
      //   "id('ComparisonOperatorCaseNodeset4to8')/*", [true, true]);
      // assertOps1(doc,
      //   "id('ComparisonOperatorCaseNodesetNegative5to5')/*",
      //   "id('ComparisonOperatorCaseNodeset6to10')/*", [false, true ]);

      let node = doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5');
      assertOps1(node, "-10", "*", [false, true]);
      assertOps1(node, "4", "*", [true, true]);
      assertOps1(node, "4.3", "*", [false, true]);
      assertOps1("true()", "*", [true, false]);
      assertOps1("false()", "*", [false, true]);

      node = doc.getElementById('ComparisonOperatorCaseNodesetEmpty');
      assertOps1(node, "0", "*", [false, false]);
      // assertOps1(node, "true()", "*"], [false, true]);
      // assertOps1(node, "false()", "*"], [true, false]);
      // assertOps1(node, "''", "*", [false, false]);

      node = doc.getElementById('ComparisonOperatorCaseNodesetStrings');
      assertOps1(node, "'aaa'", "*", [true, true]);
      assertOps1(node, "'bb'", "*", [false, true]);
      assertOps1(node, "''", "*", [false, true ]);
    });

    it('compare > < >= <= with nodes', () => {
      // assertOps2(doc,
      //   "id('ComparisonOperatorCaseNodesetNegative5to5')/*",
      //   "id('ComparisonOperatorCaseNodesetEmpty')/*",
      //   [false, false, false, false]);
      // assertOps2(doc,
      //   "id('ComparisonOperatorCaseNodesetNegative5to5')/*",
      //   "id('ComparisonOperatorCaseNodeset4to8')/*",
      //   [true, true, true, true]);
      // assertOps2(doc,
      //   "id('ComparisonOperatorCaseNodesetNegative5to5')/*",
      //   "id('ComparisonOperatorCaseNodeset6to10')/*",
      //   [true, true, false, false]);

      let node = doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5');
      assertOps2(node, "-10", "*", [true, true, false, false]);
      assertOps2(node, "10", "*", [false, false, true, true]);
      assertOps2(node, "5", "*", [false, true, true, true]);
      assertOps2(node, "2", "*", [true, true, true, true]);
      assertOps2(node, "true()", "*", [false, true, false, true]);
      assertOps2(node, "false()", "*", [true, true, false, false]);
      assertOps2(node, "'4'", "*", [true, true, true, true]);
      assertOps2(node, "*", "-10", [false, false, true, true]);
      assertOps2(node, "*", "10", [true, true, false, false]);
      assertOps2(node, "*", "5", [true, true, false, true]);
      assertOps2(node, "*", "2", [true, true, true, true]);
      assertOps2(node, "*", "true()", [false, true, false, true]);
      assertOps2(node, "*", "false()", [false, false, true, true]);
      assertOps2(node, "*", "'4'", [true, true, true, true]);

      node = doc.getElementById('ComparisonOperatorCaseNodesetStrings');
      assertOps2(node, "*", "'aaa'", [false, false, false, false]);
      assertOps2(node, "'aaa'", "*", [false, false, false, false]);

      node = doc.getElementById('ComparisonOperatorCaseNodesetEmpty');
      assertOps2(node, "0", "*", [false, false, false, false]);
      assertOps2(node, "true()", "*", [false, false, true, true]);
      assertOps2(node, "false()", "*", [false, true, false, true]);
      assertOps2(node, "''", "*", [false, false, false, false]);
      assertOps2(node, "*", "0", [false, false, false, false]);
      assertOps2(node, "*", "true()", [true, true, false, false]);
      assertOps2(node, "*", "false()", [false, true, false, true]);
      assertOps2(node, "*", "''", [false, false, false, false]);
    });
  });

});

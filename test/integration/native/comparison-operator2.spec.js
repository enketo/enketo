const { initDoc, assertBoolean } = require('../../helpers');

describe('Comparison operator', () => {
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

        <div id="ComparisonOperatorCaseNodeset6to10">
          <div>6</div>
          <div>7</div>
          <div>8</div>
          <div>9</div>
          <div>10</div>
        </div>

        <div id="ComparisonOperatorCaseNodeset4to8">
          <div>4</div>
          <div>5</div>
          <div>6</div>
          <div>7</div>
          <div>8</div>
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
      </div>
      `);
  });

  it('correctly evaluates = and !=', () => {
    let input;
    let i;
    let expr;
    let j;
    let k;
    const ops = [ '=', '!=' ];

    input = [
        [[ "1", "1" ], [ true, false ], doc],
        [[ "1", "0" ], [ false, true ], doc],
        [[ "1", "'1'" ], [ true, false ], doc],
        [[ "1", "'0'" ], [ false, true ], doc],
        [[ "1", "true()" ], [ true, false ], doc],
        [[ "1", "false()" ], [ false, true ], doc],
        [[ "0", "false()" ], [ true, false ], doc],
        [[ "-10", "*" ], [ false, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
        [[ "4", "*" ], [ true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
        [[ "4.3", "*" ],[ false, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
        [[ "0", "*" ], [ false, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
        [[ "true()", "true()" ], [ true, false ], doc],
        [[ "false()", "false()" ], [ true, false ], doc],
        [[ "true()", "false()" ], [ false, true ], doc],
        [[ "true()", "'1'" ], [ true, false ], doc],
        [[ "true()", "''" ], [ false, true ], doc],
        [[ "false()", "'0'" ], [ false, true ], doc],
        [[ "false()", "''" ], [ true, false ], doc],
        [[ "true()", "*" ], [ true, false ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
        [[ "false()", "*" ], [ false, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
        [[ "true()", "*" ], [ false, true ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
        [[ "false()", "*" ], [ true, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
        [[ "'1a'", "'1a'" ], [ true, false ], doc],
        [[ "'1'", "'0'" ], [ false, true ], doc],
        [[ "''", "''" ], [ true, false ], doc],
        [[ "''", "'0'" ], [ false, true ], doc],
        [[ "'aaa'", "*" ], [ true, true ], doc.getElementById('ComparisonOperatorCaseNodesetStrings' )],
        [[ "'bb'", "*" ], [ false, true ], doc.getElementById('ComparisonOperatorCaseNodesetStrings' )],
        [[ "''", "*" ], [ false, true ], doc.getElementById('ComparisonOperatorCaseNodesetStrings' )],
        [[ "''", "*" ], [ false, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
        // [[ "id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodesetEmpty')/*" ], [ false, false ], doc],
        // [[ "id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset4to8')/*" ], [ true, true ], doc],
        // [[ "id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset6to10')/*" ], [ false, true ], doc]
    ];

    for (k = 0; k < ops.length; k++ ) { // different operators
      for (j = 0; j < 2; j++ ) { // switch parameter order
        for (i = 0; i < input.length; i++ ) { // all cases
          expr = `${input[i][0][j % 2]} ${ops[k]} ${input[i][0][(j + 1) % 2]}`;
          assertBoolean(input[i][2], null, expr, input[i][1][k]);
        }
      }
    }
  });

  it('correctly evaluates <, <=, > and >=', () => {
    let input;
    let i;
    let expr;
    let k;
    const ops = [ '<', '<=', '>', '>=' ];

    input = [
      [[ "1", "2" ], [ true, true, false, false ], doc],
      [[ "1", "1" ], [ false, true, false, true ], doc],
      [[ "1", "0" ], [ false, false, true, true ], doc],
      [[ "1", "'2'" ], [ true, true, false, false ], doc],
      [[ "1", "'1'" ], [ false, true, false, true ], doc],
      [[ "1", "'0'" ], [ false, false, true, true ], doc],
      [[ "2", "true()" ], [ false, false, true, true ], doc],
      [[ "1", "true()" ], [ false, true, false, true ], doc],
      [[ "1", "false()" ], [ false, false, true, true ], doc],
      [[ "0", "false()" ], [ false, true, false, true ], doc],
      [[ "0", "true()" ], [ true, true, false, false ], doc],
      [[ "true()", "2" ], [ true, true, false, false ], doc],
      [[ "true()", "1" ], [ false, true, false, true ], doc],
      [[ "false()", "1" ], [ true, true, false, false ], doc],
      [[ "false()", "0" ], [ false, true, false, true ], doc],
      [[ "true()", "0" ], [ false, false, true, true ], doc],
      [[ "true()", "true()" ], [ false, true, false, true ], doc],
      [[ "true()", "false()" ], [ false, false, true, true ], doc],
      [[ "false()", "false()" ], [ false, true, false, true ], doc],
      [[ "false()", "true()" ], [ true, true, false, false ], doc],
      [[ "true()", "'1'" ], [ false, true, false, true ], doc],
      [[ "true()", "''" ], [ false, false, false, false ], doc],
      [[ "false()", "'0'" ], [ false, true, false, true ], doc],
      [[ "false()", "''" ], [ false, false, false, false ], doc],
      [[ "'2'", "1" ], [ false, false, true, true ], doc],
      [[ "'1'", "1" ], [ false, true, false, true ], doc],
      [[ "'0'", "1" ], [ true, true, false, false ], doc],
      [[ "'1'", "true()" ], [ false, true, false, true ], doc],
      [[ "''", "true()" ], [ false, false, false, false ], doc],
      [[ "'0'", "false()" ], [ false, true, false, true ], doc],
      [[ "''", "false()" ], [ false, false, false, false ], doc],
      // [[ "'1a'", "'1a'" ],[ false, false, false, false ], doc],
      [[ "'1'", "'0'" ], [ false, false, true, true ], doc],
      // [[ "''", "''" ], [ false, false, false, false ], doc],
      // [[ "''", "'0'" ], [ false, false, false, false ], doc],
    ];

    for(k = 0; k < ops.length; k++) { // different operators
      for(i = 0; i < input.length; i++) { // all cases
        expr = `${input[i][0][0]} ${ops[k]} ${input[i][0][1]}`;
        assertBoolean(input[i][2], null, expr, input[i][1][k]);
      }
    }
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

          <div id="ComparisonOperatorCaseNodeset6to10">
            <div>6</div>
            <div>7</div>
            <div>8</div>
            <div>9</div>
            <div>10</div>
          </div>

          <div id="ComparisonOperatorCaseNodeset4to8">
            <div>4</div>
            <div>5</div>
            <div>6</div>
            <div>7</div>
            <div>8</div>
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
        </div>
      `);
    });

    it('', () => {
      const input = [
      [[ "true()", "*" ], [ false, true, false, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "false()", "*" ], [ true, true, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "*", "true()" ], [ false, true, false, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "*", "false()" ], [ false, false, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "0", "*" ], [ false, false, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "*", "0" ], [ false, false, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "true()", "*" ], [ false, false, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "false()", "*" ], [ false, true, false, true ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "*", "true()" ], [ true, true, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "*", "false()" ], [ false, true, false, true ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "-10", "*" ], [ true, true, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "10", "*" ], [ false, false, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "5", "*" ], [ false, true, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "2", "*" ], [ true, true, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "'4'", "*" ], [ true, true, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "'aaa'", "*" ], [ false, false, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetStrings' )],
      [[ "''", "*" ], [ false, false, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "*", "-10" ], [ false, false, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "*", "10" ], [ true, true, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "*", "5" ], [ true, true, false, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "*", "2" ], [ true, true, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "*", "'4'" ], [ true, true, true, true ], doc.getElementById('ComparisonOperatorCaseNodesetNegative5to5' )],
      [[ "*", "'aaa'" ], [ false, false, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetStrings' )],
      [[ "*", "''" ], [ false, false, false, false ], doc.getElementById('ComparisonOperatorCaseNodesetEmpty' )],
      [[ "id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodesetEmpty')/*" ], [ false, false, false, false ], doc],
      [[ "id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset4to8')/*" ], [ true, true, true, true ], doc],
      [[ "id('ComparisonOperatorCaseNodesetNegative5to5')/*", "id('ComparisonOperatorCaseNodeset6to10')/*" ], [ true, true, false, false ], doc]
      ];
      const ops = [ '<', '<=', '>', '>=' ];
      let i, k;
      for(k = 0; k < ops.length; k++) { // different operators
        for(i = 0; i < input.length; i++) { // all cases
          const expr = `${input[i][0][0]} ${ops[k]} ${input[i][0][1]}`;
          assertBoolean(input[i][2], null, expr, input[i][1][k]);
        }
      }
    });

  });
});

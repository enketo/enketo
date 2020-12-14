const { initDoc, assertStringValue } = require('../../helpers');

describe('#format-date()', () => {

  it('format-date()', () => {
    const doc = initDoc(`
      <div id="FunctionDate">
        <div id="FunctionDateCase1">2012-07-23</div>
        <div id="FunctionDateCase2">2012-08-20T00:00:00.00+00:00</div>
        <div id="FunctionDateCase3">2012-08-08T00:00:00+00:00</div>
        <div id="FunctionDateCase4">2012-06-23</div>
        <div id="FunctionDateCase5">2012-08-08T06:07:08.123-07:00</div>
      </div>`);
    const date = new Date();
    [
      ['format-date(.,  "%Y/%n | %y/%m | %b" )', doc.getElementById('FunctionDateCase1'), '2012/7 | 12/07 | Jul'],
      ['format-date(., "%Y/%n | %y/%m | %b" )', doc.getElementById('FunctionDateCase2'), '2012/8 | 12/08 | Aug'],
      ['format-date(., "%M | %S | %3")', doc.getElementById('FunctionDateCase2'), '00 | 00 | 000'],
      [`format-date('${date.toString()}', '%e | %a' )`, doc,
          `${date.getDate()} | ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}`
      ],
      ['format-date("not a date", "%M")', doc, 'Invalid Date' ],
      ['format-date("Mon, 02 Jul 2012 00:00:00 GMT", )', doc, '']
      // the test below probably only works in the GMT -6 timezone...
      // [ 'format-date(., '%Y | %y | %m | %n | %b | %d | %e | %H | %h | %M | %S | %3 | %a')", doc.getElementById("FunctionDateCase5"),
      //     '2012 | 12 | 08 | 8 | Aug | 08 | 8 | 06 | 6 | 07 | 08 | 123 | Wed'
      // ],
    ].forEach(([expr, node, expected]) => {
        assertStringValue(node, null, expr, expected);
        // do the same tests for the alias format-date-time()
        expr = expr.replace('format-date', 'format-date-time' );
        assertStringValue(node, null, expr, expected);
    });
  });

  // Karma config is setting timezone to America/Denver
  it('format-date() - locale dependent', () => {
    [
      ['format-date("2017-05-26T00:00:01-07:00", "%a %b")', 'Fri May'],
      ['format-date("2017-05-26T23:59:59-07:00", "%a %b")', 'Fri May'],
      ['format-date("2017-05-26T01:00:00-07:00", "%a %b")', 'Fri May', 'en'],
      // ['format-date('2017-05-26T01:00:00-07:00', '%a %b')", 'ven. mai', 'fr'],
      // ['format-date('2017-05-26T01:00:00-07:00', '%a %b')", 'vr mei', 'nl'],
    ].forEach(([expr, expected, language]) => {
      assertStringValue(expr, expected);
      // TODO vimago test the language
      // do the same tests for the alias format-date-time()
      expr = expr.replace('format-date', 'format-date-time');
      assertStringValue(expr, expected);
    });
  });
});

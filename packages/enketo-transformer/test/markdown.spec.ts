import { describe, expect, it } from 'vitest';
import { markdownToHTML } from '../src/markdown';

describe('markdown', () => {
    describe('rendering', () => {
        [
            // correct emphasis
            ['_emphasis_', '<em>emphasis</em>'],
            ['*emphasis*', '<em>emphasis</em>'],
            [
                '_emphasis_ and _emphasis_',
                '<em>emphasis</em> and <em>emphasis</em>',
            ],
            [
                '*emphasis* and *emphasis*',
                '<em>emphasis</em> and <em>emphasis</em>',
            ],
            [
                '_emphasis_ and *emphasis*',
                '<em>emphasis</em> and <em>emphasis</em>',
            ],
            // [ '_empha__sis_', '<em>empha__sis</em>' ],
            // incorrect emphasis
            ['_ emphasis_', '_ emphasis_'],
            ['list:\n* emphasis*', 'list:<ul><li>emphasis*</li></ul>'],
            // correct strong
            ['__strong__', '<strong>strong</strong>'],
            ['**strong**', '<strong>strong</strong>'],
            ['__ strong __', '<strong> strong </strong>'],
            ['** strong **', '<strong> strong </strong>'],
            [
                '**strong** and **strong**',
                '<strong>strong</strong> and <strong>strong</strong>',
            ],
            [
                '__strong__ and __strong__',
                '<strong>strong</strong> and <strong>strong</strong>',
            ],
            [
                '**strong** and __strong__',
                '<strong>strong</strong> and <strong>strong</strong>',
            ],
            ['__stro_ng__', '<strong>stro_ng</strong>'],
            // correct headings
            ['#h1\n', '<h1>h1</h1>'],
            ['# h1\n', '<h1>h1</h1>'],
            ['# h1 \n', '<h1>h1 </h1>'],
            ['#h1#\n', '<h1>h1</h1>'],
            ['#h1####\n', '<h1>h1</h1>'],
            ['# h1\n', '<h1>h1</h1>'],
            ['#    h1\n', '<h1>   h1</h1>'],
            ['# h1#\n', '<h1>h1</h1>'],
            ['##h2\n', '<h2>h2</h2>'],
            ['###h3\n', '<h3>h3</h3>'],
            ['####h4\n', '<h4>h4</h4>'],
            ['#####h5\n', '<h5>h5</h5>'],
            ['#h1', '<h1>h1</h1>'],
            ['## A\n## B\n## C', '<h2>A</h2><h2>B</h2><h2>C</h2>'],
            [' ##### Word Recall Score: ', '<h5>Word Recall Score: </h5>'],
            // incorrect headings
            ['#h1# \n', '<h1>h1# </h1>'],
            ['#h1 # \n', '<h1>h1 # </h1>'],
            ['this is number #1'],
            ['this is number #1 and this is #2.'],
            ['####### A\nB', '####### A<br>B'],
            // correct links
            [
                '[link](http://example.org)',
                '<a href="http://example.org" rel="noopener" target="_blank">link</a>',
            ],
            [
                '[_link text in italics_](http://example.org)',
                '<a href="http://example.org" rel="noopener" target="_blank"><em>link text in italics</em></a>',
            ],
            [
                '[link text](http://example.org/snake_case_path)',
                '<a href="http://example.org/snake_case_path" rel="noopener" target="_blank">link text</a>',
            ],
            [
                '[_link text in italics_](http://example.org/snake_case_path)',
                '<a href="http://example.org/snake_case_path" rel="noopener" target="_blank"><em>link text in italics</em></a>',
            ],
            // incorrect links
            ['[link(http://example.org)', '[link(http://example.org)'],
            ['[link(http://example.org)]', '[link(http://example.org)]'],
            ['[link]', '[link]'],
            // correct html
            ['<span>a</span>', '<span>a</span>'],
            ['&lt;span&gt;a&lt;/span&gt;', '<span>a</span>'],
            ['<span style="color:red;">red</span>'],
            [
                '<span>bad\nunaffected <span style="color: purple">el</span>.',
                '&lt;span&gt;bad<br>unaffected <span style="color: purple">el</span>.',
            ],
            ["<span style='color:red;'>red</span>"],
            [
                '<span style="color:red;">c</span><span style="color:blue;">r</span>',
            ],
            ['><', '&gt;&lt;'],
            // sanitized html
            [
                '<span style="color:red;" onclick="alert("gotcha!")">click me</span>',
                '<span style="color:red;">click me</span>',
            ],
            [
                '<span onclick="alert("gotcha!")" style="color:red;">click me</span>',
                '<span style="color:red;">click me</span>',
            ],
            // incorrect html
            ['<span>a<span>', '&lt;span&gt;a&lt;span&gt;'],
            ['<span>a b c', '&lt;span&gt;a b c'],
            // unsupported html
            ['<div>a</div>', '&lt;div&gt;a&lt;/div&gt;'],
            [
                '<button onclick="$=null;eval="evil";">get awesomeness</button>',
                '&lt;button onclick="$=null;eval="evil";"&gt;get awesomeness&lt;/button&gt;',
            ],
            [
                '<script src="hack.js"></script>',
                '&lt;script src="hack.js"&gt;&lt;/script&gt;',
            ],
            [
                '&lt;script src="hack.js"&gt;&lt;/script&gt;',
                '&lt;script src="hack.js"&gt;&lt;/script&gt;',
            ],
            // correct unordered lists
            ['\n* a\n* b\n', '<ul><li>a</li><li>b</li></ul>'], // note: pyxform trims labels starting with \n
            ['\n* ', '<ul><li></li></ul>'],
            ['\n* a\n* 2.\n', '<ul><li>a</li><li>2.</li></ul>'],
            [
                'list:\n* a\n* b \n+ c   \n+ d',
                'list:<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>',
            ],
            [
                'list:\n\n* a\n* b \n+ c   \n+ d',
                'list:<br><ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>',
            ],
            [
                '- 1\n- 2\n- 3\nThis',
                '<ul><li>1</li><li>2</li><li>3</li></ul>This',
            ],
            ['* a', '<ul><li>a</li></ul>'],
            ['* ', '<ul><li></li></ul>'],
            // incorrect unordered lists
            ['-', '-'],
            ['*', '*'],
            ['+', '+'],
            // correct ordered lists
            ['\n1. a\n2. b', '<ol><li>a</li><li>b</li></ol>'], // note: pyxform trims labels starting with \n
            ['\n3. ', '<ol start="3"><li></li></ol>'],
            ['\n1. 2.\n2. b', '<ol><li>2.</li><li>b</li></ol>'],
            [
                'list:\n1. a\n2. b \n501. c   \n6. d',
                'list:<ol><li>a</li><li>b</li><li>c</li><li>d</li></ol>',
            ],
            [
                'list:\n\n1. a\n2. b \n501. c   \n6. d',
                'list:<br><ol><li>a</li><li>b</li><li>c</li><li>d</li></ol>',
            ],
            // incorrect ordered lists
            ['1. \n2. \n2. b', '1. <ol start="2"><li></li><li>b</li></ol>'],
            ['3.', '3.'],
            ['3. ', '3. '],
            ['3. a', '3. a'],
            // correct superscript and subscript
            ['m<sup>2</sup>'],
            ['H<sub>2</sub>O'],
            ['H<sub onclick="alert("gotcha!")">2</sub>O', 'H<sub>2</sub>O'],
            // correct combos
            [
                'format __s__ and _e_\nformat **s** and *e*',
                'format <strong>s</strong> and <em>e</em><br>format <strong>s</strong> and <em>e</em>',
            ],
            [
                '_e_ and <span style="color:red;">red</span> \n*e* and <span style="color:red;">red</span>',
                '<em>e</em> and <span style="color:red;">red</span> <br><em>e</em> and <span style="color:red;">red</span>',
            ],
            [
                '_<span style="color:red;">dbl</span>_',
                '<em><span style="color:red;">dbl</span></em>',
            ],
            [
                '<span style="color:red;">_dbl_</span>',
                '<span style="color:red;"><em>dbl</em></span>',
            ],
            [
                'list:\n* __a__\n* _b_ \n+ [c](c)',
                'list:<ul><li><strong>a</strong></li><li><em>b</em></li><li><a href="c" rel="noopener" target="_blank">c</a></li></ul>',
            ],
            [
                '<span style="color:blue">[link](http://enketo.org)</span>',
                '<span style="color:blue"><a href="http://enketo.org" rel="noopener" target="_blank">link</a></span>',
            ],
            ['# heading\nline1\nline2', '<h1>heading</h1>line1<br>line2'],
            [
                '####### heading7\nline1\nline2',
                '####### heading7<br>line1<br>line2',
            ],
            // escaping special characters with backslash
            // Keep in sync with https://github.com/getodk/collect/blob/master/collect_app/src/test/java/org/odk/collect/android/utilities/HtmlUtilsTest.java
            ['A\\_B\\_C', 'A_B_C'],
            ['_A\\_B\\_C_', '<em>A_B_C</em>'],
            ['A_B\\_C', 'A_B_C'],
            ['A\\_B_C', 'A_B_C'],
            ['A_B_C', 'A_B_C'],
            ['A _B_ C', 'A <em>B</em> C'],
            ['A_B_ C', 'A_B_ C'],
            ['A _B_C', 'A _B_C'],
            ['_A_5', '_A_5'],
            ['_A_', '<em>A</em>'],
            ['(_A_)', '(<em>A</em>)'],
            ['_A_?', '<em>A</em>?'],
            ['*_A_', '*<em>A</em>'],
            ['blah _A_!', 'blah <em>A</em>!'],
            [' _A_! blah', ' <em>A</em>! blah'],
            ['\\_ _AB\\__', '_ <em>AB_</em>'],
            ['\\\\ _AB\\_\\\\_', '\\ <em>AB_\\</em>'],
            ['A\\*B\\*C', 'A*B*C'],
            ['*A\\*B\\*C*', '<em>A*B*C</em>'],
            ['A*B\\*C', 'A*B*C'],
            ['A*B*C', 'A<em>B</em>C'],
            ['\\**AB\\**', '*<em>AB*</em>'],
            ['\\\\*AB\\*\\\\*', '\\<em>AB*\\</em>'],
            ['\\a\\ b\\*c\\d\\_e', '\\a\\ b*c\\d_e'],
            ['\\#1', '#1'],
            ['\\#\\# 2', '## 2'],
            ['works \\#when not required too', 'works #when not required too'],
            ['\\', '\\'],
            ['\\\\', '\\'],
            ['\\\\\\', '\\\\'],
            ['&92;'],
        ].forEach((test) => {
            const source = test[0];
            const expected = typeof test[1] !== 'undefined' ? test[1] : test[0];
            it(`renders "${source}" correctly`, () => {
                expect(markdownToHTML(source)).to.equal(expected);
            });
        });
    });
});

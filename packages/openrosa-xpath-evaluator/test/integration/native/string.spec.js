const {
    initDoc,
    filterAttributes,
    assertThrow,
    assertTrue,
    assertFalse,
    assertString,
    assertStringValue,
    assertNumber,
} = require('../helpers');

describe('native string functions', () => {
    it('string() conversion of strings, numbers, booleans', () => {
        assertString("string('-1.0')", '-1.0');
        assertString("string('1')", '1');
        assertString("string('  \nhello \n\r')", '  \nhello \n\r');
        assertString("string('')", '');
        assertString("string('As Df')", 'As Df');

        // of numbers
        // assertString("string(number('-1.0a'))", "NaN");
        assertString('string(0)', '0');
        assertString('string(-0)', '0');
        assertString('string(1 div 0)', 'Infinity');
        assertString('string(-1 div 0)', '-Infinity');
        assertString('string(-123)', '-123');
        assertString('string(123)', '123');
        assertString('string(123.)', '123');
        assertString('string(123.0)', '123');
        assertString('string(.123)', '0.123');
        assertString('string(-0.1000)', '-0.1');
        assertString('string(1.1)', '1.1');
        assertString('string(-1.1)', '-1.1');

        // of booleans
        assertString('string(true())', 'true');
        assertString('string(false())', 'false');
    });

    describe('string() conversion of nodesets', () => {
        const doc = initDoc(`
      <div id="FunctionStringCase">
        <div id="FunctionStringCaseStringNodesetElement">aaa</div>
        <div id="FunctionStringCaseStringNodesetElementNested"><span>bbb</span>sss<span></span><div>ccc<span>ddd</span></div></div>
        <div id="FunctionStringCaseStringNodesetComment"><!-- hello world --></div>
        <div id="FunctionStringCaseStringNodesetText">here is some text</div>
        <div id="FunctionStringCaseStringNodesetProcessingInstruction"><?xml-stylesheet type="text/xml" href="test.xsl"?></div>
        <div id="FunctionStringCaseStringNodesetCData"><![CDATA[some cdata]]></div>
        <div id="FunctionStringCaseStringNodesetAttribute" class="123" width="  1   00%  "></div>
        <div id="FunctionStringCaseStringNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
        <div id="FunctionStringCaseStringLength1"></div>
        <div id="FunctionStringCaseStringLength2">asdf</div>
        <div id="FunctionStringCaseStringNormalizeSpace1"></div>
        <div id="FunctionStringCaseStringNormalizeSpace2">   </div>
        <div id="FunctionStringCaseStringNormalizeSpace3">  a  b  </div>
        <div id="FunctionStringCaseStringNormalizeSpace4">  a
           bc  c
        </div>
      </div>`);
        let node;
        const nodeWithAttributes = doc.getElementById(
            'FunctionStringCaseStringNodesetAttribute'
        );

        const input = [
            ['string(/htmlnot)', doc, ''], // empty
            [
                'string(self::node())',
                doc.getElementById('FunctionStringCaseStringNodesetElement'),
                'aaa',
            ], // element
            [
                'string()',
                doc.getElementById('FunctionStringCaseStringNodesetElement'),
                'aaa',
            ], // element
            [
                'string(node())',
                doc.getElementById(
                    'FunctionStringCaseStringNodesetElementNested'
                ),
                'bbb',
            ], // element nested
            [
                'string(self::node())',
                doc.getElementById(
                    'FunctionStringCaseStringNodesetElementNested'
                ),
                'bbbssscccddd',
            ], // element nested
            [
                'string()',
                doc.getElementById(
                    'FunctionStringCaseStringNodesetElementNested'
                ),
                'bbbssscccddd',
            ], // element nested
            [
                'string()',
                doc.getElementById('FunctionStringCaseStringNodesetComment')
                    .firstChild,
                ' hello world ',
            ], // comment
            [
                'string()',
                doc.getElementById('FunctionStringCaseStringNodesetText')
                    .firstChild,
                'here is some text',
            ], // text
            [
                'string(attribute::node()[1])',
                nodeWithAttributes,
                filterAttributes(nodeWithAttributes.attributes)[0].nodeValue,
            ], // attribute
            [
                'string(attribute::node()[3])',
                nodeWithAttributes,
                filterAttributes(nodeWithAttributes.attributes)[2].nodeValue,
            ], // attribute
        ];

        // Processing Instruction
        node = doc.getElementById(
            'FunctionStringCaseStringNodesetProcessingInstruction'
        ).firstChild;
        if (node && node.nodeType === 7) {
            input.push(['string()', node, 'type="text/xml" href="test.xsl"']);
        }
        // CDATASection
        node = doc.getElementById(
            'FunctionStringCaseStringNodesetCData'
        ).firstChild;
        if (node && node.nodeType === 4) {
            input.push(['string()', node, 'some cdata']);
        }

        input.forEach(([expr, node, expected]) => {
            it(`should convert ${expr} to ${expected}`, () => {
                assertString(node, null, expr, expected);
            });
        });
    });

    it('string conversion of nodeset with namepace', () => {
        const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="FunctionStringCaseStringNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
        </body>
      </html>`);
        const node = doc.getElementById(
            'FunctionStringCaseStringNodesetNamespace'
        );
        assertStringValue(
            node,
            null,
            'string(namespace-uri(/*))',
            'http://www.w3.org/1999/xhtml'
        );
    });

    it('string conversion fails when too many arguments are provided', () => {
        assertThrow('string(1, 2)');
    });

    it('concat()', () => {
        assertString('concat(0, 0)', '00');
        assertString("concat('', '', 'b')", 'b');
        assertString("concat('a', '', 'c')", 'ac');
        assertString("concat('a', 'b', 'c', 'd', 'e')", 'abcde');
    });

    it('starts-with', () => {
        assertTrue("starts-with('', '')");
        assertTrue("starts-with('a', '')");
        assertTrue("starts-with('a', 'a')");
        assertFalse("starts-with('a', 'b')");
        assertTrue("starts-with('ba', 'b')");
        assertFalse("starts-with('', 'b')");
    });

    it('starts-with() fails when too many arguments are provided', () => {
        assertThrow('starts-with(1, 2, 3)');
    });

    it('start-with() fails when not enough arguments are provided', () => {
        assertThrow('starts-with()');
        assertThrow('starts-with(1)');
    });

    it('contains()', () => {
        assertTrue("contains('', '')");
        assertFalse("contains('', 'a')");
        assertTrue("contains('a', 'a')");
        assertTrue("contains('a', '')");
        assertTrue("contains('asdf', 'sd')");
        assertFalse("contains('asdf', 'af')");
    });

    it('contains() fails when too many arguments are provided', () => {
        assertThrow('contains(1, 2, 3)');
    });

    it('contains() fails when too few arguments are provided', () => {
        assertThrow('contains()');
        assertThrow('contains(1)');
    });

    it('substring-before()', () => {
        assertString("substring-before('', '')", '');
        assertString("substring-before('', 'a')", '');
        assertString("substring-before('a', '')", '');
        assertString("substring-before('a', 'a')", '');
        assertString("substring-before('ab', 'a')", '');
        assertString("substring-before('ab', 'b')", 'a');
        assertString("substring-before('abb', 'b')", 'a');
        assertString("substring-before('ab', 'c')", '');
    });

    it('substring-before() fails with too many arguments', () => {
        assertThrow('substring-before(1, 2, 3)');
    });

    it('substring-before() with too few arguments', () => {
        assertThrow('substring-before()');
        assertThrow('substring-before(1)');
    });

    it('substring-after()', () => {
        assertString("substring-after('', '')", '');
        assertString("substring-after('', 'a')", '');
        assertString("substring-after('a', '')", 'a');
        assertString("substring-after('a', 'a')", '');
        assertString("substring-after('ab', 'a')", 'b');
        assertString("substring-after('aab', 'a')", 'ab');
        assertString("substring-after('ab', 'b')", '');
        assertString("substring-after('ab', 'c')", '');
    });

    it('substring-after() fails when too many arguments are provided', () => {
        assertThrow('substring-after(1, 2, 3)');
    });

    it('substring-after() fails when too few arguments are provided', () => {
        assertThrow('substring-after()');
        assertThrow('substring-after(1)');
    });

    describe('substring()', () => {
        [
            ["substring('12345', 2, 3)", '234'],
            ["substring('12345', 2)", '2345'],
            ["substring('12345', -1)", '12345'],
            ["substring('12345', 1 div 0)", ''],
            ["substring('12345', 0 div 0)", ''],
            ["substring('12345', -1 div 0)", '12345'], // this diverges from Firefox and Chrome implementations, but seems to follow the spec
            ["substring('12345', 1.5, 2.6)", '234'],
            ["substring('12345', 1.3, 2.3)", '12'],
            ["substring('12345', 0, 3)", '12'],
            ["substring('12345', 0, -1 div 0)", ''],
            ["substring('12345', 0 div 0, 3)", ''],
            ["substring('12345', 1, 0 div 0)", ''],
            ["substring('12345', -42, 1 div 0)", '12345'],
            ["substring('12345', -1 div 0, 1 div 0)", ''],
        ].forEach(([expr, expected]) => {
            it(`should evaluate "${expr}" to "${expected}"`, () => {
                assertString(expr, expected);
            });
        });
    });

    it('substring() fails when too many arguments are provided', () => {
        assertThrow('substring(1, 2, 3, 4)');
    });

    it('substring() fails when too few arguments are provided', () => {
        assertThrow('substring()');
        assertThrow('substring(1)');
    });

    it('string-length()', () => {
        const doc = initDoc(`
      <div>
        <div id="FunctionStringCaseStringLength1"></div>
        <div id="FunctionStringCaseStringLength2">asdf</div>
      </div>`);
        [
            ["string-length('')", 0, doc],
            ["string-length(' ')", 1, doc],
            ["string-length('\r\n')", 2, doc],
            ["string-length('a')", 1, doc],
            [
                'string-length()',
                0,
                doc.getElementById('FunctionStringCaseStringLength1'),
            ],
            [
                'string-length()',
                4,
                doc.getElementById('FunctionStringCaseStringLength2'),
            ],
        ].forEach((t) => {
            assertNumber(t[2], null, t[0], t[1]);
        });
    });

    it('string-length() fails when too many arguments are provided', () => {
        assertThrow('string-length(1, 2)');
    });

    describe('normalize-space()', () => {
        const doc = initDoc(`
      <div>
        <div id="FunctionStringCaseStringNormalizeSpace1"></div>
        <div id="FunctionStringCaseStringNormalizeSpace2">   </div>
        <div id="FunctionStringCaseStringNormalizeSpace3">  a  b  </div>
        <div id="FunctionStringCaseStringNormalizeSpace4">  a
           bc  c
        </div>
      </div>`);
        [
            ["normalize-space('')", '', doc],
            ["normalize-space('    ')", '', doc],
            ["normalize-space('  a')", 'a', doc],
            ["normalize-space('  a  ')", 'a', doc],
            ["normalize-space('  a b  ')", 'a b', doc],
            ["normalize-space('  a  b  ')", 'a b', doc],
            ["normalize-space(' \r\n\t')", '', doc],
            ["normalize-space(' \f\v ')", '\f\v', doc],
            ["normalize-space('\na  \f \r\v  b\r\n  ')", 'a \f \v b', doc],
            [
                'normalize-space()',
                '',
                doc.getElementById('FunctionStringCaseStringNormalizeSpace1'),
            ],
            [
                'normalize-space()',
                '',
                doc.getElementById('FunctionStringCaseStringNormalizeSpace2'),
            ],
            [
                'normalize-space()',
                'a b',
                doc.getElementById('FunctionStringCaseStringNormalizeSpace3'),
            ],
            [
                'normalize-space()',
                'a bc c',
                doc.getElementById('FunctionStringCaseStringNormalizeSpace4'),
            ],
        ].forEach(([expr, expected, node]) => {
            it(`should evaluate ${expr} to ${expected}`, () => {
                assertString(node, null, expr, expected);
            });
        });
    });

    it('normalize-space() fails when too many arguments are provided', () => {
        assertThrow('normalize-space(1,2)');
    });

    it('translate()', () => {
        [
            ["translate('', '', '')", ''],
            ["translate('a', '', '')", 'a'],
            ["translate('a', 'a', '')", ''],
            ["translate('a', 'b', '')", 'a'],
            ["translate('ab', 'a', 'A')", 'Ab'],
            ["translate('ab', 'a', 'AB')", 'Ab'],
            ["translate('aabb', 'ab', 'ba')", 'bbaa'],
            ["translate('aa', 'aa', 'bc')", 'bb'],
        ].forEach(([expr, expected]) => {
            assertString(expr, expected);
        });
    });

    it('translate() with a node parameter', () => {
        const doc = initDoc(`
      <div>
        <a id="A">TAXIcab</a>
      </div>`);
        assertString(
            doc.getElementById('A'),
            null,
            'translate( ., "abc", "ABC")',
            'TAXICAB'
        );
    });

    it('translate() fails when too many arguments are provided', () => {
        assertThrow('translate(1, 2, 3, 4)');
    });

    it('translate() fails when too few arguments are provided', () => {
        assertThrow('translate()');
        assertThrow('translate(1)');
        assertThrow('translate(1, 2)');
    });
});

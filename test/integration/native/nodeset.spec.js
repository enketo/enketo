const { initDoc, nsResolver, filterAttributes,
  assert, assertThrow, assertNumberValue, assertStringValue } = require('../helpers');

describe('native nodeset functions', () => {

  describe('last()', () => {
    let doc;

    beforeEach(() => {
      doc = initDoc(`
        <!DOCTYPE html>
        <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <title>xpath-test</title>
          </head>
          <body class="yui3-skin-sam" id="body">
            <div id="testFunctionNodeset">
              <div id="testFunctionNodeset2">
                <p>1</p>
                <p>2</p>
                <p>3</p>
                <p>4</p>
              </div>
            </div>
          </body>
        </html>`, nsResolver);
    });

    [
      ["last()", 1],
      ["xhtml:p[last()]", 4],
      ["xhtml:p[last()-last()+1]", 1],
    ].forEach(([expr, value]) => {
      it(`should evaluate ${expr} as ${value}`, () => {
        // given
        const node = doc.getElementById('testFunctionNodeset2');

        // expect
        assertNumberValue(node, null, expr, value);
      });
    });
  });

  it('last() fails when too many arguments are provided', () => {
    assertThrow("last(1)");
  });

  describe('position()', () => {
    const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="testFunctionNodeset">
            <div id="testFunctionNodeset2">
              <p>1</p>
              <p>2</p>
              <p>3</p>
              <p>4</p>
            </div>
          </div>
        </body>
      </html>`, nsResolver);
    const node = doc.getElementById('testFunctionNodeset2');
    [
      ["position()", 1],
      [ "*[position()=last()]", 4 ],
      [ "*[position()=2]", 2 ],
      //[ "xhtml:p[position()=2]", 2 ] TODO unresolvable namespace here...
    ].forEach(([expr, expected]) => {
      it(`should evaluate ${expr} as ${expected}`, () => {
        assertNumberValue(node, null, expr, expected);
      });
    });

    [
      [ "*[position()=-1]", "" ]
    ].forEach(([expr, expected]) => {
      it(`should evaluate ${expr} as ${expected}`, () => {
        assertStringValue(node, null, expr, expected);
      });
    });

    it('position() fails when arg is not a nodeset', () => {
      assertThrow("position(1)");
    });
  });

  describe('count()', () => {
    [
      ["count(xhtml:p)",     4],
      ["1 + count(xhtml:p)", 5],
      ["count(p)",     0],
      ["1 + count(p)", 1],
      ["count(//nonexisting)",     0],
      ["1 + count(//nonexisting)", 1],
    ].forEach(([expr, expected]) => {
      it(`should evaluate '${expr}' to ${expected}`, () => {
        // given
        const doc = initDoc(`
          <!DOCTYPE html>
          <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
              <title>xpath-test</title>
            </head>
            <body class="yui3-skin-sam" id="body">
              <div id="testFunctionNodeset">
                <div id="testFunctionNodeset2">
                  <p>1</p>
                  <p>2</p>
                  <p>3</p>
                  <p>4</p>
                </div>
              </div>
            </body>
          </html>`, nsResolver);
        const node = doc.getElementById('testFunctionNodeset2');

        // expect
        assertNumberValue(node, null, expr, expected);
      });
    });

    it('count() fails when too many arguments are provided', () => {
      assertThrow("count(1, 2)");
    });

    it('count() fails when too few arguments are provided', () => {
      assertThrow("count()");
    });

    it('count() fails when incorrect argument type is provided', () => {
      assertThrow("count(1)");
    });
  });

  it('local-name()', () => {
    const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="testFunctionNodeset">
            <div id="testFunctionNodesetElement">aaa</div>
            <div id="testFunctionNodesetElementPrefix"><ev:div2></ev:div2></div>
            <div id="testFunctionNodesetElementNested"><span>bbb</span>sss<span></span><div>ccc<span>ddd</span></div></div>
            <div id="testFunctionNodesetComment"><!-- hello world --></div>
            <div id="testFunctionNodesetText">here is some text</div>
            <div id="testFunctionNodesetProcessingInstruction"><?xml-stylesheet type="text/xml" href="test.xsl"?></div>
            <div id="testFunctionNodesetCData"><![CDATA[some cdata]]></div>
            <div id="testFunctionNodesetAttribute" ev:class="123" width="  1   00%  "></div>
            <div id="testFunctionNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
          </div>
        </body>
      </html>`, nsResolver);
    let result;
    let input;
    let i;
    let node;
    const nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute');
    const nodeAttributes = filterAttributes(nodeWithAttributes.attributes );
    let nodeAttributesIndex;

    for (i = 0; i < nodeAttributes.length; i++ ) {
      if (nodeAttributes[ i ].nodeName == 'ev:class' ) {
        nodeAttributesIndex = i;
        break;
      }
    }

    input = [
      [ "local-name(/htmlnot)", doc, "" ], // empty
      [ "local-name()", doc, "" ], // document
      [ "local-name()", doc.documentElement, "html" ], // element
      [ "local-name(self::node())", doc.getElementById('testFunctionNodesetElement' ), "div" ], // element
      [ "local-name()", doc.getElementById('testFunctionNodesetElement' ), "div" ], // element
      [ "local-name()", doc.getElementById('testFunctionNodesetElementPrefix' ).firstChild, "div2" ], // element
      [ "local-name(node())", doc.getElementById('testFunctionNodesetElementNested' ), "span" ], // element nested
      [ "local-name(self::node())", doc.getElementById('testFunctionNodesetElementNested' ), "div" ], // element nested
      [ "local-name()", doc.getElementById('testFunctionNodesetComment' ).firstChild, "" ], // comment
      [ "local-name()", doc.getElementById('testFunctionNodesetText' ).firstChild, "" ], // text
      [ "local-name(attribute::node())", nodeWithAttributes, nodeAttributes[ 0 ].nodeName ], // attribute
      [ `local-name(attribute::node()[${nodeAttributesIndex + 1}])`, nodeWithAttributes, 'class' ] // attribute
    ];

    // Processing Instruction
    node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
    if (node && node.nodeType == 7) {
      input.push([ "local-name()", node, 'xml-stylesheet' ] );
    }

    // CDATASection
    node = doc.getElementById('testFunctionNodesetCData').firstChild;
    if (node && node.nodeType == 4 ) {
      input.push(["local-name()", node, '' ]);
    }

    for (i = 0; i < input.length; i++) {
      result = doc.evaluate(input[i][0], input[i][1], null, XPathResult.STRING_TYPE, null);
      assert.equal(result.stringValue.toLowerCase(), input[i][2]);
    }
  });

  it('local-name() with namespace', () => {
    const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="testFunctionNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
        </body>
      </html>`, nsResolver);
    const node = doc.getElementById('testFunctionNodesetNamespace');
    [
      ["local-name(namespace::node())", node, ""],
      //TODO ["local-name(namespace::node()[2])", node, "asdf"]
    ].forEach(([expr, node, expected]) => {
      // const val = doc.e(expr, node, nsr, XPathResult.STRING_TYPE, null);
      // assert.equal(val.stringValue, expected);
      assertStringValue(node, null, expr, expected);
    });
  });

  it('local-name() fails when too many arguments are provided', () => {
    assertThrow("local-name(1, 2)");
  });

  it('local-name() fails when the wrong type argument is provided', () => {
    assertThrow("local-name(1)");
  });

  it('namespace-uri()', () => {
    const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="testFunctionNodeset">
            <div id="testFunctionNodesetElement">aaa</div>
            <div id="testFunctionNodesetElementPrefix"><ev:div2></ev:div2></div>
            <div id="testFunctionNodesetElementNested"><span>bbb</span>sss<span></span><div>ccc<span>ddd</span></div></div>
            <div id="testFunctionNodesetComment"><!-- hello world --></div>
            <div id="testFunctionNodesetText">here is some text</div>
            <div id="testFunctionNodesetProcessingInstruction"><?xml-stylesheet type="text/xml" href="test.xsl"?></div>
            <div id="testFunctionNodesetCData"><![CDATA[some cdata]]></div>
            <div id="testFunctionNodesetAttribute" ev:class="123" width="  1   00%  "></div>
            <div id="testFunctionNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
          </div>
        </body>
      </html>`, nsResolver);

    let result;
    let input;
    let i;
    let node;
    const nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute');
    const nodeAttributes = filterAttributes(nodeWithAttributes.attributes );
    let nodeAttributesIndex;

    for (i = 0; i < nodeAttributes.length; i++) {
      if (nodeAttributes[ i ].nodeName == 'ev:class') {
        nodeAttributesIndex = i;
        break;
      }
    }

    input = [
      ["namespace-uri(/htmlnot)", doc, ""], // empty
      ["namespace-uri()", doc, ""], // document
      ["namespace-uri()", doc.documentElement, "http://www.w3.org/1999/xhtml"], // element
      ["namespace-uri(self::node())", doc.getElementById('testFunctionNodesetElement'), "http://www.w3.org/1999/xhtml" ], // element
      ["namespace-uri()", doc.getElementById('testFunctionNodesetElement'), "http://www.w3.org/1999/xhtml" ], // element
      ["namespace-uri(node())", doc.getElementById('testFunctionNodesetElementNested'), "http://www.w3.org/1999/xhtml" ], // element nested
      ["namespace-uri(self::node())", doc.getElementById('testFunctionNodesetElementNested'), "http://www.w3.org/1999/xhtml" ], // element nested
      ["namespace-uri()", doc.getElementById('testFunctionNodesetElementPrefix').firstChild, "http://some-namespace.com/nss" ], // element
      ["namespace-uri()", doc.getElementById('testFunctionNodesetComment').firstChild, "" ], // comment
      ["namespace-uri()", doc.getElementById('testFunctionNodesetText').firstChild, "" ], // text
      ["namespace-uri(attribute::node())", nodeWithAttributes, ''], // attribute
      [`namespace-uri(attribute::node()[${nodeAttributesIndex + 1}])`, nodeWithAttributes, 'http://some-namespace.com/nss' ], // attribute
      ["namespace-uri(namespace::node())", doc.getElementById('testFunctionNodesetNamespace' ), "" ], // namespace
      ["namespace-uri(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace' ), "" ] // namespace
    ];

    // Processing Instruction
    node = doc.getElementById('testFunctionNodesetProcessingInstruction').firstChild;
    if(node && node.nodeType == 7) {
      input.push(["namespace-uri()", node, '']);
    }

    // CDATASection
    node = doc.getElementById('testFunctionNodesetCData').firstChild;
    if(node && node.nodeType == 4) {
      input.push(["namespace-uri()", node, '']);
    }

    for(i = 0; i < input.length; i++) {
      result = doc.evaluate(input[i][0], input[i][1], null, XPathResult.STRING_TYPE, null);
      assert.equal(result.stringValue, input[i][2]);
    }
  });

  it('namespace-uri() fails when too many arguments are provided', () => {
    assertThrow("namespace-uri(1, 2)");
  });

  it('namespace-uri() fails when wrong type of argument is provided', () => {
    assertThrow("namespace-uri(1)");
  });

  it('name()', () => {
    const doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="testFunctionNodeset">
            <div id="testFunctionNodesetElement">aaa</div>
            <div id="testFunctionNodesetElementPrefix"><ev:div2></ev:div2></div>
            <div id="testFunctionNodesetElementNested"><span>bbb</span>sss<span></span><div>ccc<span>ddd</span></div></div>
            <div id="testFunctionNodesetComment"><!-- hello world --></div>
            <div id="testFunctionNodesetText">here is some text</div>
            <div id="testFunctionNodesetProcessingInstruction"><?xml-stylesheet type="text/xml" href="test.xsl"?></div>
            <div id="testFunctionNodesetCData"><![CDATA[some cdata]]></div>
            <div id="testFunctionNodesetAttribute" ev:class="123" width="  1   00%  "></div>
            <div id="testFunctionNodesetNamespace" xmlns:asdf="http://www.123.com/"></div>
          </div>
        </body>
      </html>`, nsResolver);

    let result;
    let input;
    let i;
    let node;
    const nodeWithAttributes = doc.getElementById('testFunctionNodesetAttribute' );
    const nodeAttributes = filterAttributes(nodeWithAttributes.attributes );
    let nodeAttributesIndex;

    for (i = 0; i < nodeAttributes.length; i++) {
      if (nodeAttributes[i].nodeName == 'ev:class') {
        nodeAttributesIndex = i;
        break;
      }
    }

    input = [
      [ "name(/htmlnot)", doc, "" ], // empty
      [ "name()", doc, "" ], // document
      [ "name()", doc.documentElement, "html" ], // element
      [ "name(self::node())", doc.getElementById('testFunctionNodesetElement' ), "div" ], // element
      [ "name()", doc.getElementById('testFunctionNodesetElement' ), "div" ], // element
      [ "name(node())", doc.getElementById('testFunctionNodesetElementNested' ), "span" ], // element nested
      [ "name(self::node())", doc.getElementById('testFunctionNodesetElementNested' ), "div" ], // element nested
      [ "name()", doc.getElementById('testFunctionNodesetElementPrefix' ).firstChild, "ev:div2" ], // element
      [ "name()", doc.getElementById('testFunctionNodesetComment' ).firstChild, "" ], // comment
      [ "name()", doc.getElementById('testFunctionNodesetText' ).firstChild, "" ], // text
      [ "name(attribute::node())", nodeWithAttributes, nodeAttributes[ 0 ].nodeName ], // attribute
      [ `name(attribute::node()[${nodeAttributesIndex + 1}])`, nodeWithAttributes, 'ev:class' ], // attribute
      [ "name(namespace::node())", doc.getElementById('testFunctionNodesetNamespace' ), "" ], // namespace
      //TODO [ "name(namespace::node()[2])", doc.getElementById('testFunctionNodesetNamespace' ), "asdf" ] // namespace
    ];

    // Processing Instruction
    node = doc.getElementById('testFunctionNodesetProcessingInstruction' ).firstChild;
    if (node && node.nodeType == 7 ) {
      input.push([ "name()", node, 'xml-stylesheet' ] );
    }

    // CDATASection
    node = doc.getElementById('testFunctionNodesetCData' ).firstChild;
    if (node && node.nodeType == 4 ) {
      input.push([ "name()", node, '' ] );
    }

    for (i = 0; i < input.length; i++ ) {
      result = doc.evaluate(input[i][0], input[i][1], null, XPathResult.STRING_TYPE, null);
      assert.equal(result.stringValue, input[i][2]);
    }
  });

  it('name() fails when too many arguments are provided', () => {
    assertThrow("name(1, 2)");
  });

  it('name() fails when the wrong argument type is provided', () => {
    assertThrow("name(1)");
  });

  describe('node() as part of a path', () => {
    const doc = initDoc(`
      <model xmlns:jr="http://openrosa.org/javarosa">
        <instance>
          <data id="nested-repeat-v5" jr:complete="1" complete="0">
            <node/>
          </data>
        </instance>
      </model>`, nsResolver);

    [
      ['/model/instance[1]/node()/@jr:complete = "1"', true],
      ['/model/instance[1]/node()/@jr:complete = 1', true],
      ['/model/instance[1]/node()/@complete = 0', true],
      ['/model/instance[1]/node()/@complete = "0"', true],
    ].forEach(([expr, expected]) => {
      it(`evaluates attribute value comparison (${expr}) correctly`, () => {
        const res = doc.xEval(expr, doc, XPathResult.BOOLEAN_TYPE);
        assert.equal(res.booleanValue, expected);
      });
    });
  });

  describe('"*" as part of a path', () => {
    const doc = initDoc(`
      <model xmlns:jr="http://openrosa.org/javarosa">
        <instance>
          <data id="nested-repeat-v5" jr:complete="1" complete="0">
            <node/>
          </data>
        </instance>
      </model>`, nsResolver);

    [
      ['/model/instance[1]/*/@jr:complete = "1"', true],
      ['/model/instance[1]/*/@jr:complete = 1', true],
      ['/model/instance[1]/*/@complete = 0', true],
      ['/model/instance[1]/*/@complete = "0"', true],
    ].forEach(([expr, expected]) => {
      it(`evaluates attribute value comparison (${expr}) correctly`, () => {
        const res = doc.xEval(expr, doc, XPathResult.BOOLEAN_TYPE);
        assert.equal(res.booleanValue, expected);
      });
    });
  });
});

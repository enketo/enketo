const {
    initDoc,
    nsResolver,
    filterAttributes,
    getAllNodes,
    assert,
    assertNodes,
} = require('../helpers');

describe('axis', () => {
    let doc;
    let h;

    beforeEach(() => {
        doc = initDoc(
            `
      <!DOCTYPE html>
      <html xml:lang="en-us" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <title>xpath-test</title>
        </head>
        <body class="yui3-skin-sam" id="body">
          <div id="StepAxisCase">

            <div id="testStepAxisNodeElement"></div>
            <div id="testStepAxisNodeAttribute" style="sss:asdf;" width="100%"></div>
            <div id="testStepAxisNodeCData"><![CDATA[aa<strong>some text</strong>]]><div></div>asdf</div>
            <div id="testStepAxisNodeComment"><!-- here is comment --><div></div>asdf</div>
            <div id="testStepAxisNodeProcessingInstruction"><?xml-stylesheet type="text/xml" href="test.xsl"?><div></div>asdf</div>
            <div id="testStepAxisNodeNamespace" xmlns:asdf="http://some-namespace/" width="100%"></div>

            <div id="testStepAxisChild">
              some text
              <![CDATA[aa<strong>some text</strong>]]>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>

            <div id="testStepAxisDescendant">
              <div>
                <div></div>
                <div></div>
                <div></div>
                <div>
                  <div></div>
                  <div></div>
                  <!-- here is comment -->
                </div>
              </div>
              <div></div>
            </div>

            <div id="testStepAxisAttribute">
              <div id="testStepAxisNodeAttribute0"></div>
              <div id="testStepAxisNodeAttribute1" class="test 123"></div>
              <div id="testStepAxisNodeAttribute3" style="aaa" class="test 123" width="100%"></div>
              <div id="testStepAxisNodeAttributeStartXml" xmlnswidth="100%" xml="sss"></div>

              <div id="testStepAxisNodeNamespace0"></div>
              <div id="testStepAxisNodeNamespace1" xmlns:a="asdf"></div>
              <div id="testStepAxisNodeNamespace1b" xmlns:a="asdf"></div>
              <div id="testStepAxisNodeNamespace1defaultContainer"><div xmlns="asdf"></div></div>
              <div id="testStepAxisNodeNamespace1defaultContainer2"><div xmlns=""></div></div>
              <div id="testStepAxisNodeNamespace3" xmlns:a="asdf" xmlns:b="asdf2" xmlns:c="asdf3"></div>
              <div id="testStepAxisNodeNamespace3defaultContainer"><div xmlns:a="asdf" xmlns="asdf2" xmlns:c="asdf3"></div></div>
              <div id="testStepAxisNodeNamespaceXmlOverride" xmlns:ev="http://some-other-namespace/"></div>

              <div id="testStepAxisNodeAttrib1Ns1" class="test 123" xmlns:a="asdf"></div>
              <div id="testStepAxisNodeAttrib1Ns1reversed" xmlns:a="asdf" class="test 123"></div>
              <div id="testStepAxisNodeAttrib2Ns1" style="aaa" class="test 123" xmlns:c="asdf3"></div>
              <div id="testStepAxisNodeAttrib2Ns1reversedContainer"><div style="aaa" xmlns="asdf" class="test 123"></div></div>
              <div id="testStepAxisNodeAttrib2Ns2Container"><div xmlns:a="asdf" xmlns="asdf2" style="aaa" class="test 123"></div></div>
            </div>
          </div>
        </body>
      </html>`,
            nsResolver
        );

        h = {
            getNodeAttribute() {
                let attribute;
                const node = doc.getElementById('testStepAxisNodeAttribute');
                let i;

                for (i = 0; i < node.attributes.length; i++) {
                    if (node.attributes[i].specified) {
                        attribute = node.attributes[i];
                        break;
                    }
                }
                assert.equal(typeof attribute, 'object');
                return attribute;
            },

            getNodeComment() {
                return doc.getElementById('testStepAxisNodeComment').firstChild;
            },

            getNodeCData() {
                return doc.getElementById('testStepAxisNodeCData').firstChild;
            },

            getNodeProcessingInstruction() {
                return doc.getElementById(
                    'testStepAxisNodeProcessingInstruction'
                ).firstChild;
            },

            getNodeNamespace() {
                const result = doc.xEval(
                    'namespace::node()',
                    doc.getElementById('testStepAxisNodeNamespace'),
                    XPathResult.ANY_UNORDERED_NODE_TYPE
                );
                return result.singleNodeValue;
            },

            followingSiblingNodes(node) {
                const nodes = [];

                // eslint-disable-next-line no-cond-assign
                while ((node = node.nextSibling)) {
                    nodes.push(node);
                }

                return nodes;
            },

            precedingSiblingNodes(node) {
                const nodes = [];

                // eslint-disable-next-line no-cond-assign
                while ((node = node.previousSibling)) {
                    nodes.push(node);
                }

                nodes.reverse();

                return nodes;
            },

            followingNodes(node) {
                const nodes = [];
                let i;
                let result;
                let node2;

                const nodesAll = getAllNodes(doc);

                for (i = 0; i < nodesAll.length; i++) {
                    node2 = nodesAll[i]; //
                    if (node2.nodeType === 10)
                        // document type node
                        continue; //
                    result = node.compareDocumentPosition(node2);
                    if (result === 4) {
                        nodes.push(node2);
                    }
                }

                return nodes;
            },

            precedingNodes(node) {
                const nodes = [];
                let i;
                let result;
                let node2;

                const nodesAll = getAllNodes(doc);

                for (i = 0; i < nodesAll.length; i++) {
                    node2 = nodesAll[i];

                    result = node.compareDocumentPosition(node2);
                    if (result === 2) {
                        nodes.push(node2);
                    }
                }

                return nodes;
            },
        };
    });

    describe('self axis', () => {
        it('works with document context', () => {
            assertNodes('self::node()', doc, [doc]);
        });

        it('works with documentElement context', () => {
            assertNodes('self::node()', doc.documentElement, [
                doc.documentElement,
            ]);
        });

        it('works with element context', () => {
            assertNodes(
                'self::node()',
                doc.getElementById('testStepAxisChild'),
                [doc.getElementById('testStepAxisChild')]
            );
        });

        it('works with element attribute context', () => {
            assertNodes('self::node()', h.getNodeAttribute(), [
                h.getNodeAttribute(),
            ]);
        });

        it('works with CData context', () => {
            assertNodes('self::node()', h.getNodeCData(), [h.getNodeCData()]);
        });

        it('works with comment context', () => {
            assertNodes('self::node()', h.getNodeComment(), [
                h.getNodeComment(),
            ]);
        });

        it('works with node processing instruction context', () => {
            assertNodes('self::node()', h.getNodeProcessingInstruction(), [
                h.getNodeProcessingInstruction(),
            ]);
        });

        it('works with document fragment context', () => {
            const fragment = doc.createDocumentFragment();
            const test = () => {
                assertNodes('self::node()', fragment, [fragment]);
            };
            assert.throw(test, Error);
        });
    });

    describe('child axis', () => {
        it('works with document context', () => {
            let i;
            const expectedResult = [];

            for (i = 0; i < doc.childNodes.length; i++) {
                expectedResult.push(doc.childNodes.item(i));
            }

            assertNodes('child::node()', doc, expectedResult);
        });

        it('works with documentElement context', () => {
            assertNodes(
                'child::node()',
                doc.documentElement,
                doc.documentElement.childNodes
            );
        });

        it('works with element context', () => {
            assertNodes(
                'child::node()',
                doc.getElementById('testStepAxisChild'),
                doc.getElementById('testStepAxisChild').childNodes
            );
        });

        it('works with attribute context', () => {
            assertNodes('child::node()', h.getNodeAttribute(), []);
        });

        it('works with CData context', () => {
            assertNodes('child::node()', h.getNodeCData(), []);
        });

        it('works with a comment context', () => {
            assertNodes('child::node()', h.getNodeComment(), []);
        });

        it('works with a processing instruction context', () => {
            assertNodes('child::node()', h.getNodeProcessingInstruction(), []);
        });
    });

    describe('descendendant axis', () => {
        it('works with Element context', () => {
            const descendantNodes = (node) => {
                const nodes = [];
                let i;

                for (i = 0; i < node.childNodes.length; i++) {
                    nodes.push(node.childNodes.item(i));
                    nodes.push(...descendantNodes(node.childNodes.item(i)));
                }

                return nodes;
            };

            assertNodes(
                'descendant::node()',
                doc.getElementById('testStepAxisDescendant'),
                descendantNodes(doc.getElementById('testStepAxisDescendant'))
            );
        });

        it('works with attribute context', () => {
            assertNodes('descendant::node()', h.getNodeAttribute(), []);
        });

        it('works with CData context', () => {
            assertNodes('descendant::node()', h.getNodeCData(), []);
        });

        it('works with a comment context', () => {
            assertNodes('descendant::node()', h.getNodeComment(), []);
        });

        it('works with a processing instruction context', () => {
            assertNodes(
                'descendant::node()',
                h.getNodeProcessingInstruction(),
                []
            );
        });
    });

    describe('descendant-or-self axis', () => {
        it('works with element context', () => {
            const descendantNodes = (node) => {
                const nodes = [];
                let i;
                for (i = 0; i < node.childNodes.length; i++) {
                    nodes.push(node.childNodes.item(i));
                    nodes.push(...descendantNodes(node.childNodes.item(i)));
                }
                return nodes;
            };

            const nodes = descendantNodes(
                doc.getElementById('testStepAxisDescendant')
            );
            nodes.unshift(doc.getElementById('testStepAxisDescendant'));
            assertNodes(
                'descendant-or-self::node()',
                doc.getElementById('testStepAxisDescendant'),
                nodes
            );
        });

        it('works with attribute context', () => {
            assertNodes('descendant-or-self::node()', h.getNodeAttribute(), [
                h.getNodeAttribute(),
            ]);
        });

        it('works with CDATA context', () => {
            assertNodes('descendant-or-self::node()', h.getNodeCData(), [
                h.getNodeCData(),
            ]);
        });

        it('works with a comment context', () => {
            assertNodes('descendant-or-self::node()', h.getNodeComment(), [
                h.getNodeComment(),
            ]);
        });

        it('works with element context', () => {
            assertNodes(
                'descendant-or-self::node()',
                h.getNodeProcessingInstruction(),
                [h.getNodeProcessingInstruction()]
            );
        });
    });

    describe('parent axis', () => {
        it('works with a document context', () => {
            assertNodes('parent::node()', doc, []);
        });

        it('works with a documentElement context', () => {
            assertNodes('parent::node()', doc.documentElement, [doc]);
        });

        it('works with an element context', () => {
            assertNodes(
                'parent::node()',
                doc.getElementById('testStepAxisNodeElement'),
                [doc.getElementById('StepAxisCase')]
            );
        });

        it('works with an attribute context', () => {
            assertNodes('parent::node()', h.getNodeAttribute(), [
                doc.getElementById('testStepAxisNodeAttribute'),
            ]);
        });

        it('works with a CData context', () => {
            assertNodes('parent::node()', h.getNodeCData(), [
                doc.getElementById('testStepAxisNodeCData'),
            ]);
        });

        it('works with a comment context', () => {
            assertNodes('parent::node()', h.getNodeComment(), [
                doc.getElementById('testStepAxisNodeComment'),
            ]);
        });

        it('works with a processing instruction', () => {
            assertNodes('parent::node()', h.getNodeProcessingInstruction(), [
                doc.getElementById('testStepAxisNodeProcessingInstruction'),
            ]);
        });
    });

    describe('ancestor axis', () => {
        it('works for a cocument context', () => {
            assertNodes('ancestor::node()', doc, []);
        });

        it('works for a documentElement context', () => {
            assertNodes('ancestor::node()', doc.documentElement, [doc]);
        });

        it('works for an element context', () => {
            assertNodes(
                'ancestor::node()',
                doc.getElementById('testStepAxisNodeElement'),
                [
                    doc,
                    doc.documentElement,
                    doc.querySelector('body'),
                    doc.getElementById('StepAxisCase'),
                ]
            );
        });

        it('works for an attribute context', () => {
            assertNodes('ancestor::node()', h.getNodeAttribute(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeAttribute'),
            ]);
        });

        it('works for a CDATA context', () => {
            assertNodes('ancestor::node()', h.getNodeCData(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeCData'),
            ]);
        });

        it('works for a comment context', () => {
            assertNodes('ancestor::node()', h.getNodeComment(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeComment'),
            ]);
        });

        it('works for a processing instruction context', () => {
            assertNodes('ancestor::node()', h.getNodeProcessingInstruction(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeProcessingInstruction'),
            ]);
        });
    });

    describe('ancestor-or-self axis', () => {
        it('works for document context', () => {
            assertNodes('ancestor-or-self::node()', doc, [doc]);
        });

        it('works for documentElement context', () => {
            assertNodes('ancestor-or-self::node()', doc.documentElement, [
                doc,
                doc.documentElement,
            ]);
        });

        it('works for an element context', () => {
            assertNodes(
                'ancestor-or-self::node()',
                doc.getElementById('testStepAxisNodeElement'),
                [
                    doc,
                    doc.documentElement,
                    doc.querySelector('body'),
                    doc.getElementById('StepAxisCase'),
                    doc.getElementById('testStepAxisNodeElement'),
                ]
            );
        });

        it('works for an attribute context', () => {
            assertNodes('ancestor-or-self::node()', h.getNodeAttribute(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeAttribute'),
                h.getNodeAttribute(),
            ]);
        });

        it('works for a CDATA context', () => {
            assertNodes('ancestor-or-self::node()', h.getNodeCData(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeCData'),
                h.getNodeCData(),
            ]);
        });

        it('works for a comment context', () => {
            assertNodes('ancestor-or-self::node()', h.getNodeComment(), [
                doc,
                doc.documentElement,
                doc.querySelector('body'),
                doc.getElementById('StepAxisCase'),
                doc.getElementById('testStepAxisNodeComment'),
                h.getNodeComment(),
            ]);
        });

        it('works for processingInstruction context', () => {
            assertNodes(
                'ancestor-or-self::node()',
                h.getNodeProcessingInstruction(),
                [
                    doc,
                    doc.documentElement,
                    doc.querySelector('body'),
                    doc.getElementById('StepAxisCase'),
                    doc.getElementById('testStepAxisNodeProcessingInstruction'),
                    h.getNodeProcessingInstruction(),
                ]
            );
        });
    });

    describe('following-sibling axis', () => {
        it('works for a document context', () => {
            assertNodes('following-sibling::node()', doc, []);
        });

        it('works for a documentElement context', () => {
            assertNodes(
                'following-sibling::node()',
                doc.documentElement,
                h.followingSiblingNodes(doc.documentElement)
            );
        });

        it('works for an element: context', () => {
            assertNodes(
                'following-sibling::node()',
                doc.getElementById('testStepAxisNodeElement'),
                h.followingSiblingNodes(
                    doc.getElementById('testStepAxisNodeElement')
                )
            );
        });

        it('works for an attribute context', () => {
            assertNodes('following-sibling::node()', h.getNodeAttribute(), []);
        });

        it('works for a CDATA context', () => {
            assertNodes(
                'following-sibling::node()',
                h.getNodeCData(),
                h.followingSiblingNodes(h.getNodeCData())
            );
        });

        it('works for a comment context', () => {
            assertNodes(
                'following-sibling::node()',
                h.getNodeComment(),
                h.followingSiblingNodes(h.getNodeComment())
            );
        });

        it('works for a processing instruction', () => {
            assertNodes(
                'following-sibling::node()',
                h.getNodeProcessingInstruction(),
                h.followingSiblingNodes(h.getNodeProcessingInstruction())
            );
        });
    });

    describe('preceding-sibling axis', () => {
        it('works for a document context', () => {
            assertNodes('preceding-sibling::node()', doc, []);
        });

        it('works for a documentElement context', () => {
            assertNodes(
                'preceding-sibling::node()',
                doc.documentElement,
                h.precedingSiblingNodes(doc.documentElement)
            );
        });

        it('works for a Element context', () => {
            assertNodes(
                'preceding-sibling::node()',
                doc.getElementById('testStepAxisNodeElement'),
                h.precedingSiblingNodes(
                    doc.getElementById('testStepAxisNodeElement')
                )
            );
        });

        it('works for a Attribute context', () => {
            assertNodes('preceding-sibling::node()', h.getNodeAttribute(), []);
        });

        it('works for a CData context', () => {
            assertNodes(
                'preceding-sibling::node()',
                h.getNodeCData(),
                h.precedingSiblingNodes(h.getNodeCData())
            );
        });

        it('works for a Comment context', () => {
            assertNodes(
                'preceding-sibling::node()',
                h.getNodeComment(),
                h.precedingSiblingNodes(h.getNodeComment())
            );
        });

        it('works for a ProcessingInstruction context', () => {
            assertNodes(
                'preceding-sibling::node()',
                h.getNodeProcessingInstruction(),
                h.precedingSiblingNodes(h.getNodeProcessingInstruction())
            );
        });
    });

    describe('following axis', () => {
        it('works for a document context', () => {
            assertNodes('following::node()', doc, []);
        });

        it('works for a documentElement context', () => {
            assertNodes(
                'following::node()',
                doc.documentElement,
                h.followingNodes(doc.documentElement)
            );
        });

        it('works for an element context', () => {
            assertNodes(
                'following::node()',
                doc.getElementById('testStepAxisNodeElement'),
                h.followingNodes(doc.getElementById('testStepAxisNodeElement'))
            );
        });

        it('works for an attribute context', () => {
            assertNodes(
                'following::node()',
                h.getNodeAttribute(),
                h.followingNodes(
                    doc.getElementById('testStepAxisNodeAttribute')
                )
            );
        });

        it('works for a CDATA context', () => {
            assertNodes(
                'following::node()',
                h.getNodeCData(),
                h.followingNodes(h.getNodeCData())
            );
        });

        it('works for a comment context', () => {
            assertNodes(
                'following::node()',
                h.getNodeComment(),
                h.followingNodes(h.getNodeComment())
            );
        });

        it('works for a processing instruction context', () => {
            assertNodes(
                'following::node()',
                h.getNodeProcessingInstruction(),
                h.followingNodes(h.getNodeProcessingInstruction())
            );
        });
    });

    describe('preceding axis', () => {
        it('works for a document context', () => {
            assertNodes('preceding::node()', doc, []);
        });

        it('works for a documentElement context', () => {
            assertNodes(
                'preceding::node()',
                doc.documentElement,
                h.precedingNodes(doc.documentElement)
            );
        });

        it('works for an element context', () => {
            assertNodes(
                'preceding::node()',
                doc.getElementById('testStepAxisNodeElement'),
                h.precedingNodes(doc.getElementById('testStepAxisNodeElement'))
            );
        });

        it('works for an attribute context', () => {
            assertNodes(
                'preceding::node()',
                h.getNodeAttribute(),
                h.precedingNodes(
                    doc.getElementById('testStepAxisNodeAttribute')
                )
            );
        });

        it('works for a CDATA context', () => {
            assertNodes(
                'preceding::node()',
                h.getNodeCData(),
                h.precedingNodes(h.getNodeCData())
            );
        });

        it('works for a Comment context', () => {
            assertNodes(
                'preceding::node()',
                h.getNodeComment(),
                h.precedingNodes(h.getNodeComment())
            );
        });

        it('works for a processing instruction context', () => {
            assertNodes(
                'preceding::node()',
                h.getNodeProcessingInstruction(),
                h.precedingNodes(h.getNodeProcessingInstruction())
            );
        });
    });

    describe('attribute axis', () => {
        it('works for a document context', () => {
            assertNodes('attribute::node()', doc, []);
        });

        it('works for an attribute context', () => {
            assertNodes('attribute::node()', h.getNodeAttribute(), []);
        });

        it('works for a CDATA context', () => {
            assertNodes('attribute::node()', h.getNodeCData(), []);
        });

        it('works for a comment context', () => {
            assertNodes('attribute::node()', h.getNodeComment(), []);
        });

        it('works for a processing instruction context', () => {
            assertNodes(
                'attribute::node()',
                h.getNodeProcessingInstruction(),
                []
            );
        });

        it('works for a 0 context', () => {
            assertNodes(
                'attribute::node()',
                doc.getElementById('testStepAxisNodeAttribute0'),
                filterAttributes(
                    doc.getElementById('testStepAxisNodeAttribute0').attributes
                )
            );
        });

        it('works for a 1 context', () => {
            assertNodes(
                'attribute::node()',
                doc.getElementById('testStepAxisNodeAttribute1'),
                filterAttributes(
                    doc.getElementById('testStepAxisNodeAttribute1').attributes
                )
            );
        });

        it('works for a 3: context', () => {
            assertNodes(
                'attribute::node()',
                doc.getElementById('testStepAxisNodeAttribute3'),
                filterAttributes(
                    doc.getElementById('testStepAxisNodeAttribute3').attributes
                )
            );
        });

        it('works for a StartXml context', () => {
            assertNodes(
                'attribute::node()',
                doc.getElementById('testStepAxisNodeAttributeStartXml'),
                filterAttributes(
                    doc.getElementById('testStepAxisNodeAttributeStartXml')
                        .attributes
                )
            );
        });
    });
});

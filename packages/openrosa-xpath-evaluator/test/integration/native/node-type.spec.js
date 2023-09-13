const { initDoc, assertNodes } = require('../helpers');

describe('node-type', () => {
    let doc;
    beforeEach(() => {
        doc = initDoc(`
      <div id="StepNodeTestNodeTypeCase">
        some text
        <div></div>
        <div>
          <div></div>
        </div>
        <!-- comment --><!-- comment -->
        asdf
        asdfsdf sdf
        <div></div>
        <?xml-stylesheet type="text/xml" href="test.xsl"?>
        <div></div>
        sdfsdf
        <![CDATA[aa<strong>some text</strong>]]>
        <!-- comment -->
        <div></div>
        <?custom-process-instruct type="text/xml" href="test.xsl"?>
        <div></div>
      </div>`);
    });

    it('"node" is supported', () => {
        const node = doc.getElementById('StepNodeTestNodeTypeCase');
        assertNodes('child::node()', node, node.childNodes);
    });

    it('"text" is supported', () => {
        const node = doc.getElementById('StepNodeTestNodeTypeCase');
        const nodes = [];

        for (let i = 0; i < node.childNodes.length; i++) {
            const { nodeType } = node.childNodes[i];

            if (
                // text
                nodeType === 3 ||
                // cdata
                nodeType === 4
            ) {
                nodes.push(node.childNodes[i]);
            }
        }
        assertNodes('child::text()', node, nodes);
    });

    it('"comment" is supported', () => {
        const node = doc.getElementById('StepNodeTestNodeTypeCase');
        const nodes = [];
        let i;

        for (i = 0; i < node.childNodes.length; i++) {
            // comment
            if (node.childNodes[i].nodeType === 8) {
                nodes.push(node.childNodes[i]);
            }
        }
        assertNodes('child::comment()', node, nodes);
    });

    it('"processing-instruction any" is supported', () => {
        const node = doc.getElementById('StepNodeTestNodeTypeCase');
        const nodes = [];
        let i;

        for (i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i].nodeType === 7) {
                // processing instruction
                nodes.push(node.childNodes[i]);
            }
        }

        assertNodes('child::processing-instruction()', node, nodes);
    });

    it('"processing-instruction specific" is supported', () => {
        const node = doc.getElementById('StepNodeTestNodeTypeCase');
        const nodes = [];
        let i;

        for (i = 0; i < node.childNodes.length; i++) {
            if (
                // processing instruction
                node.childNodes[i].nodeType === 7 &&
                node.childNodes[i].nodeName === 'custom-process-instruct'
            ) {
                nodes.push(node.childNodes[i]);
            }
        }
        assertNodes(
            "child::processing-instruction('custom-process-instruct')",
            node,
            nodes
        );
    });
});

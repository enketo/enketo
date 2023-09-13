const { initDoc, assertThrow, assertTrue, assertFalse } = require('../helpers');

describe('lang functions', () => {
    let doc;
    beforeEach(() => {
        doc = initDoc(`
      <!DOCTYPE html>
      <html xml:lang="en-US" xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://some-namespace.com/nss">
        <body class="yui3-skin-sam" id="body">
          <div id="testLang" xml:lang="pt-BR">
            <div lang="fr">
              <div id="testLang2"></div>
            </div>
            <div id="testLang3" xml:lang="sl"></div>
            <div id="testLang4"></div>
          </div>
        </body>
      </html>
    `);
    });

    it('lang()', () => {
        assertTrue(doc.documentElement, null, "lang('en')");
        assertTrue(doc.documentElement, null, "lang('EN')");
        assertTrue(doc.documentElement, null, "lang('EN-us')");
        assertFalse(doc.documentElement, null, "lang('EN-us-boont')");
    });

    describe('hierarchy check', () => {
        it('should work on nodes', () => {
            let node = doc.querySelector('body');
            assertTrue(node, null, "lang('EN')");

            node = doc.getElementById('testLang2');
            assertTrue(node, null, "lang('pt')");
            assertTrue(node, null, "lang('pt-BR')");
            assertFalse(node, null, "lang('fr')");

            node = doc.getElementById('testLang3');
            assertTrue(node, null, "lang('sl')");
        });
    });

    it('lang() fails when too few arguments are provided', () => {
        assertThrow('lang()');
    });

    it('lang() fails when too many arguments are provided', () => {
        assertThrow('lang(1, 2)');
    });
});

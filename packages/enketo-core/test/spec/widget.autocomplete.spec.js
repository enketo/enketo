import AutocompleteWidget from '../../src/widget/select-autocomplete/autocomplete';
import { testStaticProperties } from '../helpers/test-widget';

testStaticProperties(AutocompleteWidget);

describe('AutocompleteWidget security', () => {
    it('does not inject HTML attributes from a malicious list ID (DEV-2341)', () => {
        // A list attribute value containing a double-quote and event handler,
        // as would result from a hostile XForm nodeset after transformation.
        const maliciousListId = '" onclick="alert(1)';
        // &quot; is needed so createContextualFragment parses the test fragment
        // correctly. getAttribute('list') decodes it back to the raw string with
        // the literal double-quote, which is what the widget actually receives —
        // mirroring the XSLT serialiser output parsed by the browser at runtime.
        const escapedId = maliciousListId.replace(/"/g, '&quot;');

        const fragment = document.createRange().createContextualFragment(`
            <label class="question">
                <input type="text" name="/data/node" list="${escapedId}" />
                <datalist id="${escapedId}"></datalist>
            </label>`);

        const control = fragment.querySelector('input[list]');
        // Confirm the widget receives the decoded, raw malicious value.
        if (control.getAttribute('list') !== maliciousListId) {
            throw new Error(
                'Test setup error: list attribute was not decoded correctly'
            );
        }

        const widget = new AutocompleteWidget(control);
        const fakeInput = widget.question.querySelector('input.autocomplete');
        // The fake input must exist and must NOT have an injected onclick attribute.
        expect(fakeInput).to.not.equal(null);
        expect(fakeInput.hasAttribute('onclick')).to.equal(false);
        // The list attribute must be present.
        expect(fakeInput.hasAttribute('list')).to.equal(true);
    });
});

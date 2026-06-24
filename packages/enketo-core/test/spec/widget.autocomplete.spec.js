import AutocompleteWidget from '../../src/widget/select-autocomplete/autocomplete';
import { testStaticProperties } from '../helpers/test-widget';

testStaticProperties(AutocompleteWidget);

describe('AutocompleteWidget security', () => {
    it('does not inject HTML attributes from a malicious list ID (DEV-2341)', (done) => {
        // A list attribute value containing a double-quote and event handler,
        // as would result from a hostile XForm nodeset after transformation.
        const maliciousListId = '" onclick="alert(1)';

        const fragment = document.createRange().createContextualFragment(`
            <label class="question">
                <input type="text" name="/data/node" list="${maliciousListId.replace(/"/g, '&quot;')}" />
                <datalist id="${maliciousListId.replace(/"/g, '&quot;')}"></datalist>
            </label>`);

        const control = fragment.querySelector('input[list]');

        Promise.resolve()
            .then(() => new AutocompleteWidget(control))
            .then((widget) => {
                const fakeInput =
                    widget.question.querySelector('input.autocomplete');
                // The fake input must exist and must NOT have an injected onclick attribute.
                expect(fakeInput).to.not.equal(null);
                expect(fakeInput.hasAttribute('onclick')).to.equal(false);
                // The list attribute must hold the literal (safe) value, not break out.
                expect(fakeInput.getAttribute('list')).to.equal(
                    maliciousListId
                );
            })
            .then(done, done);
    });
});

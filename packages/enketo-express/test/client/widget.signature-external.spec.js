import SignatureWidget from '../../widget/signature-external/signature-external';

const range = document.createRange();

describe('External Signature Widget instantiation', () => {
    const html = `
        <fieldset class="question simple-select ">
            <fieldset>
                <legend>
                    <span lang="" class="question-label active">enter</span>
                </legend>
                <div class="option-wrapper">
                    <label class="">
                        <input type="checkbox" name="/data/f" value="agreed"
                            data-oc-external="signature" data-type-xml="string" maxlength="3999">
                        <span lang="" class="option-label active">Agreed</span>
                    </label>
                </div>
            </fieldset>
        </fieldset>
        `;

    it('instantiates with correct question type and external attribute value', () => {
        const fragment = range.createContextualFragment(html);
        const control = fragment.querySelector('input');
        expect(control.matches(SignatureWidget.selector)).to.equal(true);
    });

    it('does not instantiate if there is more than 1 option', () => {
        const fragment = range.createContextualFragment(html);
        const label = fragment.querySelector('.option-wrapper label');
        const secondOption = label.cloneNode(true);
        secondOption.querySelector('input').value = 'Disagreed';
        fragment.querySelector('.option-wrapper').append(secondOption);
        const control = fragment.querySelector('input');
        expect(control.matches(SignatureWidget.selector)).to.equal(false);
    });

    it('does not instantiate for unsupported question types: text, number and radiobutton', () => {
        const fragment = range.createContextualFragment(html);
        const control = fragment.querySelector('input');
        ['text', 'number', 'radiobutton'].forEach((type) => {
            control.setAttribute('type', type);
            expect(control.matches(SignatureWidget.selector)).to.equal(false);
        });
    });

    it('does not instantiate for unsupported external attributes', () => {
        const fragment = range.createContextualFragment(html);
        const control = fragment.querySelector('input');
        control.removeAttribute('data-oc-external');
        expect(control.matches(SignatureWidget.selector)).to.equal(false);
        control.setAttribute('data-oc-external', 'clinicaldata');
        expect(control.matches(SignatureWidget.selector)).to.equal(false);
    });
});

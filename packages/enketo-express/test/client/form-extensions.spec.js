import { Form } from '../../public/js/src/module/form';
import forms from './forms/forms';
import '../../public/js/src/module/form-model';

const range = document.createRange();

const loadForm = (filename) => {
    const strings = forms[filename];
    const formEl = range
        .createContextualFragment(`<div>${strings.html_form}</div>`)
        .querySelector('form');

    return new Form(formEl, {
        modelStr: strings.xml_model,
    });
};

describe('Extended Form Class', () => {
    let form;

    beforeEach(() => {
        form = loadForm('relevant_constraint_required.xml');
        form.init();
    });

    // Test if the Form class has been extended
    // There have been issues in the passed where the loading order in karma.conf.js was changed
    // and the ESBuild config was changed that silently broke OpenClinica's extensions.
    it('has a custom property to indicate extensions were added successfully', () => {
        expect(form.extendedBy).to.equal('OpenClinica');
    });

    it('has multiple additions to the evaluation cascade', () => {
        expect(form.evaluationCascadeAdditions.length).to.equal(2);
    });

    it('so that Form instance has multiple invalid constraint classes', () => {
        expect(form.constraintClassesInvalid.length).to.be.above(1);
    });

    it('so that Form prototype has multiple invalid constraint classes', () => {
        expect(Form.prototype.constraintClassesInvalid.length).to.be.above(1);
    });
});

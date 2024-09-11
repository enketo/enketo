import Mediapicker from '../../src/widget/select-media/select-media';
import { testStaticProperties } from '../helpers/test-widget';

testStaticProperties(Mediapicker);

const FORM = `<fieldset class="question or-appearance-columns-2 or-appearance-no-buttons ">
        <fieldset>
            <legend>
                <span lang="" class="question-label active">Label</span>
            </legend>
            <div class="option-wrapper">
                <label class="">
                    <input type="radio" name="/widgets/select_widgets/grid_2_columns" data-name="/widgets/select_widgets/grid_2_columns" value="a" data-type-xml="select1">
                    <span lang="default" class="option-label active">some option label</span>
                    <img lang="default" class="active" src="/media/get/https/api.ona.io/enketo/xformsMedia/68781/139078.jpg" alt="image">
                </label>
                <label class=""><input type="radio" name="/widgets/select_widgets/grid_2_columns" data-name="/widgets/select_widgets/grid_2_columns" value="b" data-type-xml="select1">
                    <span lang="default" class="option-label active">some option label</span>
                    <img lang="default" class="active" src="/media/get/https/api.ona.io/enketo/xformsMedia/68781/139079.jpg" alt="image">
                </label>
            </div>
        </fieldset>
    </fieldset>`;

describe('custom tests for media picker re.', () => {
    it('adds mask-date class and changes input type to text', () => {
        const fragment = document.createRange().createContextualFragment(FORM);
        const question = fragment.querySelector('.question');
        new Mediapicker(question);

        const textLabels = question.querySelectorAll('span.option-label');
        expect(textLabels[0].style.display).to.equal('none');
        expect(textLabels[1].style.display).to.equal('none');
    });
});

const FORM2 = `<fieldset class="question or-appearance-no-buttons or-appearance-likert">
        <fieldset>
            <legend>
                <span
                    lang="fr"
                    class="question-label active"
                    data-itext-id="/data/satis_logistique:label"
                    >Globalement, quel est votre degré de satisfaction par
                    rapport à la logistique (salle où s'est tenue l'activité,
                    restauration, communication avant l'atelier, etc.) ?</span
                ><audio
                    controls="controls"
                    lang="fr"
                    class="active"
                    src="jr://audio/Question_10.mp4"
                    data-itext-id="/data/satis_logistique:label"
                >
                    Your browser does not support HTML5 audio.</audio
                ><span
                    lang="wl"
                    class="question-label"
                    data-itext-id="/data/satis_logistique:label"
                    >Globalement, quel est votre degré de satisfaction par
                    rapport à la logistique (salle où s'est tenue l'activité,
                    restauration, communication avant l'atelier, etc.) ?</span
                ><audio
                    controls="controls"
                    lang="wl"
                    src="jr://audio/Question_10.mp4"
                    data-itext-id="/data/satis_logistique:label"
                >
                    Your browser does not support HTML5 audio.
                </audio>
            </legend>
            <div class="option-wrapper">
                <label
                    class="itemset-template"
                    data-items-path="instance('satis')/root/item"
                    ><input
                        type="radio"
                        name="/data/satis_logistique"
                        data-name="/data/satis_logistique"
                        data-type-xml="string"
                        value="" /></label
                    ><span
                    class="itemset-labels"
                    data-value-ref="name"
                    data-label-type="itext"
                    data-label-ref="itextId"
                    ><span
                        lang="fr"
                        class="option-label active"
                        data-itext-id="satis-3"
                        >Plutôt insatisfait.e</span
                    ><img
                        lang="fr"
                        class="active option-label"
                        src="jr://images/mecontent.jpg"
                        data-itext-id="satis-3"
                        alt="image"
                    /><span
                        lang="wl"
                        class="option-label"
                        data-itext-id="satis-3"
                        >Plutôt insatisfait.e</span
                    ><img
                        lang="wl"
                        class="option-label"
                        src="jr://images/mecontent.jpg"
                        data-itext-id="satis-3"
                        alt="image"
                    />
                </span>
            </div>
        </fieldset>`;

describe('custom tests for media picker re.', () => {
    it('show img options correctly', () => {
        const fragment = document.createRange().createContextualFragment(FORM2);
        const question = fragment.querySelector('.question');
        new Mediapicker(question);

        const textLabels = question.querySelectorAll('span.option-label');
        expect(textLabels[0].style.display).to.equal('none');
        expect(textLabels[1].style.display).to.equal('none');

        const imgLabels = question.querySelectorAll('img');
        expect(imgLabels[0].style.display).to.equal('');
        expect(imgLabels[1].style.display).to.equal('');
    });
});

import Widget from 'enketo-core/src/js/widget';
import events from '../../public/js/src/module/event';

class ExternalSignatureWidget extends Widget {
    static get selector() {
        return '.simple-select label:only-child input[type="checkbox"][data-oc-external="signature"]';
    }

    _init() {
        this.element.addEventListener(events.XFormsValueChanged().type, () => {
            if (this.element.checked) {
                this.element.dispatchEvent(events.SignatureRequested());
            }
        });
    }
}

export default ExternalSignatureWidget;

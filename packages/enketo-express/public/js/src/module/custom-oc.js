// Custom OC things used across views
import events from './event';

const range = document.createRange();

function addSignedStatus(form) {
    const metaPlus = `/*/meta/${form.model.getNamespacePrefix(
        'http://openclinica.org/xforms'
    )}:`; /* + model.getNamespacePrefix( 'http://openrosa.org/xforms' ) + ':' */
    const signature = form.model.evaluate(`${metaPlus}signature`, 'string');
    if (signature) {
        const statusEl = range.createContextualFragment(
            `<div class="record-signed-status">${signature
                .replace(/\\n/g, '<br/>')
                .replace(/\n/g, '<br/>')}</div>`
        );
        document.querySelector('#form-title').before(statusEl);

        const _changeHandler = (ev) => {
            if (!ev.target.closest('.or-appearance-dn')) {
                const status = document.querySelector('.record-signed-status');
                if (status) {
                    status.remove();
                }
                event.currentTarget.removeEventListener(
                    events.XFormsValueChanged().type,
                    _changeHandler
                );
            }
        };

        form.view.html.addEventListener(
            events.XFormsValueChanged().type,
            _changeHandler
        );
    }
}

export default {
    addSignedStatus,
};

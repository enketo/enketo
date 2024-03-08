import $ from 'jquery';

$(document).keydown((e) => {
    if (e.key === 'Tab') {
        const currentFocus = $(':focus');
        if (currentFocus.is('input[type=radio]')) {
            const name = currentFocus.attr('name');
            const allRadiosSameName = $(`input[type=radio][name="${name}"]`);
            const currentRadio = allRadiosSameName.index(currentFocus);
            let nextRadio;
            if (!e.shiftKey) {
                nextRadio = allRadiosSameName[currentRadio + 1];
            } else {
                nextRadio = allRadiosSameName[currentRadio - 1];
            }
            if (nextRadio) {
                nextRadio.focus();
                e.preventDefault();
            }
        }
    }
});

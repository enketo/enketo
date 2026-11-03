import { Form } from '../../src/js/form';

const modelStr =
    '<model><instance><data id="media"><a/><meta><instanceID/></meta></data></instance></model>';

/**
 * @param {string} labelMedia - media element(s) to add to the question label
 */
const createForm = (labelMedia) => {
    const formEl = document
        .createRange()
        .createContextualFragment(
            `<div><form class="or"><label class="question non-select"><span lang="" class="question-label active">A</span>${labelMedia}<input type="text" name="/data/a" data-type-xml="string"/></label></form></div>`
        )
        .querySelector('form');

    return new Form(formEl, { modelStr });
};

class FakeIntersectionObserver {
    /** @type {FakeIntersectionObserver[]} */
    static instances = [];

    constructor(callback) {
        this.callback = callback;
        this.targets = new Set();
        FakeIntersectionObserver.instances.push(this);
    }

    observe(target) {
        this.targets.add(target);
    }

    unobserve(target) {
        this.targets.delete(target);
    }

    disconnect() {
        this.targets.clear();
    }

    intersect(target) {
        this.callback([{ isIntersecting: true, target }]);
    }
}

describe('Label media', () => {
    const { IntersectionObserver } = window;

    /** @type {FakeIntersectionObserver} */
    let observer;

    beforeEach(() => {
        FakeIntersectionObserver.instances = [];
        window.IntersectionObserver = FakeIntersectionObserver;
    });

    afterEach(() => {
        window.IntersectionObserver = IntersectionObserver;
    });

    const initForm = (labelMedia) => {
        const form = createForm(labelMedia);

        form.init();
        [observer] = FakeIntersectionObserver.instances;

        return form;
    };

    it('does not preload media from forms transformed without a preload attribute', () => {
        const form = initForm(
            '<audio controls="controls" src="a.mp3" data-itext-id="/data/a:label"></audio>'
        );
        const audio = form.view.html.querySelector('audio');

        expect(audio.preload).to.equal('none');
        expect(observer.targets.has(audio)).to.equal(true);
    });

    it('loads metadata once a media element becomes visible', () => {
        const form = initForm(
            '<audio controls="controls" preload="none" src="a.mp3" data-itext-id="/data/a:label"></audio><video controls="controls" preload="none" src="a.mp4" data-itext-id="/data/a:label"></video>'
        );
        const audio = form.view.html.querySelector('audio');
        const video = form.view.html.querySelector('video');

        observer.intersect(audio);

        expect(audio.preload).to.equal('metadata');
        expect(observer.targets.has(audio)).to.equal(false);
        expect(video.preload).to.equal('none');
        expect(observer.targets.has(video)).to.equal(true);
    });

    it('leaves media that is not a label attachment alone', () => {
        const form = initForm(
            '<audio controls="controls" src="recording.mp3"></audio>'
        );
        const audio = form.view.html.querySelector('audio');

        expect(audio.hasAttribute('preload')).to.equal(false);
        expect(observer.targets.has(audio)).to.equal(false);
    });

    it('observes media that is added later', async () => {
        const form = initForm('');
        const audio = document.createElement('audio');

        audio.dataset.itextId = '/data/a:label';
        form.view.html.querySelector('.question').append(audio);

        await new Promise((resolve) => {
            setTimeout(resolve);
        });

        expect(audio.preload).to.equal('none');
        expect(observer.targets.has(audio)).to.equal(true);
    });

    it('stops observing when the view is reset', () => {
        const form = initForm(
            '<audio controls="controls" preload="none" src="a.mp3" data-itext-id="/data/a:label"></audio>'
        );

        document.body.append(form.view.html);
        form.resetView().remove();

        expect(observer.targets.size).to.equal(0);
    });
});

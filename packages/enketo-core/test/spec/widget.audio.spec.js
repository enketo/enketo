import AudioWidget from '../../src/widget/audio/audio';
import {
    testStaticProperties,
    testRequiredMethods,
    testBasicInstantiation,
} from '../helpers/test-widget';

const FORM = `<form class="or">
        <label class="question">
            <input name="/data/audio" type="file" data-type-xml="binary" accept="audio/*" />
        </label>
        <input />
    </form>`;

testStaticProperties(AudioWidget);
testRequiredMethods(AudioWidget);
testBasicInstantiation(AudioWidget, FORM);

describe('AudioWidget', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    function createWidget(formHtml = FORM) {
        const fragment = document
            .createRange()
            .createContextualFragment(formHtml);
        const control = fragment.querySelector(AudioWidget.selector);
        const widget = new AudioWidget(control);
        return { widget, control };
    }

    describe('selector', () => {
        it('matches audio/* inputs that are not draw/signature/annotate', () => {
            const { control } = createWidget();
            expect(control).not.to.equal(null);
        });

        it('does not match audio/* inputs inside or-appearance-draw', () => {
            const form = FORM.replace(
                'class="question"',
                'class="question or-appearance-draw"'
            );
            const fragment = document
                .createRange()
                .createContextualFragment(form);
            const control = fragment.querySelector(AudioWidget.selector);
            expect(control).to.equal(null);
        });

        it('does not match audio/* inputs inside or-appearance-signature', () => {
            const form = FORM.replace(
                'class="question"',
                'class="question or-appearance-signature"'
            );
            const fragment = document
                .createRange()
                .createContextualFragment(form);
            const control = fragment.querySelector(AudioWidget.selector);
            expect(control).to.equal(null);
        });

        it('does not match audio/* inputs inside or-appearance-annotate', () => {
            const form = FORM.replace(
                'class="question"',
                'class="question or-appearance-annotate"'
            );
            const fragment = document
                .createRange()
                .createContextualFragment(form);
            const control = fragment.querySelector(AudioWidget.selector);
            expect(control).to.equal(null);
        });
    });

    describe('initialisation', () => {
        it('hides the original input element', () => {
            const { control } = createWidget();
            expect(control.classList.contains('hidden')).to.equal(true);
        });

        it('marks the element with data-audio attribute', () => {
            const { control } = createWidget();
            expect(control.dataset.audio).to.equal('true');
        });

        it('changes the input type to text', () => {
            const { control } = createWidget();
            expect(control.type).to.equal('text');
        });

        it('renders the action-select step by default', () => {
            const { widget } = createWidget();
            const actionSelect = widget.question.querySelector(
                '.step-action-select'
            );
            expect(actionSelect).not.to.equal(null);
        });

        it('renders a record button', () => {
            const { widget } = createWidget();
            const btn = widget.question.querySelector('.btn-record');
            expect(btn).not.to.equal(null);
        });

        it('renders an upload button', () => {
            const { widget } = createWidget();
            const btn = widget.question.querySelector('.btn-upload');
            expect(btn).not.to.equal(null);
        });

        it('falls back to action-select step when existing file cannot be loaded', (done) => {
            const form = FORM.replace(
                'accept="audio/*"',
                'accept="audio/*" data-loaded-file-name="existing.webm"'
            );
            const fragment = document
                .createRange()
                .createContextualFragment(form);
            const control = fragment.querySelector(AudioWidget.selector);
            const widget = new AudioWidget(control);

            Promise.resolve()
                .then(() => {
                    const actionSelect = widget.question.querySelector(
                        '.step-action-select'
                    );
                    expect(actionSelect).not.to.equal(null);
                })
                .then(done, done);
        });
    });

    describe('postFixFilename()', () => {
        it('each widget instance produces a validly postfixed name independently', () => {
            const { widget: widget1 } = createWidget();
            const { widget: widget2 } = createWidget();
            const name1 = widget1.postFixFilename('same-name-test.webm');
            const name2 = widget2.postFixFilename('same-name-test.webm');
            expect(name1).to.match(/^same-name-test-\d{8}_\d{6}\.webm$/);
            expect(name2).to.match(/^same-name-test-\d{8}_\d{6}\.webm$/);
        });

        it('adds a timestamp postfix before the file extension', () => {
            const { widget } = createWidget();
            const result = widget.postFixFilename('my-audio.mp3');
            // Should match: my-audio-YYYYMMDD_HHMMSS.mp3
            expect(result).to.match(/^my-audio-\d{8}_\d{6}\.mp3$/);
        });

        it('works for filenames with multiple dots', () => {
            const { widget } = createWidget();
            const result = widget.postFixFilename('my.audio.file.mp3');
            expect(result).to.match(/^my\.audio\.file-\d{8}_\d{6}\.mp3$/);
        });

        it('always produces a validly postfixed name regardless of when called', () => {
            const { widget } = createWidget();
            const a = widget.postFixFilename('recording.webm');
            const b = widget.postFixFilename('recording.webm');
            expect(a).to.match(/^recording-\d{8}_\d{6}\.webm$/);
            expect(b).to.match(/^recording-\d{8}_\d{6}\.webm$/);
        });

        it('produces a name that differs from the original', () => {
            const { widget } = createWidget();
            const original = 'same-name-test.webm';
            const result = widget.postFixFilename(original);
            expect(result).not.to.equal(original);
        });

        it('produces names that do not collide when called at different times', (done) => {
            const { widget } = createWidget();

            const first = widget.postFixFilename('same-name-test.webm');
            // Wait at least one second to guarantee a different timestamp
            setTimeout(() => {
                const second = widget.postFixFilename('same-name-test.webm');
                expect(first).not.to.equal(second);
                done();
            }, 1100);
        });
    });

    describe('getFileName()', () => {
        it('derives a name from the field path', () => {
            const { widget } = createWidget();
            const name = widget.getFileName();
            // The control has name="/data/audio", so the base should be "audio"
            expect(name).to.match(/^audio-\d{8}_\d{6}\.webm$/);
        });

        it('appends a .webm extension', () => {
            const { widget } = createWidget();
            expect(widget.getFileName()).to.match(/\.webm$/);
        });
    });

    describe('uploading a file', () => {
        it('applies a timestamp postfix to the uploaded filename', (done) => {
            const { widget, control } = createWidget();

            const file = new File(['audio data'], 'same-name-test.webm', {
                type: 'audio/webm',
            });

            control.type = 'file';
            const postFixSpy = sandbox.spy(widget, 'postFixFilename');

            Object.defineProperty(control, 'files', {
                get: () => ({ 0: file, length: 1 }),
                configurable: true,
            });

            control.dispatchEvent(new Event('change', { bubbles: true }));

            // The handler calls FileReader (macrotask), so setTimeout drains microtasks first
            setTimeout(() => {
                expect(postFixSpy.calledOnce).to.equal(true);
                expect(postFixSpy.firstCall.args[0]).to.equal(
                    'same-name-test.webm'
                );
                expect(widget.fileName).to.match(
                    /^same-name-test-\d{8}_\d{6}\.webm$/
                );
                done();
            }, 0);
        });

        it('sets originalInputValue to the postfixed filename after upload', (done) => {
            const { widget, control } = createWidget();

            const file = new File(['audio data'], 'test-upload.mp3', {
                type: 'audio/mpeg',
            });

            control.type = 'file';

            Object.defineProperty(control, 'files', {
                get: () => ({ 0: file, length: 1 }),
                configurable: true,
            });

            control.dispatchEvent(new Event('change', { bubbles: true }));

            // FileReader is macrotask-based; setTimeout ensures all async work completes
            setTimeout(() => {
                expect(widget.originalInputValue).to.match(
                    /^test-upload-\d{8}_\d{6}\.mp3$/
                );
                done();
            }, 0);
        });

        it('resets element type to text after upload', (done) => {
            const { widget, control } = createWidget();

            const file = new File(['audio data'], 'test.webm', {
                type: 'audio/webm',
            });

            control.type = 'file';

            Object.defineProperty(control, 'files', {
                get: () => ({ 0: file, length: 1 }),
                configurable: true,
            });

            control.dispatchEvent(new Event('change', { bubbles: true }));

            // FileReader is macrotask-based; setTimeout ensures all async work completes
            setTimeout(() => {
                expect(control.type).to.equal('text');
                done();
            }, 0);
        });
    });

    describe('value getter / setter', () => {
        it('returns empty string when no audio has been set', () => {
            const { widget } = createWidget();
            expect(widget.value).to.equal('');
        });

        it('stores and retrieves a data URL via data-cache', () => {
            const { widget, control } = createWidget();
            const fakeDataUrl = 'data:audio/webm;base64,AAAA';
            widget.value = fakeDataUrl;
            expect(widget.value).to.equal(fakeDataUrl);
            expect(control.dataset.cache).to.equal(fakeDataUrl);
        });

        it('clears data-cache when set to null/falsy', () => {
            const { widget, control } = createWidget();
            widget.value = 'data:audio/webm;base64,AAAA';
            widget.value = null;
            expect(control.dataset.cache).to.equal('');
        });
    });

    describe('validate()', () => {
        it('sets a validation error when recording is in progress', () => {
            const { widget } = createWidget();

            sandbox.stub(widget.audioRecorder, 'isRecording').returns(true);
            sandbox.stub(widget.audioRecorder, 'isPaused').returns(false);

            // Stub to avoid hitting the DOM (no .custom-error-msg in test form)
            const setValidationStub = sandbox.stub(
                widget,
                'setValidationError'
            );
            widget.validate();

            expect(setValidationStub.calledOnce).to.equal(true);
        });

        it('sets a validation error when recording is paused', () => {
            const { widget } = createWidget();

            sandbox.stub(widget.audioRecorder, 'isRecording').returns(false);
            sandbox.stub(widget.audioRecorder, 'isPaused').returns(true);

            const setValidationStub = sandbox.stub(
                widget,
                'setValidationError'
            );
            widget.validate();

            expect(setValidationStub.calledOnce).to.equal(true);
        });

        it('does not set a validation error when idle', () => {
            const { widget } = createWidget();

            sandbox.stub(widget.audioRecorder, 'isRecording').returns(false);
            sandbox.stub(widget.audioRecorder, 'isPaused').returns(false);

            const setValidationStub = sandbox.stub(
                widget,
                'setValidationError'
            );
            widget.validate();

            expect(setValidationStub.called).to.equal(false);
        });
    });

    describe('beforeSubmit()', () => {
        it('rejects when a recording is in progress', (done) => {
            const { widget } = createWidget();

            sandbox.stub(widget.audioRecorder, 'isRecording').returns(true);
            sandbox.stub(widget.audioRecorder, 'isPaused').returns(false);

            widget
                .beforeSubmit()
                .then(() => done(new Error('Expected rejection')))
                .catch((err) => {
                    expect(err).to.be.instanceof(Error);
                    done();
                });
        });

        it('rejects when a recording is paused', (done) => {
            const { widget } = createWidget();

            sandbox.stub(widget.audioRecorder, 'isRecording').returns(false);
            sandbox.stub(widget.audioRecorder, 'isPaused').returns(true);

            widget
                .beforeSubmit()
                .then(() => done(new Error('Expected rejection')))
                .catch((err) => {
                    expect(err).to.be.instanceof(Error);
                    done();
                });
        });

        it('resolves when idle', (done) => {
            const { widget } = createWidget();

            sandbox.stub(widget.audioRecorder, 'isRecording').returns(false);
            sandbox.stub(widget.audioRecorder, 'isPaused').returns(false);

            widget.beforeSubmit().then(done, done);
        });
    });

    describe('upload button', () => {
        it('changes input type to file when clicked', () => {
            const { widget, control } = createWidget();
            const uploadBtn = widget.question.querySelector('.btn-upload');
            uploadBtn.click();
            expect(control.type).to.equal('file');
        });
    });

    describe('showActionSelectStep()', () => {
        it('clears the current value', (done) => {
            const { widget } = createWidget();

            widget.value = 'data:audio/webm;base64,AAAA';
            widget.showActionSelectStep();

            // showActionSelectStep is synchronous but calls updateValue() without
            // awaiting it; setTimeout drains all queued microtasks before asserting
            setTimeout(() => {
                expect(widget.value).to.equal('');
                done();
            }, 0);
        });

        it('resets the input type to text', () => {
            const { widget, control } = createWidget();
            // Force type to file first
            control.type = 'file';
            widget.showActionSelectStep();
            expect(control.type).to.equal('text');
        });
    });
});

import BackgroundAudioWidget from '../../src/widget/background-audio/background-audio';
import AudioRecorder from '../../src/js/audio-recorder/audio-recorder';
import dialog from '../../src/js/fake-dialog';
import fileManager from '../../src/js/file-manager';
import { waitFor } from '../helpers/wait-for';

const FORM = `<form class="or">
        <label class="question">
            <input name="/data/background_audio" type="file" data-type-xml="binary" data-background-audio="true" />
        </label>
    </form>`;

describe('BackgroundAudioWidget', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;
    let form;
    let audioContext;
    let state;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        state = 'inactive';

        sandbox.stub(dialog, 'alert').resolves();
        sandbox.stub(AudioRecorder.prototype, 'requestPermissions').resolves();
        sandbox
            .stub(AudioRecorder.prototype, 'startRecording')
            .callsFake(async () => {
                state = 'recording';
            });
        sandbox
            .stub(AudioRecorder.prototype, 'stopRecording')
            .callsFake(async () => {
                state = 'inactive';
            });
        sandbox
            .stub(AudioRecorder.prototype, 'getRecordedFile')
            .resolves(new Blob(['audio'], { type: 'audio/webm' }));
        sandbox
            .stub(AudioRecorder.prototype, 'isRecording')
            .callsFake(() => state === 'recording');
        sandbox
            .stub(AudioRecorder.prototype, 'isPaused')
            .callsFake(() => state === 'paused');

        audioContext = {
            createMediaStreamSource: () => ({ connect() {} }),
            createAnalyser: () => ({
                frequencyBinCount: 16,
                getByteFrequencyData() {},
            }),
            close: sandbox.stub().resolves(),
        };
        sandbox.stub(window, 'AudioContext').returns(audioContext);

        form = document
            .createRange()
            .createContextualFragment(FORM)
            .querySelector('form');
        document.body.append(form);
    });

    afterEach(() => {
        form.remove();
        document.querySelector('.background-audio-widget')?.remove();
        sandbox.restore();
    });

    const createRecordingWidget = async () => {
        const control = form.querySelector(BackgroundAudioWidget.selector);
        const widget = new BackgroundAudioWidget(control);
        await waitFor(() => state === 'recording' && widget.audioContext);

        return { widget, control };
    };

    it('stores the recording as a Blob that the file manager can obtain', async () => {
        const { widget, control } = await createRecordingWidget();

        await widget.beforeSubmit();

        expect(control.dataset.cache).to.equal(undefined);
        expect(widget.value).to.be.instanceOf(Blob);

        const [file] = fileManager.getCurrentFiles();
        expect(file.name).to.match(/^background_audio-\d{8}_\d{6}\.webm$/);
        expect(file.type).to.equal('audio/webm');
        expect(await file.text()).to.equal('audio');
    });

    it('closes the audio context when the recording is submitted', async () => {
        const { widget } = await createRecordingWidget();

        await widget.beforeSubmit();

        expect(audioContext.close.calledOnce).to.equal(true);
        expect(widget.audioContext).to.equal(null);
        expect(widget.animationFrameId).to.equal(null);
    });

    it('stops a paused recording and releases resources on cleanup', async () => {
        const { widget } = await createRecordingWidget();
        const dispose = sandbox.spy(widget.audioRecorder, 'dispose');
        state = 'paused';

        widget.cleanup();

        expect(dispose.calledOnce).to.equal(true);
        expect(audioContext.close.calledOnce).to.equal(true);
        expect(widget.animationFrameId).to.equal(null);
        expect(document.querySelector('.background-audio-widget')).to.equal(
            null
        );
    });

    it('does not start recording if cleaned up while waiting for the user', async () => {
        let confirmDisclaimer;
        dialog.alert.returns(
            new Promise((resolve) => {
                confirmDisclaimer = resolve;
            })
        );
        const control = form.querySelector(BackgroundAudioWidget.selector);
        const widget = new BackgroundAudioWidget(control);
        const dispose = sandbox.spy(widget.audioRecorder, 'dispose');

        widget.cleanup();
        confirmDisclaimer();
        await waitFor(() => dispose.callCount === 2);

        expect(AudioRecorder.prototype.startRecording.called).to.equal(false);
        expect(widget.audioContext).to.equal(undefined);
    });
});

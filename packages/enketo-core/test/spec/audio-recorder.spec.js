import AudioRecorder from '../../src/js/audio-recorder/audio-recorder';

class FakeMediaRecorder {
    constructor(stream, options) {
        this.stream = stream;
        this.options = options;
        this.mimeType = 'audio/webm';
        this.state = 'inactive';
    }

    start(timeslice) {
        this.timeslice = timeslice;
        this.state = 'recording';
        this.onstart?.();
    }

    pause() {
        this.state = 'paused';
    }

    resume() {
        this.state = 'recording';
    }

    stop() {
        this.state = 'inactive';
        setTimeout(() => {
            this.ondataavailable?.({ data: new Blob(['last chunk']) });
            this.onstop?.();
        });
    }
}

describe('AudioRecorder', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;
    let track;
    let recorder;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(window, 'MediaRecorder').value(FakeMediaRecorder);
        track = { stop: sandbox.spy() };
        recorder = new AudioRecorder();
        recorder.stream = { getTracks: () => [track] };
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('hands over recorded data periodically instead of at the end', async () => {
        await recorder.startRecording();

        expect(recorder.mediaRecorder.timeslice).to.be.a('number');
        expect(recorder.mediaRecorder.timeslice).to.be.greaterThan(0);
    });

    it('is active while recording or paused', async () => {
        expect(recorder.isActive()).to.not.be.ok;

        await recorder.startRecording();
        expect(recorder.isActive()).to.equal(true);

        recorder.pauseRecording();
        expect(recorder.isActive()).to.equal(true);

        await recorder.stopRecording();
        expect(recorder.isActive()).to.equal(false);
    });

    it('combines recorded chunks into a single file', async () => {
        await recorder.startRecording();
        recorder.mediaRecorder.ondataavailable({ data: new Blob(['a']) });
        recorder.mediaRecorder.ondataavailable({ data: new Blob(['b']) });
        await recorder.stopRecording();

        const file = await recorder.getRecordedFile();

        expect(await file.text()).to.equal('ablast chunk');
        expect(recorder.recordedChunks).to.have.length(0);
        // Getting the file again returns the same file
        expect(await recorder.getRecordedFile()).to.equal(file);
    });

    it('rejects when stopping an inactive recorder', async () => {
        let error;
        await recorder.stopRecording().catch((e) => {
            error = e;
        });

        expect(error).to.be.instanceOf(Error);
    });

    describe('dispose()', () => {
        it('stops a paused recording and releases the microphone', async () => {
            await recorder.startRecording();
            recorder.pauseRecording();

            await recorder.dispose();

            expect(recorder.mediaRecorder.state).to.equal('inactive');
            expect(track.stop.called).to.equal(true);
            expect(recorder.stream).to.equal(null);
            expect(recorder.recordedChunks).to.deep.equal([]);
        });

        it('waits for a stop in progress so its caller still gets the file', async () => {
            await recorder.startRecording();
            recorder.mediaRecorder.ondataavailable({ data: new Blob(['a']) });

            // The recorder is inactive right away, but the last chunk comes later
            const file = recorder
                .stopRecording()
                .then(() => recorder.getRecordedFile());
            expect(recorder.isActive()).to.equal(false);
            await recorder.dispose();

            expect(await (await file).text()).to.equal('alast chunk');
            expect(recorder.recordedChunks).to.deep.equal([]);
            expect(recorder.recordedFile).to.equal(null);
        });

        it('releases the microphone when no recording was started', async () => {
            await recorder.dispose();

            expect(track.stop.called).to.equal(true);
            expect(recorder.stream).to.equal(null);
        });
    });
});

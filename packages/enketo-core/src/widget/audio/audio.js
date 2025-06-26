import Widget from '../../js/widget';

/**
 * AudioWidget that works both offline and online. It abstracts the file storage/cache away
 * with the injected fileManager.
 *
 * @augments Widget
 */

const steps = ['action-select', 'recording', 'uploading', 'preview'];
class AudioWidget extends Widget {
    /**
     * @type {string}
     */

    static get selector() {
        return '.question:not(.or-appearance-draw):not(.or-appearance-signature):not(.or-appearance-annotate) input[type="file"][accept="audio/*"]';
    }

    _init() {
        const existingFileName = this.element.getAttribute(
            'data-loaded-file-name'
        );

        // this.question.classList.remove('contains-ref-target');
        // this.question.dataset.containsRefTarget = 'false';
        this.element.remove();

        // Disable the inner button click on label click
        this.question.setAttribute('for', '');

        const fragment = document.createRange().createContextualFragment(
            `<div class="widget audio-widget">
                <div class="step-action-select">
                    <div class="btn-group">
                        <button class="btn-record btn btn-primary small">
                            <i class="icon icon-volume-down"></i> Start Recording
                        </button>
                        <button class="btn-upload btn btn-default small">
                            <i class="icon icon-upload"></i> Upload audio File
                        </button>
                    </div>
                </div>
                <div class="step-recording">
                    <div class="recording-container">
                        <div class="recording-display">
                            <span class="status-dot"></span>
                            <span class="recording-time">00:00</span>
                        </div>
                        <canvas class="audio-waveform"></canvas>
                        <div class="recording-controls">
                            <button class="btn btn-icon-only btn-pause">
                                <i class="icon icon-pause"></i>
                            </button>
                            <button class="btn btn-icon-only btn-stop">
                                <i class="icon icon-stop"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="step-uploading">
                    <div class="upload-container">
                        <input type="file" accept="audio/*" class="file-input" />
                    </div>
                </div>
                <div class="step-preview">
                    <div class="preview-container">
                        <div class="audio-preview">
                            <button class="btn btn-icon-only btn-play">
                                <i class="icon icon-play"></i>
                            </button>
                            <div class="time-display">
                                <span class="time-progress">00:00 / 1:24</span>
                            </div>
                            <div class="play-progress">
                                <div class="progress-bar">
                                    <div class="progress"></div>
                                </div>
                            </div>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-icon-only btn-download">
                                <i class="icon icon-download"></i>
                            </button>
                            <button class="btn btn-icon-only btn-delete">
                                <i class="icon icon-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`
        );

        this.question.appendChild(fragment); // Append the new widget structure

        // Set up actions in steps
        this.setupActionSelectStep();
        this.setupRecordingStep();

        this.setStep(2); // Ensure we start at the action select step
    }

    setStep(index) {
        steps.forEach((step, i) => {
            const stepElement = this.question.querySelector(`.step-${step}`);
            if (stepElement) {
                stepElement.style.display = i === index ? 'block' : 'none';
            }
        });
    }

    setupActionSelectStep() {
        // This method sets up the action select step where the
        // user can choose to record or upload audio.

        const buttonRecord = this.question.querySelector(
            '.step-action-select button.btn-record'
        );
        const buttonUpload = this.question.querySelector(
            '.step-action-select button.btn-upload'
        );

        buttonRecord.addEventListener('click', () => {
            this.setStep(1); // Show recording step
            this.plotAudioForm(); // Draw the audio form
        });

        buttonUpload.addEventListener('click', () => {
            this.setStep(2); // Show uploading step
        });
    }

    setupRecordingStep() {
        // This method sets up the recording step where the user can
        // start, pause, and stop recording audio.
        const buttonPause = this.question.querySelector(
            '.step-recording button.btn-pause'
        );
        const buttonStop = this.question.querySelector(
            '.step-recording button.btn-stop'
        );

        buttonStop.addEventListener('click', () => {
            this.setStep(3); // Show preview step
        });
    }

    plotAudioForm() {
        // This method will be used to plot the waveform as a
        // feedback while recording audio.
        // Currently, it is drawing a demo random audio form.
        const canvas = this.question.querySelector('canvas.audio-waveform');

        // Fix the canvas's element size and inner drawing size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const barWidth = 4;
        const barGap = 3;

        ctx.strokeStyle = '#2095F3';
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';

        let posX = 0;
        while (posX < width) {
            const volume = Math.random();
            // barWidth is subtracted from the height to ensure the bars fit
            // vertically within the canvas due to the line cap being round.
            const barHeight = Math.max(1, volume * (height - barWidth * 2));

            ctx.beginPath();
            ctx.moveTo(
                posX + barGap + barWidth / 2,
                height / 2 - barHeight / 2
            );
            ctx.lineTo(
                posX + barGap + barWidth / 2,
                height / 2 + barHeight / 2
            );
            ctx.stroke();

            posX += barWidth + barGap;
        }
    }
}

export default AudioWidget;

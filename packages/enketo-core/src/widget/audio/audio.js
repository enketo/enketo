import Widget from '../../js/widget';

/**
 * AudioWidget that works both offline and online. It abstracts the file storage/cache away
 * with the injected fileManager.
 *
 * @augments Widget
 */

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

        const fragment = document
            .createRange()
            .createContextualFragment(
                `<div class="widget audio-widget"></div>`
            );

        this.question.appendChild(fragment); // Append the new widget structure

        this.showActionSelectStep();
    }

    setWidgetContent(fragment) {
        const widget = this.question.querySelector('.widget');
        if (!widget) {
            console.error('Widget container not found.');
            return;
        }
        widget.innerHTML = '';
        widget.appendChild(fragment);
    }

    showActionSelectStep() {
        const stepFragment = document.createRange().createContextualFragment(
            `<div class="step-action-select">
                <button class="btn-record btn btn-primary small">
                    <i class="icon icon-volume-down"></i> Start Recording
                </button>
                <button class="btn-upload btn btn-default small">
                    <i class="icon icon-upload"></i> Upload audio File
                </button>
            </div>`
        );

        const buttonRecord = stepFragment.querySelector('.btn-record');
        const buttonUpload = stepFragment.querySelector('.btn-upload');

        buttonRecord.addEventListener('click', () => {
            this.showRecordStep();
        });

        buttonUpload.addEventListener('click', () => {
            this.showUploadStep();
        });

        this.setWidgetContent(stepFragment);
    }

    showRecordStep() {
        const stepFragment = document.createRange().createContextualFragment(
            `<div class="step-recording">
                <div class="recording-container">
                    <div class="recording-display">
                        <span class="status-dot recording"></span>
                        <span class="recording-time">00:00</span>
                    </div>
                    <canvas class="audio-waveform"></canvas>
                    <div class="recording-controls">
                        <button class="btn-icon-only btn-pause">
                            <i class="icon icon-pause"></i>
                        </button>
                        <button class="btn-icon-only btn-play hidden">
                            <i class="icon icon-play"></i>
                        </button>
                        <button class="btn-icon-only btn-stop">
                            <i class="icon icon-stop"></i>
                        </button>
                    </div>
                </div>
            </div>`
        );

        const statusDot = stepFragment.querySelector('.status-dot');
        const buttonPause = stepFragment.querySelector('.btn-pause');
        const buttonPlay = stepFragment.querySelector('.btn-play');
        const buttonStop = stepFragment.querySelector('.btn-stop');

        buttonPause.addEventListener('click', () => {
            buttonPause.classList.add('hidden');
            buttonPlay.classList.remove('hidden');
            statusDot.classList.remove('recording');
        });

        buttonPlay.addEventListener('click', () => {
            buttonPlay.classList.add('hidden');
            buttonPause.classList.remove('hidden');
            statusDot.classList.add('recording');
        });

        buttonStop.addEventListener('click', () => {
            this.showPreviewStep(); // Show preview step after stopping the recording
        });

        this.setWidgetContent(stepFragment);

        this.plotAudioForm(); // Draw the audio waveform
    }

    showUploadStep() {
        // This method sets up the uploading step where the user can
        // upload an audio file from their device.
        const stepFragment = document.createRange().createContextualFragment(
            `<div class="step-uploading">
                <div class="file-picker">
                    <input type="file" accept="audio/*" class="file-input" />
                </div>
                <button class="btn-icon-only btn-back">
                    <i class="icon icon-undo"></i>
                </button>
            </div>`
        );

        const buttonBack = stepFragment.querySelector('.btn-back');
        const fileInput = stepFragment.querySelector('.file-input');

        buttonBack.addEventListener('click', () => {
            this.showActionSelectStep(); // Go back to action select step
        });

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.showPreviewStep(); // Show preview step after file selection
            }
        });

        this.setWidgetContent(stepFragment);
    }

    showPreviewStep() {
        // This method sets up the preview step where the user can
        // play the recorded or uploaded audio, download it, or delete it.
        const stepFragment = document.createRange().createContextualFragment(
            `<div class="step-preview">
                <div class="audio-preview">
                    <button class="btn-icon-only btn-play">
                        <i class="icon icon-play"></i>
                    </button>
                    <button class="btn-icon-only btn-pause hidden">
                        <i class="icon icon-pause"></i>
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
                <button class="btn-icon-only btn-download">
                    <i class="icon icon-download"></i>
                </button>
                <button class="btn-icon-only btn-delete">
                    <i class="icon icon-trash"></i>
                </button>
            </div>`
        );

        const buttonPlay = stepFragment.querySelector('.btn-play');
        const buttonPause = stepFragment.querySelector('.btn-pause');
        const buttonDownload = stepFragment.querySelector('.btn-download');
        const buttonDelete = stepFragment.querySelector('.btn-delete');

        buttonPlay.addEventListener('click', () => {
            buttonPlay.classList.add('hidden');
            buttonPause.classList.remove('hidden');
            // Logic to play the audio
        });

        buttonPause.addEventListener('click', () => {
            buttonPause.classList.add('hidden');
            buttonPlay.classList.remove('hidden');
            // Logic to pause the audio
        });

        buttonDownload.addEventListener('click', () => {
            // Logic to download the audio
        });

        buttonDelete.addEventListener('click', () => {
            this.showActionSelectStep(); // Go back to action select step
        });

        this.setWidgetContent(stepFragment);
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

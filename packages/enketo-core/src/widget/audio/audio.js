import { t } from 'enketo/translator';
import Widget from '../../js/widget';
import AudioRecorder from '../../js/audio-recorder/audio-recorder';
import { formatTimeMMSS } from '../../js/format';

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

    existingFileName = null;
    audioRecorder = new AudioRecorder();

    offscreenCanvas = null;

    static get selector() {
        return '.question:not(.or-appearance-draw):not(.or-appearance-signature):not(.or-appearance-annotate) input[type="file"][accept="audio/*"]';
    }

    _init() {
        this.existingFileName = this.element.getAttribute(
            'data-loaded-file-name'
        );

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
                    <i class="icon icon-volume-down"></i> ${t(
                        'audioRecording.startRecording'
                    )}
                </button>
                <button class="btn-upload btn btn-default small">
                    <i class="icon icon-upload"></i> ${t(
                        'audioRecording.uploadAudioFile'
                    )}
                </button>
            </div>`
        );

        const buttonRecord = stepFragment.querySelector('.btn-record');
        const buttonUpload = stepFragment.querySelector('.btn-upload');

        buttonRecord.addEventListener('click', async () => {
            // Request permissions first
            try {
                await this.audioRecorder.requestPermissions();
                console.log('Microphone access granted');
                this.showRecordStep();
            } catch (error) {
                console.error('Permission denied:', error.message);
            }
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
        const timeDisplay = stepFragment.querySelector('.recording-time');

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
            clearInterval(this.recStatusInterval); // Stop the recording status interval

            this.audioRecorder.stopRecording();
            this.audioRecorder.stopStream();
            this.audioRecorder.onRecordingStop = () => {
                console.log('Audio recording stopped');
                this.showPreviewStep(); // Show preview step after stopping the recording
            };
        });

        this.setWidgetContent(stepFragment);

        this.audioRecorder.startRecording(); // Start recording audio

        this.watchAudioRecording(timeDisplay); // Start watching the audio recording

        // this.plotAudioForm(); // Draw the audio waveform
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

    async showPreviewStep() {
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
                        <div class="progress-bar"></div>
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
        const timeDisplay = stepFragment.querySelector('.time-progress');
        const progressBar = stepFragment.querySelector('.progress-bar');

        const audioPlayer = new Audio();

        audioPlayer.addEventListener('loadedmetadata', () => {
            // Update the time display when metadata is loaded
            console.log('Audio metadata loaded', audioPlayer);
            updateAudioProgress();
        });
        audioPlayer.addEventListener('timeupdate', () => {
            // Update the time display as the audio plays
            updateAudioProgress();
        });
        audioPlayer.addEventListener('ended', () => {
            // Reset the play/pause buttons when audio ends
            updateAudioProgress();
            buttonPlay.classList.remove('hidden');
            buttonPause.classList.add('hidden');
        });

        // const audioFile = await this.audioRecorder.convertFile(); // Convert the recorded audio to a file
        const audioFile = await this.audioRecorder.getRecordedFile(); // Convert the recorded audio to a file
        if (audioFile) {
            audioPlayer.src = URL.createObjectURL(audioFile);
        }

        const updateAudioProgress = () => {
            const currentTime = audioPlayer.currentTime;
            const duration = audioPlayer.duration; // Convert milliseconds to seconds
            timeDisplay.textContent = `${formatTimeMMSS(
                Math.floor(currentTime)
            )} / ${formatTimeMMSS(Math.floor(duration))}`;
            const progress = (currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
        };

        buttonPlay.addEventListener('click', () => {
            buttonPlay.classList.add('hidden');
            buttonPause.classList.remove('hidden');
            // Logic to play the audio
            audioPlayer.play();
        });

        buttonPause.addEventListener('click', () => {
            buttonPause.classList.add('hidden');
            buttonPlay.classList.remove('hidden');
            // Logic to pause the audio
            audioPlayer.pause();
        });

        buttonDownload.addEventListener('click', () => {
            // Create a link to download the audio file
            const downloadLink = document.createElement('a');
            downloadLink.href = audioPlayer.src;
            downloadLink.download =
                this.existingFileName || 'audio-recording.webm';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        });

        buttonDelete.addEventListener('click', () => {
            this.showActionSelectStep(); // Go back to action select step
        });

        this.setWidgetContent(stepFragment);
    }

    watchAudioRecording(timeDisplay) {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(this.audioRecorder.stream);
        const analyser = ctx.createAnalyser();

        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const canvasData = this.prepareCanvasPreview();

        let plotData = [];

        const getAudioData = () => {
            timeDisplay.textContent =
                this.audioRecorder.getRecordingTimeFormatted();

            analyser.getByteFrequencyData(data);
            plotData.push(Math.max(...data));
            if (plotData.length > canvasData.barWidth + canvasData.barGap) {
                this.plotAudioData(canvasData, Math.max(...plotData));
                plotData = [];
            } else {
                this.plotAudioData(canvasData, null);
            }
            if (this.audioRecorder.isRecording()) {
                requestAnimationFrame(getAudioData);
            }
        };
        getAudioData();
    }

    prepareCanvasPreview() {
        // This method will be used to plot the waveform as a
        // feedback while recording audio.
        // Currently, it is drawing a demo random audio form.
        const canvas = this.question.querySelector('canvas.audio-waveform');

        // Fix the canvas's element size and inner drawing size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        if (
            this.offscreenCanvas?.width !== canvas.width ||
            this.offscreenCanvas?.height !== canvas.height
        ) {
            this.offscreenCanvas = new OffscreenCanvas(
                canvas.width,
                canvas.height
            );
        }

        const ctx = canvas.getContext('2d');

        const offCtx = this.offscreenCanvas.getContext('2d');

        const barWidth = 4;
        const barGap = 1;

        ctx.strokeStyle = '#2095F3';
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';

        return { canvas, ctx, offCtx, barWidth, barGap };
    }
    plotAudioData(canvasData, value) {
        const { ctx, canvas, offCtx, barWidth } = canvasData;
        const { width, height } = canvas;

        offCtx.clearRect(0, 0, width, height);
        offCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.offscreenCanvas, -1, 0);

        if (value !== null) {
            const val = (value / 255) * height * 0.8;
            ctx.beginPath();
            ctx.moveTo(width - barWidth / 2, height / 2 - val / 2);
            ctx.lineTo(width - barWidth / 2, height / 2 + val / 2);
            ctx.stroke();
        }
    }
}

export default AudioWidget;

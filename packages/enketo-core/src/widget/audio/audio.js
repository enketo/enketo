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

    audioBlob = null;

    offscreenCanvas = null;

    onLeaveStep = null;

    static get selector() {
        return '.question:not(.or-appearance-draw):not(.or-appearance-signature):not(.or-appearance-annotate) input[type="file"][accept="audio/*"]';
    }

    _init() {
        this.existingFileName = this.element.getAttribute(
            'data-loaded-file-name'
        );

        this.element.classList.add('hidden');

        // Disable the inner button click on label click
        this.question.htmlFor = '';

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
        if (fragment) widget.appendChild(fragment);
    }

    cleanupPreviousSteps() {
        // This method cleans up the previous steps when navigating back.
        this.onLeaveStep?.(); // Call the onLeaveStep callback if it exists
        this.onLeaveStep = null; // Reset the callback to avoid memory leaks
        this.setWidgetContent(null); // Clear the widget content
    }

    showActionSelectStep() {
        this.cleanupPreviousSteps(); // Clean up previous steps

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
        this.cleanupPreviousSteps(); // Clean up previous steps

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
                        <button class="btn-icon-only btn-resume hidden">
                            <i class="icon icon-microphone"></i>
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
        const buttonResume = stepFragment.querySelector('.btn-resume');
        const buttonStop = stepFragment.querySelector('.btn-stop');
        const timeDisplay = stepFragment.querySelector('.recording-time');

        buttonPause.addEventListener('click', () => {
            buttonPause.classList.add('hidden');
            buttonResume.classList.remove('hidden');
            statusDot.classList.remove('recording');

            this.audioRecorder.pauseRecording();
        });

        buttonResume.addEventListener('click', () => {
            buttonResume.classList.add('hidden');
            buttonPause.classList.remove('hidden');
            statusDot.classList.add('recording');
            this.audioRecorder.resumeRecording();
        });

        buttonStop.addEventListener('click', () => {
            clearInterval(this.recStatusInterval); // Stop the recording status interval

            this.audioRecorder.stopRecording();
            this.audioRecorder.stopStream();
            this.audioRecorder.onRecordingStop = async () => {
                this.audioBlob = await this.audioRecorder.getRecordedFile(); // Store the recorded audio file
                this.showPlaybackStep(); // Show preview step after stopping the recording
            };
        });

        this.setWidgetContent(stepFragment);

        this.audioRecorder.startRecording(); // Start recording audio

        this.watchAudioRecording(timeDisplay); // Start watching the audio recording
    }

    showUploadStep() {
        this.cleanupPreviousSteps(); // Clean up previous steps

        // This method sets up the uploading step where the user can
        // upload an audio file from their device.
        const stepFragment = document.createRange().createContextualFragment(
            `<div class="step-uploading">
                <div class="file-picker">
                    <i class="icon icon-upload"></i>
                    ${t('audioRecording.browseAudioFile')}...
                </div>
                <button class="btn-icon-only btn-back">
                    <i class="icon icon-undo"></i>
                </button>
            </div>`
        );

        const filePicker = stepFragment.querySelector('.file-picker');
        const buttonBack = stepFragment.querySelector('.btn-back');

        filePicker.addEventListener('click', () => {
            // Trigger the file input click to open the file dialog
            this.element.click();
        });

        buttonBack.addEventListener('click', () => {
            this.showActionSelectStep(); // Go back to action select step
        });

        const onFileInputChange = (event) => {
            const file = event.target.files[0];
            if (file) {
                this.audioBlob = new Blob([file], { type: file.type });
                this.showPlaybackStep(); // Show playback step after file selection
            }
        };

        this.element.addEventListener('change', onFileInputChange);

        this.onLeaveStep = () => {
            // Clean up the file input change listener when leaving this step
            this.element.removeEventListener('change', onFileInputChange);
        };

        this.setWidgetContent(stepFragment);
    }

    async showPlaybackStep() {
        this.cleanupPreviousSteps(); // Clean up previous steps

        // This method sets up the playback step where the user can
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
                    <div class="seek-bar">
                        <div class="play-progress">
                            <div class="progress-bar"></div>
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
        const timeDisplay = stepFragment.querySelector('.time-progress');
        const seekBar = stepFragment.querySelector('.seek-bar');
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

        if (this.audioBlob) {
            audioPlayer.src = URL.createObjectURL(this.audioBlob);
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

        const updateAudioPosition = (event) => {
            if (event.buttons !== 1 || event.touches?.length === 1) return; // Only update if the mouse is pressed
            const rect = seekBar.getBoundingClientRect();
            const clientX = event.touches
                ? event.touches[0].clientX
                : event.clientX; // Handle touch events
            const offsetX = clientX - rect.left; // Get the mouse position relative to the seek bar
            const width = rect.width;
            const percentage = Math.min(Math.max(offsetX / width, 0), 1);
            const newTime = percentage * audioPlayer.duration;
            audioPlayer.currentTime = newTime; // Update the audio current time
            updateAudioProgress(); // Update the time display
        };

        seekBar.addEventListener('mousemove', updateAudioPosition);
        seekBar.addEventListener('mousedown', updateAudioPosition);
        seekBar.addEventListener('touchmove', updateAudioPosition);
        seekBar.addEventListener('touchstart', updateAudioPosition);

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
            audioPlayer.pause(); // Pause the audio if it's playing
            audioPlayer.src = ''; // Clear the audio source
            this.audioBlob = null; // Clear the audio blob
            this.showActionSelectStep(); // Go back to action select step
        });

        this.setWidgetContent(stepFragment);
    }

    watchAudioRecording(timeDisplay) {
        // This method watches the audio recording and updates the time display
        // and the waveform preview while recording.
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(this.audioRecorder.stream);
        const analyser = ctx.createAnalyser();

        source.connect(analyser);

        // Set up the analyser to get frequency data
        const data = new Uint8Array(analyser.frequencyBinCount);

        // Prepare the canvas for waveform preview
        const canvasData = this.prepareCanvasPreview();

        let plotData = [];

        const updateRecordingInfo = () => {
            // This function updates the recording time and plots the audio data
            if (this.audioRecorder.isPaused()) {
                // No update is needed if recording is paused
                requestAnimationFrame(updateRecordingInfo);
                return;
            }
            timeDisplay.textContent =
                this.audioRecorder.getRecordingTimeFormatted();

            analyser.getByteFrequencyData(data);

            // We store the data for certain frames to plot a single line
            // for each [canvasData.barWidth + canvasData.barGap] frames.
            // This is for visual styling purposes only.
            plotData.push(Math.max(...data));
            if (plotData.length >= canvasData.barWidth + canvasData.barGap) {
                this.plotAudioData(canvasData, Math.max(...plotData));
                plotData = [];
            } else {
                this.plotAudioData(canvasData, null);
            }

            // Request the next animation frame to keep updating
            // while recording is active.
            if (this.audioRecorder.isRecording()) {
                requestAnimationFrame(updateRecordingInfo);
            }
        };
        updateRecordingInfo();
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

        // Setup visual size for the waveform
        const barWidth = 4;
        const barGap = 1;

        ctx.strokeStyle = '#2095F3';
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';

        return { canvas, ctx, offCtx, barWidth, barGap };
    }

    plotAudioData(canvasData, value) {
        // This method plots the audio data on the canvas.
        // It draws a vertical line for the current audio level.
        // If the given value is null, it only scrolls the image left.

        const { ctx, canvas, offCtx, barWidth } = canvasData;
        const { width, height } = canvas;

        // Scrolls canvas image left by 1 pixel
        // to create a moving effect.
        offCtx.clearRect(0, 0, width, height);
        offCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.offscreenCanvas, -1, 0);

        // Draws the vertical line for the current audio level.
        // If the value is null, it does not draw anything.
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

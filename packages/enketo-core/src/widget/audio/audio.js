import { t } from 'enketo/translator';
import Widget from '../../js/widget';
import AudioRecorder from '../../js/audio-recorder/audio-recorder';
import { formatTimeMMSS } from '../../js/format';
import dialog from 'enketo/dialog';
import fileManager from 'enketo/file-manager';

/**
 * AudioWidget that extends the Widget class to handle audio recording and playback.
 * It provides functionality to start recording, pause, resume, stop, and play audio.
 * It also allows users to upload existing audio files.
 *
 * @augments Widget
 */

class AudioWidget extends Widget {
    static get selector() {
        return '.question:not(.or-appearance-draw):not(.or-appearance-signature):not(.or-appearance-annotate) input[type="file"][accept="audio/*"]';
    }

    _init() {
        const existingFilename = this.element.dataset.loadedFileName;
        this.existingFileUrl = null;

        this.audioRecorder = new AudioRecorder();
        this.audioQuality = this.element.dataset.quality || 'normal'; // Get audio quality from data attribute
        this.fileName = existingFilename || ''; // A filename to be used for data validation purposes
        this.audioBlob = null; // To store the recorded audio blob

        this.element.classList.add('hidden');
        this.element.dataset.audio = 'true'; // Indicate that this is an audio recording widget
        this.element.type = 'text'; // Set input type to text so we can set its value

        // Disable the inner button click on label click
        this.question.htmlFor = '';

        const fragment = document
            .createRange()
            .createContextualFragment(
                `<div class="widget audio-widget"></div>`
            );

        this.question.appendChild(fragment); // Append the new widget structure

        this.element.addEventListener('change', async (event) => {
            // If the input type is not 'file', do nothing
            if (event.target.type !== 'file') return;

            // Handle file input change event for uploading audio files
            const file = event.target.files[0];
            if (file) {
                await this.updateValue(file); // Update the widget with the uploaded file
                this.fileName = file.name; // Update the filename from the uploaded file
                this.showPlaybackStep();
            }
        });

        if (existingFilename) {
            // If an existing filename is provided load file contents
            this.useExistingFile(existingFilename);
        } else {
            // If no existing filename, show the action select step
            this.showActionSelectStep();
        }
    }

    async useExistingFile(existingFileName) {
        this.originalInputValue = existingFileName; // Store the original input value for validation
        try {
            const file = await fileManager.getFileUrl(existingFileName);
            if (typeof file !== 'string') {
                this.showActionSelectStep();
                return;
            }

            this.updateValue(null); // Clear the current value
            this.existingFileUrl = file; // Store the URL for playback
            this.originalInputValue = existingFileName;
            this.showPlaybackStep();
        } catch (error) {
            console.error('Error loading existing file:', error);
            this.showActionSelectStep();
        }
    }

    async updateValue(audioBlob) {
        this.audioBlob = audioBlob; // Update the audio blob
        this.value = await this.getDataURL();
    }

    /**
     * Gets the current value of the audio widget.
     */
    get value() {
        return this.element.dataset.cache || '';
    }

    /**
     * Sets the value of the audio widget.
     * @param {string} dataUrl - The data URL of the audio file.
     */
    set value(dataUrl) {
        // dataset-cache is used by the filemanager to extract the file data
        this.element.dataset.cache = dataUrl || '';
    }

    /**
     * Sets the content of the audio widget.
     * This is used to update the widget's inner HTML with the provided fragment.
     *
     * @param {*} fragment
     * @returns {void}
     */
    setWidgetContent(fragment) {
        const widget = this.question.querySelector('.widget');
        if (!widget) {
            console.error('Widget container not found.');
            return;
        }
        widget.innerHTML = '';
        if (fragment) widget.appendChild(fragment);
    }

    /**
     * This method shows the action select step where the user can
     * choose to start recording audio or upload an existing audio file.
     * It creates the necessary UI elements and event listeners
     * for both actions.
     */
    showActionSelectStep() {
        this.updateValue(null);
        this.element.type = 'text'; // Will consider the input as a text for validation purposes
        this.existingFileUrl = null; // Reset existing file URL

        const stepFragment = document.createRange().createContextualFragment(
            `<div class="step-action-select">
                <div class="button-group">
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
                </div>
                <div class="error-message hidden"></div>
            </div>`
        );

        const buttonRecord = stepFragment.querySelector('.btn-record');
        const buttonUpload = stepFragment.querySelector('.btn-upload');
        const errorMessage = stepFragment.querySelector('.error-message');

        buttonRecord.addEventListener('click', async () => {
            // Request permissions first
            try {
                await this.audioRecorder.requestPermissions(this.audioQuality);
                errorMessage.classList.add('hidden');
                this.showRecordStep();
            } catch (error) {
                buttonRecord.disabled = true; // Disable the record button if permissions are denied
                errorMessage.textContent = error.message; // Show the error message
                errorMessage.classList.remove('hidden');
            }
        });

        buttonUpload.addEventListener('click', () => {
            // Trigger the file input click to open the file dialog
            this.element.type = 'file'; // Change type to file to allow file selection
            this.element.click();
        });

        this.setWidgetContent(stepFragment);
    }

    /**
     * This method shows the recording step UI where the user can
     * start, pause, resume, and stop audio recording.
     * It creates the necessary UI elements and event listeners
     * for controlling the recording process.
     */
    showRecordStep() {
        const stepFragment = document.createRange().createContextualFragment(
            `<div class="step-recording">
                <div class="color-reference hidden"></div>
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

        buttonStop.addEventListener('click', async () => {
            await this.audioRecorder.stopRecording();

            const blob = await this.audioRecorder.getRecordedFile(); // Store the recorded audio file

            this.fileName = this.getFileName(); // Get the filename for the recording
            await this.updateValue(blob); // Update the widget with the recorded audio blob

            // originalInputValue needs to be set AFTER setting widget value (updateValue())
            // because it triggers enketo's record autosave
            this.originalInputValue = this.fileName; // Update the original input value with the filename

            // When value is set, it will trigger the playback step
            this.showPlaybackStep();
        });

        this.setWidgetContent(stepFragment);

        this.audioRecorder.startRecording(this.audioQuality); // Start recording audio

        this.watchAudioRecording(timeDisplay); // Start watching the audio recording
    }

    /**
     * This method sets up the playback step where the user can
     * play the recorded or uploaded audio, download it, or delete it.
     * It creates the necessary UI elements and event listeners
     * for playback controls, download functionality, and deletion.
     */
    async showPlaybackStep() {
        if (!this.existingFileUrl && !this.audioBlob) {
            console.error('No audio available for playback.');
            this.showActionSelectStep();
            return; // If no audio is available, show the action select step.
        }

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

        const updateAudioProgress = () => {
            const currentTime = audioPlayer.currentTime;
            const duration = audioPlayer.duration; // Convert milliseconds to seconds
            timeDisplay.textContent = `${formatTimeMMSS(
                Math.floor(currentTime)
            )} / ${formatTimeMMSS(duration)}`;
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
            downloadLink.download = this.fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        });

        buttonDelete.addEventListener('click', () => {
            dialog
                .confirm(t('audioRecording.deleteWarning'))
                .then((confirmed) => {
                    if (confirmed) {
                        audioPlayer.pause(); // Pause the audio if it's playing
                        URL.revokeObjectURL(audioPlayer.src); // Revoke the object URL
                        audioPlayer.removeAttribute('src'); // Remove the source attribute
                        audioPlayer.load(); // Release resources
                        this.audioBlob = null; // Clear the audio blob
                        this.originalInputValue = ''; // Clear the original input value
                        this.showActionSelectStep(); // Go back to action select step
                    }
                });
        });

        audioPlayer.src =
            this.existingFileUrl || URL.createObjectURL(this.audioBlob);

        this.setWidgetContent(stepFragment);
    }

    /**
     * Get a filename for the recording.
     * The file is named after the field name and a postfix in the format: `YYYYMMDD_HHMMSS`.
     * This method is used for both user download and upload.
     * @returns {string} - The filename for the audio recording.
     */
    getFileName() {
        const fileName = this.element.name.slice(
            this.element.name.lastIndexOf('/') + 1
        );
        const baseFileName = `${fileName || 'audio-recording'}`;
        const timestamp = new Date()
            .toISOString()
            .replace(/\D/g, '')
            .slice(0, 14);
        const postfix = `-${timestamp.slice(0, 8)}_${timestamp.slice(8)}`;
        return `${baseFileName}${postfix}.webm`;
    }

    /**
     * This method retrieves the data URL of the recorded audio blob.
     * It reads the blob as a data URL using FileReader.
     * @returns {Promise<string|null>} - A promise that resolves to the data URL of the audio blob,
     * or null if no audio blob is available.
     */
    async getDataURL() {
        if (this.audioBlob) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    resolve(event.target.result);
                };
                reader.readAsDataURL(this.audioBlob);
            });
        }
        return Promise.resolve(null);
    }

    /**
     * This method watches the audio recording and updates the time display
     * and the waveform preview while recording.
     *
     * @param {HTMLElement} timeDisplay - The element to display the recording time.
     */
    watchAudioRecording(timeDisplay) {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(this.audioRecorder.stream);
        const analyser = ctx.createAnalyser();

        source.connect(analyser);

        // Set up the analyser to get frequency data
        const data = new Uint8Array(analyser.frequencyBinCount);

        const offscreenCanvas = new OffscreenCanvas(1, 1);

        // Prepare the canvas for waveform preview
        const canvasData = this.prepareCanvasPreview(offscreenCanvas);

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

    /**
     * This method will be used to plot the waveform as a
     * feedback while recording audio.
     *
     * @param {OffscreenCanvas} offscreenCanvas - The canvas to draw the waveform on.
     * @returns {Object} - An object containing the canvas, context, and other drawing parameters.
     */
    prepareCanvasPreview(offscreenCanvas) {
        const canvas = this.question.querySelector('canvas.audio-waveform');

        // Fix the canvas's element size and inner drawing size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        offscreenCanvas.width = canvas.clientWidth;
        offscreenCanvas.height = canvas.clientHeight;

        const ctx = canvas.getContext('2d');
        const offCtx = offscreenCanvas.getContext('2d');

        // Setup visual size for the waveform
        const barWidth = 4;
        const barGap = 1;

        const brandColor = getComputedStyle(
            this.question.querySelector('.color-reference')
        ).color; // Set the color reference to match the question's color

        ctx.strokeStyle = brandColor;
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';

        return { canvas, ctx, offCtx, barWidth, barGap, offscreenCanvas };
    }

    /**
     * This method plots the audio data on the canvas.
     * It draws a vertical line for the current audio level.
     * If the given value is null, it only scrolls the image left.
     *
     * @param {Object} canvasData - The canvas data containing context and dimensions.
     * @param {number|null} value - The current audio level value (0-255) or null.
     * @returns {void}
     */
    plotAudioData(canvasData, value) {
        const { ctx, canvas, offCtx, barWidth, offscreenCanvas } = canvasData;
        const { width, height } = canvas;

        // Scrolls canvas image left by 1 pixel
        // to create a moving effect.
        offCtx.clearRect(0, 0, width, height);
        offCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(offscreenCanvas, -1, 0);

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

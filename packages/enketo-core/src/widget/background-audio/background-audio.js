import { t } from 'enketo/translator';
import Widget from '../../js/widget';
import AudioRecorder from '../../js/audio-recorder/audio-recorder';
import dialog from 'enketo/dialog';

/**
 * BackgroundAudioWidget that extends the Widget class to handle background audio recording.
 * It provides functionality to start recording audio that continues in the background,
 * with a visual waveform display and recording time indicator. The widget is designed
 * to be unobtrusive and display recording status while the user interacts with the form.
 *
 * This widget creates an element at top level to hold the audio recording UI, so it differs
 * from other widgets by not having a direct parent-child relationship with the question element.
 *
 * @augments Widget
 */

class BackgroundAudioWidget extends Widget {
    static get selector() {
        return 'input[data-background-audio="true"]';
    }

    /**
     * Constructor for BackgroundAudioWidget.
     * Initializes the widget, sets up the audio recorder, and creates the UI container.
     *
     * @param {HTMLElement} element - The input element that triggers this widget.
     * @param {Object} options - Configuration options for the widget.
     */
    constructor(element, options) {
        super(element, options);

        this.audioRecorder = new AudioRecorder();
        this.audioQuality = this.element.dataset.quality || 'normal'; // Get audio quality from data attribute

        this.question.classList.add('hidden'); // Hide the question element

        const mainContainer = document.body;
        if (!mainContainer) {
            throw new Error(
                'Main container not found for BackgroundAudioWidget'
            );
        }

        const fragment = document
            .createRange()
            .createContextualFragment(
                `<div class="widget background-audio-widget"></div>`
            );

        mainContainer.classList.add('background-audio-widget-offset'); // Add offset class to body
        mainContainer.append(fragment); // Append the new widget structure

        this.widgetElement = mainContainer.querySelector(
            'div.background-audio-widget'
        );

        this.showRecordingView(); // Show the recording view initially
    }

    /**
     * This is called just before the form is submitted.
     * It stops the audio recording and prepares the data for submission by ensuring the audio is ready.
     * @returns {Promise<void>}
     */
    async prepareData() {
        this.widgetElement.remove(); // Remove the UI from the document

        try {
            await this.audioRecorder.stopRecording();
            const blob = await this.audioRecorder.getRecordedFile();
            const dataUrl = await this.getDataURL(blob);
            this.originalInputValue = this.getFileName();
            this.value = dataUrl;
        } catch (error) {
            console.error('Error preparing audio data:', error);
            throw error;
        }
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
     * Sets the content of the widget container.
     *
     * @param {DocumentFragment} fragment - The HTML fragment to set as widget content.
     */
    setWidgetContent(fragment) {
        if (!this.widgetElement) {
            console.error('Widget container not found.');
            return;
        }
        this.widgetElement.innerHTML = '';
        if (fragment) this.widgetElement.appendChild(fragment);
    }

    /**
     * Shows an error view when audio recording initialization fails.
     *
     * @param {string} error - The error message to display.
     */
    showErrorView(error) {
        const fragment = document.createRange()
            .createContextualFragment(`<div class="error">
                                        <i class="icon icon-microphone"></i>
                                        ${error}
                                       </div>`);

        this.setWidgetContent(fragment);
    }

    /**
     * Shows the recording view with waveform visualization and starts audio recording.
     * Creates the UI elements including status indicator, microphone icon,
     * waveform canvas, and time display.
     */
    showRecordingView() {
        const fragment = document.createRange().createContextualFragment(`
                <div class="recording-view">
                    <div class="color-reference hidden"></div>
                    <span class="status-dot recording"></span>
                    <i class="icon icon-microphone"></i>
                    <span class="recording-time">00:00</span>
                    <canvas class="audio-waveform"></canvas>
                    <i class="helper-tip icon icon-question-circle"></i>
                </div>
            `);

        const timeDisplay = fragment.querySelector('.recording-time');
        const helperTip = fragment.querySelector('.helper-tip');

        // Add tooltip to the helper icon
        helperTip.addEventListener('click', () => {
            dialog.alert(
                t('audioRecording.backgroundDisclaimer.msg'),
                t('audioRecording.backgroundDisclaimer.heading'),
                'normal'
            );
        });

        this.setWidgetContent(fragment);

        dialog
            .alert(
                t('audioRecording.backgroundDisclaimer.msg'),
                t('audioRecording.backgroundDisclaimer.heading'),
                'normal'
            )
            .then(() =>
                this.audioRecorder.requestPermissions(this.audioQuality)
            )
            .then(() => {
                this.audioRecorder.startRecording(this.audioQuality);
                this.watchAudioRecording(timeDisplay);
            })
            .catch((error) => {
                this.showErrorView(error.message);
            });
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
        const baseFileName = `${fileName || 'background-audio'}`;
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
    getDataURL(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            reader.readAsDataURL(blob);
        });
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

        // Prepare the canvas for waveform preview
        const canvasData = this.prepareCanvasPreview();

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

            this.plotAudioData(canvasData, data);

            // Request the next animation frame to keep updating
            // while recording is active.
            if (this.audioRecorder.isRecording()) {
                requestAnimationFrame(updateRecordingInfo);
            }
        };
        updateRecordingInfo();
    }

    /**
     * This method prepares the canvas for plotting the waveform as a
     * feedback while recording audio. It sets up the canvas dimensions,
     * drawing context, and styling parameters.
     *
     * @returns {Object} - An object containing the canvas, context, bar width, and bar gap.
     * @returns {HTMLCanvasElement} returns.canvas - The canvas element for drawing.
     * @returns {CanvasRenderingContext2D} returns.ctx - The 2D rendering context.
     * @returns {number} returns.barWidth - The width of each waveform bar.
     * @returns {number} returns.barGap - The gap between waveform bars.
     */
    prepareCanvasPreview() {
        const canvas = this.widgetElement.querySelector(
            'canvas.audio-waveform'
        );

        // Setup visual size for the waveform
        const barWidth = 3;
        const barGap = 2;

        // Fix the canvas's element size and inner drawing size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        const ctx = canvas.getContext('2d');

        const brandColor = getComputedStyle(
            this.widgetElement.querySelector('.color-reference')
        ).color; // Set the color reference to match the question's color

        ctx.strokeStyle = brandColor;
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';

        return { canvas, ctx, barWidth, barGap };
    }

    /**
     * This method plots the audio frequency data on the canvas as a waveform visualization.
     * It clears the canvas and draws vertical bars representing the frequency spectrum
     * of the audio being recorded.
     *
     * @param {Object} canvasData - The canvas data containing context and dimensions.
     * @param {Uint8Array} data - The frequency data array from the audio analyser (0-255 values).
     * @returns {void}
     */
    plotAudioData(canvasData, data) {
        const { ctx, canvas, barWidth, barGap } = canvasData;
        const { width, height } = canvas;

        // Clear the canvas
        ctx.clearRect(0, 0, width, height);

        const step = Math.floor(data.length / (width / (barWidth + barGap)));

        for (let i = 0; i < data.length; i += step) {
            const value = data[i];
            const x = (i / step) * (barWidth + barGap); // Calculate the x position for the bar

            if (x + barWidth > width) continue;

            // Draw the vertical line for the current audio level
            if (value !== null) {
                const val = (value / 255) * height * 0.8; // Scale value to canvas height
                ctx.beginPath();
                ctx.moveTo(x + barWidth / 2, height / 2 - val / 2);
                ctx.lineTo(x + barWidth / 2, height / 2 + val / 2);
                ctx.stroke();
            }
        }
    }
}

export default BackgroundAudioWidget;

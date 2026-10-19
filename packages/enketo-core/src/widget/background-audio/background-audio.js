import { t } from 'enketo/translator';
import Widget from '../../js/widget';
import AudioRecorder from '../../js/audio-recorder/audio-recorder';
import { setCachedFile, getCachedFile } from '../../js/utils';
import dialog from 'enketo/dialog';

/**
 * Minimum interval (in ms) between waveform redraws. Redrawing at the display
 * refresh rate for the whole (possibly hour-long) session is wasteful, ~10fps
 * looks the same for this small preview.
 */
const WAVEFORM_FRAME_INTERVAL_MS = 100;

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

        this.existingFilename = this.element.dataset.loadedFileName;
        this.isDestroyed = false;

        this.audioRecorder = new AudioRecorder();
        this.audioQuality = this.element.dataset.quality || 'normal'; // Get audio quality from data attribute

        this.question.classList.add('hidden'); // Hide the question element
        this.element.type = 'hidden'; // Change from type file to hidden so we can manipulate the value

        const mainContainer = document.body;
        if (!mainContainer) {
            throw new Error(
                'Main container not found for BackgroundAudioWidget'
            );
        }

        // We need to remove existing elements that could be duplicated
        // when loading saved drafts.
        mainContainer.querySelector('div.background-audio-widget')?.remove();

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

        // If a file is already loaded, then it's a submission edit and we don't show the recording view.
        if (this.existingFilename) {
            this.useExistingFile();
        } else {
            this.showRecordingView(); // Show the recording view initially
        }
    }

    async useExistingFile() {
        this.originalInputValue = this.existingFilename;
        this.value = '';
        this.showHasRecordedAudioView(); // Show a message indicating that there's a recorded audio
    }

    /**
     * This is called just before the form is submitted.
     * It stops the audio recording and prepares the data for submission by ensuring the audio is ready.
     * @returns {Promise<void>}
     */
    async beforeSubmit() {
        // If it's an edit, we don't record again.
        if (this.existingFilename) return;

        // If it's not recording (or paused), there's nothing to do.
        if (!this.audioRecorder.isActive()) return;

        try {
            await this.audioRecorder.stopRecording();
            this.stopWatchingAudioRecording();
            const blob = await this.audioRecorder.getRecordedFile();
            // The file is kept as a Blob instead of a data URL. For long recordings
            // a data URL is a huge string that needs to be decoded back into a Blob
            // synchronously by the file manager, which can freeze the browser.
            this.value = blob;
            this.originalInputValue = this.getFileName();
        } catch (error) {
            console.error('Error preparing audio data:', error);
            throw error;
        }
    }

    /**
     * Background audio widget does not take place visually and doesn't implement
     * a custom validation which would display a message. Therefore, this method is a no-op.
     *
     * @param {string} message - The custom validation error message to set. If null, clears the error message.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setValidationError(_message) {}

    /**
     * Gets the recorded audio file.
     * @returns {Blob|null} The recorded audio file, if any.
     */
    get value() {
        return getCachedFile(this.element) || null;
    }

    /**
     * Sets the recorded audio file.
     * @param {Blob|string|null} blob - The recorded audio file. Any non-Blob value clears it.
     */
    set value(blob) {
        // The file manager obtains the file to submit from the cached file
        setCachedFile(this.element, blob instanceof Blob ? blob : null);
    }

    /**
     * Cleans up the widget instance. This is called when the form is reset.
     * Releases the microphone, the audio graph and the recorded data.
     */
    cleanup() {
        this.isDestroyed = true;
        this.widgetElement.remove(); // Remove the widget element from the DOM
        this.stopWatchingAudioRecording();
        this.value = null;
        // Also stops paused recordings, not only active ones
        this.audioRecorder.dispose();
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
     * Shows a message indicating that the loaded submission has a recorded audio.
     *
     * @param {string} error - The error message to display.
     */
    showHasRecordedAudioView() {
        const fragment = document.createRange()
            .createContextualFragment(`<div class="message">
                                        <i class="icon icon-microphone"></i>
                                        ${t('audioRecording.hasRecordedAudio')}
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
                'normal',
                null,
                t('audioRecording.backgroundDisclaimer.buttonText')
            )
            .then(() =>
                this.audioRecorder.requestPermissions(this.audioQuality)
            )
            .then(() => {
                // The form may have been reset while waiting for the user
                if (this.isDestroyed) {
                    return this.audioRecorder.dispose();
                }

                return this.audioRecorder
                    .startRecording(this.audioQuality)
                    .then(() => {
                        // Also check after starting, cleanup() may have run meanwhile
                        if (!this.isDestroyed) {
                            this.watchAudioRecording(timeDisplay);
                        }
                    });
            })
            .catch((error) => {
                if (!this.isDestroyed) {
                    this.showErrorView(error.message);
                }
            });
    }

    /**
     * Get a filename for the recording based on question name.
     * The file is named after the field name and a postfix in the format: `YYYYMMDD_HHMMSS`.
     *
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
     * This method watches the audio recording and updates the time display
     * and the waveform preview while recording.
     *
     * @param {HTMLElement} timeDisplay - The element to display the recording time.
     */
    watchAudioRecording(timeDisplay) {
        this.stopWatchingAudioRecording();

        // Keep a reference so the context (and its audio graph) can be closed
        this.audioContext = new AudioContext();
        const source = this.audioContext.createMediaStreamSource(
            this.audioRecorder.stream
        );
        const analyser = this.audioContext.createAnalyser();

        source.connect(analyser);

        // Set up the analyser to get frequency data
        const data = new Uint8Array(analyser.frequencyBinCount);

        // Prepare the canvas for waveform preview
        const canvasData = this.prepareCanvasPreview();

        let lastFrameTime = -Infinity;

        const updateRecordingInfo = (time = 0) => {
            // Stop updating once the recording has ended (stopped or cleaned up).
            if (!this.audioRecorder.isActive()) {
                this.stopWatchingAudioRecording();
                return;
            }

            this.animationFrameId = requestAnimationFrame(updateRecordingInfo);

            // No update is needed if recording is paused, or if the
            // last update is too recent.
            if (
                this.audioRecorder.isPaused() ||
                time - lastFrameTime < WAVEFORM_FRAME_INTERVAL_MS
            ) {
                return;
            }
            lastFrameTime = time;

            const formattedTime =
                this.audioRecorder.getRecordingTimeFormatted();
            if (timeDisplay.textContent !== formattedTime) {
                timeDisplay.textContent = formattedTime;
            }

            analyser.getByteFrequencyData(data);

            this.plotAudioData(canvasData, data);
        };
        updateRecordingInfo();
    }

    /**
     * Stops updating the recording time and waveform preview, and releases
     * the audio context used to analyse the recording.
     */
    stopWatchingAudioRecording() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.audioContext) {
            this.audioContext.close().catch(() => {
                // Ignore, the context may already be closed
            });
            this.audioContext = null;
        }
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

        const step = Math.max(
            1,
            Math.floor(data.length / (width / (barWidth + barGap)))
        );

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

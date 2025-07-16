import { t } from 'enketo/translator';
import fixWebmDuration from 'fix-webm-duration';
import { formatTimeMMSS } from '../format';

/**
 * AudioRecorder class for recording audio using the MediaRecorder API
 */

/** * Quality parameters for audio recording based on the documentation at
 * https://docs.getodk.org/form-question-types/#audio-widgets
 */
const QualityParameters = {
    low: {
        audioBitsPerSecond: 24 * 1024, // 24 kbps
        sampleRate: 32000,
    },
    normal: {
        audioBitsPerSecond: 64 * 1024, // 64 kbps
        sampleRate: 32000,
    },
    'voice-only': {
        audioBitsPerSecond: 12.2 * 1024, // 12.2 kbps
        sampleRate: 8000,
    },
};

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.startTime = null;
        this.recordingDuration = 0;
    }

    /**
     * Requests microphone permissions from the user
     * @param {'low'|'normal'|'voice-only'} [quality] - The quality of the recording
     * @returns {Promise<MediaStream>} The audio stream if permission is granted
     * @throws {Error} When microphone access is denied, not found, not supported, or unknown error occurs
     */
    async requestPermissions(quality) {
        // Set the sample rate based on the quality parameter
        const qualityParams =
            QualityParameters[quality] || QualityParameters.normal;

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: qualityParams.sampleRate,
                },
            });
            return this.stream;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error(t('audioRecording.error.accessDenied'));
            } else if (error.name === 'NotFoundError') {
                throw new Error(t('audioRecording.error.noMicrophone'));
            } else if (error.name === 'NotSupportedError') {
                throw new Error(t('audioRecording.error.notSupported'));
            } else {
                throw new Error(
                    t('audioRecording.error.unknownError', {
                        errorMessage: error.message,
                    })
                );
            }
        }
    }

    /**
     * Starts audio recording
     * @param {'low'|'normal'|'voice-only'} [quality] - The quality of the recording
     * @returns {Promise<void>}
     * @throws {Error} When no valid MediaStream is available
     */
    async startRecording(quality) {
        // Set the quality parameters based on the provided quality
        const qualityParams =
            QualityParameters[quality] || QualityParameters.normal;

        if (!this.stream) {
            // If no stream provided, use the one from permissions request
            await this.requestPermissions(quality);
        }

        const audioStream = this.stream;

        if (!audioStream) {
            throw new Error(
                'A valid MediaStream is required to start recording. Please request permissions first.'
            );
        }

        this.mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: qualityParams.audioBitsPerSecond,
        });

        this.recordedChunks = [];
        this.startTime = Date.now();

        this.mediaRecorder.ondataavailable = (event) => {
            // Only push non-empty chunks to the recordedChunks
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstart = () => {
            this.startTime = Date.now();
        };

        this.mediaRecorder.start();
    }

    /**
     * Pauses the current recording
     * @throws {Error} When MediaRecorder is not currently recording
     */
    pauseRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            this.recordingDuration = Date.now() - this.startTime; // Store the duration before pausing
            this.startTime = null; // Reset start time to avoid confusion
        } else {
            throw new Error(
                'Cannot pause recording. MediaRecorder is not recording.'
            );
        }
    }

    /**
     * Resumes a paused recording
     * @throws {Error} When MediaRecorder is not currently paused
     */
    resumeRecording() {
        const state = this.mediaRecorder && this.mediaRecorder.state;
        if (state !== 'paused') {
            throw new Error(
                'Cannot resume recording. MediaRecorder is not paused.'
            );
        }

        this.mediaRecorder.resume();
        this.startTime = Date.now() - this.recordingDuration; // Adjust start time to maintain correct duration
    }

    /**
     * Stops the current recording and releases the microphone
     * @returns {Promise<void>} Promise that resolves when recording is stopped
     * @throws {Error} When MediaRecorder is not active
     */
    async stopRecording() {
        const state = this.mediaRecorder && this.mediaRecorder.state;
        if (state !== 'recording' || state !== 'paused') {
            throw new Error(
                'Cannot stop recording. MediaRecorder is not active.'
            );
        }

        return new Promise((resolve) => {
            // Store the paused state before stopping
            const wasPausedWhenStopped = this.isPaused();

            this.mediaRecorder.onstop = () => {
                this.mediaRecorder.onstop = null; // Clear the onstop handler

                // If it was paused, we don't need to adjust the duration
                if (!wasPausedWhenStopped) {
                    this.recordingDuration = Date.now() - this.startTime;
                }

                // Stop the stream tracks to release the microphone
                if (this.stream) {
                    this.stream.getTracks().forEach((track) => track.stop());
                    this.stream = null;
                }

                resolve();
            }; // Set the onstop handler
            this.mediaRecorder.stop();
        });
    }

    /**
     * Gets the recorded audio as a Blob with corrected duration metadata
     * @returns {Promise<Blob>} The recorded audio blob with fixed WebM duration
     * @throws {Error} When no audio data is available
     */
    async getRecordedFile() {
        if (this.recordedChunks.length === 0) {
            throw new Error(
                'No audio data available. Please record something first.'
            );
        }

        const mimeType = this.mediaRecorder.mimeType;

        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });

        // fixWebMDuration is used to ensure the duration metadata is correct
        // Without this, the generated webm file won't have the duration metadata
        return fixWebmDuration(audioBlob, this.recordingDuration);
    }

    /**
     * Checks if the recorder is currently recording
     * @returns {boolean} True if recording is in progress
     */
    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }

    /**
     * Checks if the recorder is currently paused
     * @returns {boolean} True if recording is paused
     */
    isPaused() {
        return this.mediaRecorder && this.mediaRecorder.state === 'paused';
    }

    /**
     * Checks if microphone permissions have been granted
     * @returns {boolean} True if permissions are available
     */
    hasPermissions() {
        return this.stream !== null;
    }

    /**
     * Gets the current recording time in milliseconds
     * @returns {number} Recording time in milliseconds
     */
    getRecordingTime() {
        // Calculate the recording time based on the current state
        if (this.isRecording()) {
            return Date.now() - this.startTime;
        }
        return this.recordingDuration;
    }

    /**
     * Gets the current recording time formatted as MM:SS
     * @returns {string} Recording time formatted as MM:SS
     */
    getRecordingTimeFormatted() {
        return formatTimeMMSS(Math.floor(this.getRecordingTime() / 1000));
    }
}

export default AudioRecorder;

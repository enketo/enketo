import fixWebmDuration from 'fix-webm-duration';
import { formatTimeMMSS } from '../format';

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.startTime = null;
        this.recordingDuration = 0;
        this.dataWatchers = [];
        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onRecordingPause = null;
        this.onRecordingResume = null;
    }

    async requestPermissions() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            return this.stream;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone access denied by user.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No microphone found on this device.');
            } else if (error.name === 'NotSupportedError') {
                throw new Error(
                    'Audio recording is not supported in this browser.'
                );
            } else {
                throw new Error(
                    `Failed to access microphone: ${error.message}`
                );
            }
        }
    }

    async startRecording(stream = null) {
        // If no stream provided, use the one from permissions request
        const audioStream = stream || this.stream;

        if (!audioStream) {
            throw new Error(
                'A valid MediaStream is required to start recording. Please request permissions first.'
            );
        }

        this.mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 19000,
        });

        this.recordedChunks = [];
        this.startTime = Date.now();

        this.mediaRecorder.ondataavailable = (event) => {
            // Only push non-empty chunks to the recordedChunks
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
            console.log(this.recordedChunks.length, 'chunks recorded');
        };

        this.mediaRecorder.onstart = () => {
            this.startTime = Date.now();
            if (this.isPaused()) {
                this.onRecordingResume?.();
            } else {
                this.onRecordingStart?.();
            }
        };

        this.mediaRecorder.onstop = () => {
            if (this.startTime) {
                this.recordingDuration = Date.now() - this.startTime;
                this.onRecordingStop?.();
            }
        };

        this.mediaRecorder.start();
    }

    pauseRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            this.recordingDuration = Date.now() - this.startTime; // Store the duration before pausing
            this.startTime = null; // Reset start time to avoid confusion
            this.onRecordingPause?.();
        } else {
            throw new Error(
                'Cannot pause recording. MediaRecorder is not recording.'
            );
        }
    }

    resumeRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.startTime = Date.now() - this.recordingDuration; // Adjust start time to maintain correct duration
            this.onRecordingResume?.();
        } else {
            throw new Error(
                'Cannot resume recording. MediaRecorder is not paused.'
            );
        }
    }

    stopRecording() {
        if (
            this.mediaRecorder &&
            (this.mediaRecorder.state === 'recording' ||
                this.mediaRecorder.state === 'paused')
        ) {
            this.mediaRecorder.stop();
        } else {
            throw new Error(
                'Cannot stop recording. MediaRecorder is not active.'
            );
        }
    }

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

    stopStream() {
        if (this.stream) {
            console.log('Stopping audio stream');
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
    }

    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }

    isPaused() {
        return this.mediaRecorder && this.mediaRecorder.state === 'paused';
    }

    hasPermissions() {
        return this.stream !== null;
    }

    getRecordingTime() {
        if (this.isRecording() && this.startTime) {
            return Date.now() - this.startTime;
        }
        return this.recordingDuration;
    }

    getRecordingTimeFormatted() {
        const timeMs = this.getRecordingTime();
        const seconds = Math.floor(timeMs / 1000);

        return formatTimeMMSS(seconds);
    }
}

export default AudioRecorder;

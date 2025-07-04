import { formatTimeMMSS } from './format';

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.startTime = null;
        this.recordingDuration = 0;
        this.dataWatchers = [];
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

        this.mediaRecorder = new MediaRecorder(audioStream);
        this.recordedChunks = [];
        this.startTime = Date.now();

        this.mediaRecorder.ondataavailable = (event) => {
            // Only push non-empty chunks to the recordedChunks
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
                // Notify watchers with new data
                this.notifyDataWatchers(event.data);
            }
        };

        this.mediaRecorder.onstart = () => {
            this.startTime = Date.now();
        };

        this.mediaRecorder.onstop = () => {
            if (this.startTime) {
                this.recordingDuration = Date.now() - this.startTime;
            }
        };

        this.mediaRecorder.start(1000); // Start recording with a timeslice of 1000ms
    }

    pauseRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
        } else {
            throw new Error(
                'Cannot pause recording. MediaRecorder is not recording.'
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

    getRecordedFile() {
        if (this.recordedChunks.length === 0) {
            throw new Error(
                'No audio data available. Please record something first.'
            );
        }

        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        return blob;
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

    addDataWatcher(callback) {
        if (typeof callback === 'function') {
            this.dataWatchers.push(callback);
        }
    }

    removeDataWatcher(callback) {
        const index = this.dataWatchers.indexOf(callback);
        if (index > -1) {
            this.dataWatchers.splice(index, 1);
        }
    }

    notifyDataWatchers(data) {
        this.dataWatchers.forEach((callback) => {
            try {
                callback(data, {
                    chunks: this.recordedChunks.length,
                    recordingTime: this.getRecordingTime(),
                    isRecording: this.isRecording(),
                    isPaused: this.isPaused(),
                });
            } catch (error) {
                console.error('Error in data watcher callback:', error);
            }
        });
    }
}

export default AudioRecorder;

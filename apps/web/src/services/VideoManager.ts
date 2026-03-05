export class VideoManager {
    private localStream: MediaStream | null = null;
    private videoElement: HTMLVideoElement | null = null;

    constructor() { }

    async start(videoElement: HTMLVideoElement): Promise<MediaStream> {
        this.videoElement = videoElement;
        try {
            // Stop any existing stream first
            this.stop();

            let retries = 3;
            while (retries > 0) {
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: 'user'
                        },
                        audio: true
                    });
                    break;
                } catch (e) {
                    retries--;
                    if (retries === 0) throw e;
                    console.warn(`Camera access failed, retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            videoElement.srcObject = this.localStream;

            // Wait for the video to be ready to play
            videoElement.onloadedmetadata = () => {
                videoElement.play().catch(err => {
                    console.warn('Video play failed:', err);
                });
            };

            console.log('✅ Webcam initialized');
            return this.localStream!;

        } catch (error) {
            console.error('❌ Error accessing webcam:', error);
            throw error;
        }
    }

    stop() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
        }
    }

    toggleVideo(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => track.enabled = enabled);
        }
    }

    toggleAudio(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => track.enabled = enabled);
        }
    }
}

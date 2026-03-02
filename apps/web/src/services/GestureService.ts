import type { Results } from '@mediapipe/hands';
import { Hands } from '@mediapipe/hands';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';

export class GestureService {
    private hands: Hands | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private onResultsCallback: ((results: Results) => void) | null = null;
    private isRunning = false;
    private useLocal = true;
    private retryCount = 0;

    constructor() { }

    async initialize(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (this.useLocal && this.retryCount === 0) {
                    console.log('⏱️ Local files timeout, switching to CDN...');
                    clearTimeout(timeout);
                    this.useLocal = false;
                    this.retryCount++;
                    this.initialize().then(resolve).catch(reject);
                } else {
                    reject(new Error('MediaPipe initialization timeout'));
                }
            }, 10000);

            try {
                const source = this.useLocal ? 'local files' : 'CDN';
                console.log(`🔄 Initializing MediaPipe from ${source}...`);

                if (typeof Hands === 'undefined') {
                    clearTimeout(timeout);
                    reject(new Error('MediaPipe Hands not available'));
                    return;
                }

                this.hands = new Hands({
                    locateFile: (file) => {
                        if (this.useLocal) {
                            return `/mediapipe/hands/${file}`;
                        } else {
                            return `${MEDIAPIPE_CDN}/${file}`;
                        }
                    }
                });

                if (!this.hands) {
                    throw new Error('Failed to create Hands instance');
                }

                this.hands.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                });

                this.hands.onResults((results) => {
                    if (this.onResultsCallback) {
                        try {
                            this.onResultsCallback(results);
                        } catch (err) {
                            console.error('Error in results callback:', err);
                        }
                    }
                });

                console.log(`✅ GestureService initialized (${source})`);
                clearTimeout(timeout);
                resolve();
            } catch (error) {
                clearTimeout(timeout);
                console.error('❌ Init failed:', error);

                if (this.useLocal && this.retryCount === 0) {
                    console.log('🔄 Retrying with CDN...');
                    this.useLocal = false;
                    this.retryCount++;
                    this.initialize().then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            }
        });
    }

    async start(videoElement: HTMLVideoElement, onResults: (results: Results) => void) {
        if (this.isRunning) return;
        if (!this.hands) throw new Error('Not initialized');

        console.log('🎥 Starting gesture detection...');

        this.videoElement = videoElement;
        this.onResultsCallback = onResults;
        this.isRunning = true;

        const processFrame = async () => {
            if (!this.isRunning || !this.videoElement || !this.hands) return;

            if (this.videoElement.readyState >= 2) {
                try {
                    await this.hands.send({ image: this.videoElement });
                } catch (_) {
                    // Silent
                }
            }

            if (this.videoElement && 'requestVideoFrameCallback' in this.videoElement) {
                (this.videoElement as HTMLVideoElement & { requestVideoFrameCallback: (callback: any) => void }).requestVideoFrameCallback(processFrame);
            } else {
                requestAnimationFrame(processFrame);
            }
        };

        processFrame();
        console.log('👋 Gesture tracking started');
    }

    stop() {
        this.isRunning = false;
        this.videoElement = null;
        this.onResultsCallback = null;
        console.log('🛑 Gesture tracking stopped');
    }
}

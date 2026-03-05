import type { Results } from '@mediapipe/hands';
import { Hands } from '@mediapipe/hands';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';

// Global singleton instance to prevent WebAssembly dual-initialization crashes during React StrictMode or fast navigation
let globalHandsInstance: Hands | null = null;
let globalInitPromise: Promise<void> | null = null;

// The callback changes depending on which component is currently using the camera, so we route it globally
let currentResultsCallback: ((results: Results) => void) | null = null;

export class GestureService {
    private videoElement: HTMLVideoElement | null = null;
    private canvasElement: HTMLCanvasElement | null = null;
    private canvasCtx: CanvasRenderingContext2D | null = null;
    private isRunning = false;
    private useLocal = true;
    private retryCount = 0;

    constructor() {
        // Create an off-screen canvas to act as a buffer for the video frames
        // This prevents MediaPipe from directly hijacking the video element's texture pipeline
        // which can cause the video to go black on some hardware configurations.
        this.canvasElement = document.createElement('canvas');
        this.canvasCtx = this.canvasElement.getContext('2d', { willReadFrequently: true });
    }

    async initialize(): Promise<void> {
        // If already initializing or finished, yield the same promise
        if (globalInitPromise) {
            return globalInitPromise;
        }

        globalInitPromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (this.useLocal && this.retryCount === 0) {
                    console.log('⏱️ Local files timeout, switching to CDN...');
                    clearTimeout(timeout);
                    this.useLocal = false;
                    this.retryCount++;
                    globalInitPromise = null;
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

                globalHandsInstance = new Hands({
                    locateFile: (file) => {
                        if (this.useLocal) {
                            return `/mediapipe/hands/${file}`;
                        } else {
                            return `${MEDIAPIPE_CDN}/${file}`;
                        }
                    }
                });

                if (!globalHandsInstance) {
                    throw new Error('Failed to create Hands instance');
                }

                globalHandsInstance.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                });

                globalHandsInstance.onResults((results) => {
                    if (currentResultsCallback) {
                        try {
                            currentResultsCallback(results);
                        } catch (err) {
                            console.error('Error in results callback:', err);
                        }
                    }
                });

                // Crucial: initialize MediaPipe completely before resolving
                globalHandsInstance.initialize().then(() => {
                    console.log(`✅ GestureService MediaPipe WASM initialized (${source})`);
                    clearTimeout(timeout);
                    resolve();
                }).catch((initErr) => {
                    clearTimeout(timeout);
                    console.error('❌ Init failed:', initErr);
                    if (this.useLocal && this.retryCount === 0) {
                        console.log('🔄 Retrying with CDN...');
                        this.useLocal = false;
                        this.retryCount++;
                        globalInitPromise = null;
                        this.initialize().then(resolve).catch(reject);
                    } else {
                        reject(initErr);
                    }
                });
            } catch (error) {
                clearTimeout(timeout);
                console.error('❌ Init failed:', error);

                if (this.useLocal && this.retryCount === 0) {
                    console.log('🔄 Retrying with CDN...');
                    this.useLocal = false;
                    this.retryCount++;
                    globalInitPromise = null;
                    this.initialize().then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            }
        });

        return globalInitPromise;
    }

    async start(videoElement: HTMLVideoElement, onResults: (results: Results) => void) {
        if (this.isRunning) return;
        if (!globalHandsInstance) throw new Error('Not initialized');

        console.log('🎥 Starting gesture detection tracking...');

        this.videoElement = videoElement;
        currentResultsCallback = onResults;
        this.isRunning = true;

        const processFrame = async () => {
            if (!this.isRunning || !this.videoElement || !globalHandsInstance) return;

            if (this.videoElement.readyState >= 2 && this.canvasElement && this.canvasCtx) {
                try {
                    // Ensure canvas matches video dimensions
                    if (this.canvasElement.width !== this.videoElement.videoWidth) {
                        this.canvasElement.width = this.videoElement.videoWidth;
                        this.canvasElement.height = this.videoElement.videoHeight;
                    }

                    // Draw the current video frame to our hidden off-screen canvas buffer
                    this.canvasCtx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

                    // Send the CANVAS to MediaPipe, safely isolating the original video element from WASM/WebGL manipulation
                    await globalHandsInstance.send({ image: this.canvasElement });
                } catch (err) {
                    console.error('MediaPipe send error:', err);
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
        currentResultsCallback = null;
        console.log('🛑 Gesture tracking stopped');
    }
}

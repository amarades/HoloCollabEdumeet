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
    private useLocal = false;
    private retryCount = 0;
    
    // Performance Tracking
    public currentFps = 0;
    public currentLatency = 0;
    private frameCount = 0;
    private lastFpsTime = 0;

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
                    console.warn('⏱️ MediaPipe Local initialization timeout, switching to CDN...');
                    clearTimeout(timeout);
                    this.useLocal = false;
                    this.retryCount++;
                    globalInitPromise = null;
                    this.initialize().then(resolve).catch(reject);
                } else {
                    const error = new Error('MediaPipe initialization timeout. Please check your internet connection or browser compatibility.');
                    console.error('❌ GestureService Timeout:', error);
                    reject(error);
                }
            }, 15000); // Increased timeout for slower connections

            try {
                const source = this.useLocal ? 'local files' : 'CDN';
                console.log(`🔄 Initializing MediaPipe Hands (${source})...`);

                // Ensure Hands constructor is valid
                if (!Hands) {
                    throw new Error('MediaPipe Hands module could not be loaded.');
                }

                globalHandsInstance = new Hands({
                    locateFile: (file) => {
                        const path = this.useLocal ? `/mediapipe/hands/${file}` : `${MEDIAPIPE_CDN}/${file}`;
                        return path;
                    }
                });

                globalHandsInstance.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.6, // Slightly lowered for better initial detection
                    minTrackingConfidence: 0.5
                });

                globalHandsInstance.onResults((results) => {
                    if (currentResultsCallback && this.isRunning) {
                        try {
                            currentResultsCallback(results);
                        } catch (err) {
                            console.error('Error in results callback:', err);
                        }
                    }
                });

                globalHandsInstance.initialize().then(() => {
                    console.log(`✅ GestureService MediaPipe WASM initialized successfully (${source})`);
                    clearTimeout(timeout);
                    resolve();
                }).catch((initErr) => {
                    clearTimeout(timeout);
                    console.error('❌ MediaPipe initialize() failed:', initErr);
                    
                    if (this.useLocal && this.retryCount === 0) {
                        console.log('🔄 Retrying initialization using CDN...');
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
                console.error('❌ GestureService constructor failed:', error);

                if (this.useLocal && this.retryCount === 0) {
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
        if (this.isRunning) {
            console.warn('GestureService is already running, updating callback and video element.');
            this.videoElement = videoElement;
            currentResultsCallback = onResults;
            return;
        }
        
        if (!globalHandsInstance) {
            console.log('🔄 Lazy-initializing GestureService...');
            await this.initialize();
        }

        if (!globalHandsInstance) throw new Error('MediaPipe not initialized after attempt.');

        console.log('🎥 Starting gesture detection tracking loop...');

        this.videoElement = videoElement;
        currentResultsCallback = onResults;
        this.isRunning = true;
        this.frameCount = 0;
        this.lastFpsTime = performance.now();

        const processFrame = async () => {
            if (!this.isRunning || !this.videoElement || !globalHandsInstance) return;

            // Only process if video is ready and has dimensions
            if (this.videoElement.readyState >= 2 && this.videoElement.videoWidth > 0 && this.canvasElement && this.canvasCtx) {
                const startTime = performance.now();
                try {
                    // Update canvas dimensions if they changed
                    if (this.canvasElement.width !== this.videoElement.videoWidth || 
                        this.canvasElement.height !== this.videoElement.videoHeight) {
                        this.canvasElement.width = this.videoElement.videoWidth;
                        this.canvasElement.height = this.videoElement.videoHeight;
                    }

                    // Draw video to off-screen buffer
                    this.canvasCtx.drawImage(this.videoElement, 0, 0);

                    // Process input
                    await globalHandsInstance.send({ image: this.canvasElement });
                    
                    const endTime = performance.now();
                    this.currentLatency = endTime - startTime;
                    
                    this.frameCount++;
                    if (endTime - this.lastFpsTime >= 5000) { // Log performance every 5 seconds instead of 1
                        this.currentFps = Math.round(this.frameCount / 5);
                        this.frameCount = 0;
                        this.lastFpsTime = endTime;
                        console.log(`📊 Gesture Perf: ${this.currentFps} FPS | ${this.currentLatency.toFixed(1)}ms`);
                    }
                } catch (err) {
                    console.error('MediaPipe processing error:', err);
                }
            }

            if (this.isRunning) {
                if ('requestVideoFrameCallback' in (this.videoElement as any)) {
                    (this.videoElement as any).requestVideoFrameCallback(processFrame);
                } else {
                    requestAnimationFrame(processFrame);
                }
            }
        };

        processFrame();
        console.log('👋 Gesture tracking active');
    }

    stop() {
        this.isRunning = false;
        this.videoElement = null;
        currentResultsCallback = null;
        console.log('🛑 Gesture tracking stopped');
    }
}

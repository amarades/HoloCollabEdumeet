import type { NormalizedLandmark } from '@mediapipe/hands';

export interface GestureResult {
    type: 'none' | 'pointing' | 'open_left' | 'open_right' | 'pinch_in' | 'pinch_out' | 'fist' | 'fist_left' | 'fist_right';
    confidence: number;
    position?: { x: number; y: number; z: number };
    scale?: number;
    rotation?: { left: boolean; right: boolean };
}

export class GestureRecognizer {
    private previousHandPosition: { x: number; y: number; z: number } | null = null;
    private gestureHistory: GestureResult[] = [];
    private readonly HISTORY_SIZE = 15;

    private previousTime = Date.now();

    recognize(landmarks: NormalizedLandmark[]): GestureResult {
        // Landmark indices
        const indexTip = landmarks[8];

        // Calculate finger extension
        const fingerExtended = this.calculateFingerExtensions(landmarks);
        const extendedCount = fingerExtended.filter(Boolean).length;

        // Detect gesture type
        let gesture: GestureResult = { type: 'none', confidence: 0 };

        const handCenter = this.calculateHandCenter(landmarks);
        const swipe = this.detectSwipe(handCenter);

        // 1. SWIPE - Fast movement (rotates model)
        if (swipe.left || swipe.right) {
            gesture = {
                type: swipe.left ? 'fist_left' : 'fist_right', // Mapping to existing types for spin
                confidence: 0.9,
                rotation: swipe
            };
        }
        // 2. FIST - All fingers closed (zoom)
        else if (extendedCount === 0) {
            gesture = {
                type: 'fist',
                confidence: 0.95
            };
        }
        // 3. POINTING - Only index finger extended (selection)
        else if (extendedCount === 1 && fingerExtended[1]) {
            gesture = {
                type: 'pointing',
                confidence: 0.9,
                position: {
                    x: (0.5 - indexTip.x) * 2, // Corrected Mirroring to NDC [-1, 1]
                    y: (0.5 - indexTip.y) * 2, // Corrected Y-axis to NDC [-1, 1]
                    z: indexTip.z
                }
            };
        }
        // 4. OPEN HAND - All fingers extended (reset)
        else if (extendedCount >= 3) { // Lowered from 4 to 3 for better reliability
            gesture = {
                type: 'open_left', // Using open_left as the signal for "Open Hand"
                confidence: 0.8
            };
        }

        // Smooth gesture using history
        return this.smoothGesture(gesture);
    }

    private calculateFingerExtensions(landmarks: NormalizedLandmark[]): boolean[] {
        const fingerConfigs = [
            { tip: 4, pip: 3, mcp: 2, wrist: 0 },    // Thumb
            { tip: 8, pip: 6, mcp: 5 },             // Index
            { tip: 12, pip: 10, mcp: 9 },           // Middle
            { tip: 16, pip: 14, mcp: 13 },          // Ring
            { tip: 20, pip: 18, mcp: 17 }           // Pinky
        ];

        return fingerConfigs.map((config, index) => {
            const tip = landmarks[config.tip];
            const mcp = landmarks[config.mcp];

            if (index === 0) {
                // Thumb: Compare distance from tip to pinky MCP vs IP to pinky MCP
                // This checks if the thumb is "tucked in"
                const pinkyMCP = landmarks[17];
                const tipDist = this.calculateDistance(tip, pinkyMCP);
                const ipDist = this.calculateDistance(landmarks[config.pip], pinkyMCP);
                return tipDist > ipDist * 1.2;
            } else {
                // Other fingers: Use the "pseudo-angle" (tip-to-mcp distance)
                // Normalize by the length of the hand (wrist to middle MCP)
                const wrist = landmarks[0];
                const middleMCP = landmarks[9];
                const handSize = this.calculateDistance(wrist, middleMCP);
                
                const tipToMcpDist = this.calculateDistance(tip, mcp);
                
                // If tip-to-mcp distance is > 70% of hand size, finger is extended
                // This is much more reliable than simple Y-coordinate checks
                return tipToMcpDist > handSize * 0.7;
            }
        });
    }

    private calculateDistance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    }

    private calculateHandCenter(landmarks: NormalizedLandmark[]) {
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        return {
            x: (wrist.x + middleMCP.x) / 2,
            y: (wrist.y + middleMCP.y) / 2,
            z: (wrist.z + middleMCP.z) / 2
        };
    }

    private detectSwipe(handCenter: { x: number; y: number; z: number }) {
        if (!this.previousHandPosition) {
            this.previousHandPosition = handCenter;
            return { left: false, right: false };
        }

        const currentTime = Date.now();
        const deltaTime = (currentTime - this.previousTime) / 1000;
        this.previousTime = currentTime;

        const deltaX = handCenter.x - this.previousHandPosition.x;
        const velocity = deltaX / (deltaTime || 0.001);

        this.previousHandPosition = handCenter;

        // Higher threshold for swipe to distinguish from jitter
        const swipeThreshold = 0.8;

        return {
            left: velocity < -swipeThreshold, 
            right: velocity > swipeThreshold 
        };
    }

    private smoothGesture(gesture: GestureResult): GestureResult {
        this.gestureHistory.push(gesture);
        if (this.gestureHistory.length > this.HISTORY_SIZE) {
            this.gestureHistory.shift();
        }

        // Use most common gesture in history for stability
        const gestureCounts: { [key: string]: number } = {};
        this.gestureHistory.forEach(g => {
            gestureCounts[g.type] = (gestureCounts[g.type] || 0) + 1;
        });

        const mostCommon = Object.keys(gestureCounts).reduce((a, b) =>
            gestureCounts[a] > gestureCounts[b] ? a : b
        );

        const validTypes: GestureResult['type'][] = ['none', 'pointing', 'open_left', 'open_right', 'pinch_in', 'pinch_out', 'fist', 'fist_left', 'fist_right'];
        const smoothedType: GestureResult['type'] = validTypes.includes(mostCommon as GestureResult['type'])
            ? (mostCommon as GestureResult['type'])
            : 'none';

        return { ...gesture, type: smoothedType };
    }

    reset() {
        this.previousHandPosition = null;
        this.gestureHistory = [];
    }
}

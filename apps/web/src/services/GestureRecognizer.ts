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
    private readonly HISTORY_SIZE = 5;

    private previousTime = Date.now();

    recognize(landmarks: NormalizedLandmark[]): GestureResult {
        // Landmark indices
        // Landmark indices from MediaPipe. We use some directly, others are mapped in calculateFingerExtensions.
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Calculate distances for finger extension
        const fingerExtended = this.calculateFingerExtensions(landmarks);
        const extendedCount = fingerExtended.filter(Boolean).length;

        // Detect gesture type
        let gesture: GestureResult = { type: 'none', confidence: 0 };

        // 1. FIST - All fingers closed
        if (extendedCount === 0) {
            const handCenter = this.calculateHandCenter(landmarks);
            const rotation = this.detectRotationDirection(handCenter);

            gesture = {
                type: rotation.left ? 'fist_left' : (rotation.right ? 'fist_right' : 'fist'),
                confidence: 0.95,
                rotation
            };
        }

        // 2. POINTING - Only index finger extended
        else if (extendedCount === 1 && fingerExtended[1]) {
            const position = {
                x: (indexTip.x - 0.5) * 10,
                y: (0.5 - indexTip.y) * 10,
                z: -indexTip.z * 10
            };
            gesture = {
                type: 'pointing',
                confidence: 0.9,
                position
            };
        }

        // 3. PINCH - Thumb and index close/far
        else if (fingerExtended[0] && fingerExtended[1]) {
            const pinchDistance = this.calculateDistance(thumbTip, indexTip);
            const isPinching = pinchDistance < 0.08;

            // Zoom in when pinching (fingers close), zoom out when fingers far apart
            const scaleMultiplier = isPinching ? 0.8 : 1.2; // Gradual zoom

            gesture = {
                type: isPinching ? 'pinch_in' : 'pinch_out',
                confidence: 0.85,
                scale: scaleMultiplier
            };
        }

        // 4. OPEN HAND - All fingers extended (4 or 5 fingers)
        else if (extendedCount >= 4) {
            // Determine rotation direction based on hand movement
            const handCenter = this.calculateHandCenter(landmarks);
            const rotation = this.detectRotationDirection(handCenter);

            gesture = {
                type: rotation.left ? 'open_left' : (rotation.right ? 'open_right' : 'none'),
                confidence: 0.8,
                rotation
            };
        }

        // Smooth gesture using history
        return this.smoothGesture(gesture);
    }

    private calculateFingerExtensions(landmarks: NormalizedLandmark[]): boolean[] {
        // More robust finger extension detection
        const fingerConfigs = [
            { tip: 4, pip: 3, mcp: 2 },    // Thumb (special case)
            { tip: 8, pip: 6, mcp: 5 },    // Index
            { tip: 12, pip: 10, mcp: 9 },  // Middle
            { tip: 16, pip: 14, mcp: 13 }, // Ring
            { tip: 20, pip: 18, mcp: 17 }  // Pinky
        ];

        return fingerConfigs.map((config, index) => {
            const tip = landmarks[config.tip];
            const pip = landmarks[config.pip];
            const mcp = landmarks[config.mcp];

            if (index === 0) {
                // Thumb: check X distance (thumb extends sideways)
                const thumbDist = Math.abs(tip.x - mcp.x);
                return thumbDist > 0.1;
            } else {
                // Other fingers: check if tip is significantly above pip (finger is straight)
                const tipToPipDist = this.calculateDistance(tip, pip);
                const pipToMcpDist = this.calculateDistance(pip, mcp);

                // Finger is extended if tip-to-pip distance is greater than pip-to-mcp
                // AND tip is above pip in Y coordinate (screen space)
                return tipToPipDist > pipToMcpDist * 0.8 && tip.y < pip.y;
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

    private detectRotationDirection(handCenter: { x: number; y: number; z: number }) {
        if (!this.previousHandPosition) {
            this.previousHandPosition = handCenter;
            return { left: false, right: false };
        }

        const currentTime = Date.now();
        const deltaTime = (currentTime - this.previousTime) / 1000; // Convert to seconds
        this.previousTime = currentTime;

        // Calculate velocity
        const deltaX = handCenter.x - this.previousHandPosition.x;
        const velocity = deltaX / deltaTime;

        // Update previous position
        this.previousHandPosition = handCenter;

        // Threshold for rotation detection (pixels per second)
        const threshold = 0.3;

        return {
            left: velocity < -threshold,
            right: velocity > threshold
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

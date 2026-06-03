import type { NormalizedLandmark } from '@mediapipe/hands';

export interface GestureResult {
    // fist       = all 4 fingers closed → zoom OUT
    // pinch      = thumb+index close together → zoom IN
    // pointing   = index extended, others folded → drag/move model
    // open_hand  = 3+ fingers extended, slow/still → reset
    // open_left  = 3+ fingers extended, fast leftward → rotate left
    // open_right = 3+ fingers extended, fast rightward → rotate right
    // none       = no confident gesture
    type: 'none' | 'pointing' | 'open_hand' | 'open_left' | 'open_right' | 'fist' | 'pinch';
    confidence: number;
    position?: { x: number; y: number; z: number };
    // Raw velocity so the hook can also read it independently of smoothed type
    velocityX: number;
}

export class GestureRecognizer {
    // Smoothing only for stable gestures (fist, pointing, open_hand, pinch)
    // Directional variants (open_left/open_right) bypass smoothing — see below
    private readonly HISTORY_SIZE = 3; // Reduced for faster response
    private gestureHistory: GestureResult[] = [];

    // Velocity tracking
    private previousHandCenter: { x: number; y: number } | null = null;
    private previousTime = 0;

    // Normalized coords/second needed to count as a directional swipe
    private readonly SWIPE_THRESHOLD = 0.40;

    recognize(landmarks: NormalizedLandmark[]): GestureResult {
        const indexTip  = landmarks[8];
        const thumbTip  = landmarks[4];
        const fingerExt = this.calculateFingerExtensions(landmarks);

        // Index/Middle/Ring/Pinky extension (ignore thumb for most gestures)
        const [, idxExt, midExt, ringExt, pinkyExt] = fingerExt;
        const fourCount = [idxExt, midExt, ringExt, pinkyExt].filter(Boolean).length;

        const handCenter = this.calculateHandCenter(landmarks);
        const velocityX  = this.calculateVelocityX(handCenter);

        let raw: GestureResult = { type: 'none', confidence: 0, velocityX };

        // ── 1. PINCH: thumb tip and index tip very close → zoom IN ───────────
        const pinchDist = this.dist2D(thumbTip, indexTip);
        const wristToMid = this.dist2D(landmarks[0], landmarks[9]);
        if (pinchDist < wristToMid * 0.40) {
            raw = { type: 'pinch', confidence: 0.93, velocityX };
        }

        else if (fourCount === 0 || (fourCount === 1 && !idxExt)) {
            // Relaxed fist: either 0 fingers extended, or 1 finger that isn't the index
            raw = {
                type: 'fist',
                confidence: 0.95,
                position: { x: handCenter.x, y: handCenter.y, z: 0 },
                velocityX,
            };
        }

        // ── 3. POINTING: index extended, at least 2 of middle/ring/pinky folded
        //    (relaxed — allows slight middle finger extension which is natural)
        else if (idxExt && [midExt, ringExt, pinkyExt].filter(Boolean).length <= 1) {
            raw = {
                type: 'pointing',
                confidence: 0.90,
                position: {
                    x: 1.0 - indexTip.x,   // Mirror X: webcam is flipped horizontally
                    y: indexTip.y,
                    z: indexTip.z,
                },
                velocityX,
            };
        }

        // ── 4. OPEN HAND: 3+ fingers extended ────────────────────────────────
        //    Direction is decided BEFORE smoothing to avoid the majority-vote problem.
        //    open_left / open_right are returned directly (not smoothed) so fast
        //    swipe gestures aren't washed out by the history buffer.
        else if (fourCount >= 2) {
            if (velocityX < -this.SWIPE_THRESHOLD) {
                // Raw video moves left (physically moves right if mirrored)
                return { type: 'open_right', confidence: 0.88, velocityX };
            } else if (velocityX > this.SWIPE_THRESHOLD) {
                // Raw video moves right (physically moves left if mirrored)
                return { type: 'open_left', confidence: 0.88, velocityX };
            } else {
                // Slow/stationary → reset (goes through smoothing for stability)
                raw = { type: 'open_hand', confidence: 0.82, velocityX };
            }
        }

        return this.smoothGesture(raw);
    }

    private calculateFingerExtensions(landmarks: NormalizedLandmark[]): boolean[] {
        const configs = [
            { tip: 4,  pip: 3,  mcp: 2 },  // Thumb
            { tip: 8,  pip: 6,  mcp: 5 },  // Index
            { tip: 12, pip: 10, mcp: 9 },  // Middle
            { tip: 16, pip: 14, mcp: 13 }, // Ring
            { tip: 20, pip: 18, mcp: 17 }, // Pinky
        ];

        return configs.map((cfg, i) => {
            const tip = landmarks[cfg.tip];
            const mcp = landmarks[cfg.mcp];

            if (i === 0) {
                // Thumb: extended if tip is further from pinky MCP than the IP joint
                const pinkyMCP = landmarks[17];
                return this.dist2D(tip, pinkyMCP) > this.dist2D(landmarks[cfg.pip], pinkyMCP) * 1.15;
            }
            // Other fingers: tip-to-MCP distance > 50% of hand size (relaxed from 65%)
            const handSize = this.dist2D(landmarks[0], landmarks[9]);
            return this.dist2D(tip, mcp) > handSize * 0.50;
        });
    }

    private calculateHandCenter(landmarks: NormalizedLandmark[]) {
        const wrist     = landmarks[0];
        const middleMCP = landmarks[9];
        return {
            x: (wrist.x + middleMCP.x) / 2,
            y: (wrist.y + middleMCP.y) / 2,
        };
    }

    /**
     * Returns horizontal velocity in normalized-coordinate-units/second.
     * Positive = moving right, negative = moving left.
     * Updated every frame; always returns fresh value (not smoothed).
     */
    private calculateVelocityX(center: { x: number; y: number }): number {
        const now = Date.now();
        if (!this.previousHandCenter || this.previousTime === 0) {
            this.previousHandCenter = center;
            this.previousTime       = now;
            return 0;
        }
        const dt = (now - this.previousTime) / 1000;
        const dx = center.x - this.previousHandCenter.x;
        this.previousHandCenter = center;
        this.previousTime       = now;
        return dt > 0.002 ? dx / dt : 0;
    }

    private dist2D(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    /**
     * Majority-vote smoothing over the last HISTORY_SIZE frames.
     * Only stable gestures (fist, pointing, open_hand, pinch) go through this.
     * Directional gestures (open_left, open_right) skip this entirely.
     */
    private smoothGesture(gesture: GestureResult): GestureResult {
        this.gestureHistory.push(gesture);
        if (this.gestureHistory.length > this.HISTORY_SIZE) {
            this.gestureHistory.shift();
        }

        const counts: Record<string, number> = {};
        for (const g of this.gestureHistory) {
            counts[g.type] = (counts[g.type] || 0) + 1;
        }

        const best = Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b
        ) as GestureResult['type'];

        return { ...gesture, type: best };
    }

    reset() {
        this.gestureHistory     = [];
        this.previousHandCenter = null;
        this.previousTime       = 0;
    }
}

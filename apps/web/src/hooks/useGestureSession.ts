import { useEffect, useRef, useState } from 'react';
import type { Results } from '@mediapipe/hands';
import { GestureService } from '../services/GestureService';
import { GestureRecognizer } from '../services/GestureRecognizer';
import { PermissionsService } from '../services/PermissionsService';
import { ARScene } from '../three/ARScene';
import { SocketManager } from '../realtime/SocketManager';

interface UseGestureSessionProps {
    gesturesEnabled: boolean;
    arSceneRef: React.MutableRefObject<ARScene | null>;
    socketInstance: SocketManager | null;
    user: any;
    videoElement: HTMLVideoElement | null;
    isApproved: boolean;
}

// Scale normalized finger-tip delta (0-1 range) → 3D scene units per frame
const POINTER_SENSITIVITY = 1000;
const ROTATION_STEP = 0.25;
const ZOOM_STEP = 0.50;

// How many consecutive frames open_hand must be held to fire a reset
// (prevents accidental resets when transitioning through open hand)
const RESET_HOLD_FRAMES = 25; // Roughly 1.5 seconds at 15fps

// After switching to a new gesture type, ignore all other gesture types
// for this many ms. Prevents jitter mid-transition.
const SWITCH_COOLDOWN_MS = 200;

export const useGestureSession = ({
    gesturesEnabled,
    arSceneRef,
    socketInstance,
    user,
    videoElement,
    isApproved
}: UseGestureSessionProps) => {
    const gestureServiceRef    = useRef<GestureService | null>(null);
    const gestureRecognizerRef = useRef(new GestureRecognizer());
    const [currentGesture, setCurrentGesture] = useState<string>('None');

    const gesturesEnabledRef = useRef(gesturesEnabled);

    // Previous pointing finger position for delta calculation
    const lastPointingPosRef = useRef<{ x: number; y: number } | null>(null);

    // Count consecutive open_hand frames to gate the reset trigger
    const openHandFramesRef = useRef(0);

    // Currently active gesture type (last accepted)
    const activeGestureRef = useRef<string>('none');
    // Timestamp after which a different gesture type is allowed to take over
    const switchAllowedAtRef = useRef<number>(0);

    // The resolved video element (found by polling or prop)
    const resolvedVideoRef = useRef<HTMLVideoElement | null>(null);

    // Throttle WebSocket broadcasts
    const lastGestureEmitRef = useRef<{ type: string; at: number }>({ type: 'none', at: 0 });

    useEffect(() => {
        gesturesEnabledRef.current = gesturesEnabled;
        if (gesturesEnabled) {
            startTracking(resolvedVideoRef.current ?? undefined);
        } else {
            stopTracking();
        }
    }, [gesturesEnabled]);

    useEffect(() => {
        if (!isApproved) return;

        // videoElement may be null at first render (camera stream not yet attached).
        // Poll until it's available, then initialize.
        let active = true;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;

        const tryInit = async (el: HTMLVideoElement) => {
            const svc = new GestureService();
            await svc.initialize();
            if (!active) { svc.stop(); return; }
            gestureServiceRef.current = svc;
            resolvedVideoRef.current = el;  // store for re-use when toggling gestures
            if (gesturesEnabledRef.current) startTracking(el);
        };

        const waitForVideo = () => {
            // Accept the passed videoElement OR search the DOM for the video tag
            const el = videoElement ?? (document.querySelector('video[autoplay]') as HTMLVideoElement | null);
            if (el && el.readyState >= 1) {
                tryInit(el);
            } else if (active) {
                pollTimer = setTimeout(waitForVideo, 500);
            }
        };

        waitForVideo();

        return () => {
            active = false;
            if (pollTimer) clearTimeout(pollTimer);
            stopTracking();
            gestureServiceRef.current = null;
        };
    }, [videoElement, isApproved]);

    const startTracking = (el?: HTMLVideoElement | null) => {
        const video = el ?? resolvedVideoRef.current ?? videoElement;
        if (!gestureServiceRef.current || !video || !gesturesEnabledRef.current) return;

        gestureServiceRef.current.start(video, (results: Results) => {
            const landmarks = results.multiHandLandmarks?.[0];
            if (!landmarks) {
                setCurrentGesture('None');
                gestureRecognizerRef.current.reset();
                lastPointingPosRef.current = null;
                openHandFramesRef.current  = 0;
                activeGestureRef.current   = 'none';
                return;
            }

            const detected = gestureRecognizerRef.current.recognize(landmarks);
            const now = Date.now();

            // ── Gesture switch cooldown ──────────────────────────────────────
            // When a gesture changes type, impose a short cooldown before
            // accepting a different type. The SAME type always passes through.
            // This prevents hand jitter during transitions from mis-firing.
            if (detected.type !== 'none' && detected.type !== activeGestureRef.current) {
                if (now < switchAllowedAtRef.current) {
                    // Still in cooldown — keep showing old gesture label but don't switch
                    return;
                }
                // Cooldown expired — accept the new gesture and start a fresh cooldown
                activeGestureRef.current  = detected.type;
                switchAllowedAtRef.current = now + SWITCH_COOLDOWN_MS;
            }
            // ─────────────────────────────────────────────────────────────────

            // Reset pointing anchor when not pointing
            if (detected.type !== 'pointing') {
                lastPointingPosRef.current = null;
            }

            // Track consecutive open_hand frames for reset gating
            if (detected.type === 'open_hand') {
                openHandFramesRef.current++;
            } else if (detected.type !== 'none') {
                // If we detected a DIFFERENT gesture, reset immediately
                openHandFramesRef.current = 0;
            } else {
                // If we detected 'none', allow a 3-frame "flicker" grace period before resetting counter
                // This makes holding the pose much more reliable.
                if (openHandFramesRef.current > 0) {
                    // Just don't increment, but don't reset yet. 
                    // We can use a separate flicker ref if we want to be more precise,
                    // but for now, just let it stay at the same value.
                }
            }

            // HUD label
            const labels: Record<string, string> = {
                fist:       '✊ Zoom In',
                pinch:      '🤏 Zoom Out',
                pointing:   '☝️ Move Model',
                open_hand:  '🖐️ Reset (hold)',
                open_left:  '⬅️ Rotate Left',
                open_right: '➡️ Rotate Right',
                none:       'None',
            };
            setCurrentGesture(labels[detected.type] ?? detected.type);

            if (detected.type === 'none' || detected.confidence < 0.65) return;

            const canInteract = PermissionsService.getInstance().canInteract();
            if (canInteract && arSceneRef.current) {
                const scene = arSceneRef.current;

                // Pause the auto-rotation so it doesn't fight gesture controls
                scene.setGestureActive();

                switch (detected.type) {

                    // ── FIST → zoom IN (camera moves closer) ─────────────────
                    case 'fist':
                        scene.zoomCamera(-ZOOM_STEP);
                        break;

                    // ── PINCH → zoom OUT (camera moves back) ─────────────────
                    case 'pinch':
                        scene.zoomCamera(+ZOOM_STEP);
                        break;

                    // ── OPEN HAND held still → reset ─────────────────────────
                    case 'open_hand':
                        // Fire only at the exact frame the threshold is crossed
                        if (openHandFramesRef.current === RESET_HOLD_FRAMES) {
                            scene.resetView();
                        }
                        break;

                    // ── OPEN LEFT → rotate model counter-clockwise ───────────
                    case 'open_left':
                        scene.rotateModel('y', -ROTATION_STEP);
                        break;

                    // ── OPEN RIGHT → rotate model clockwise ─────────────────
                    case 'open_right':
                        scene.rotateModel('y', +ROTATION_STEP);
                        break;

                    // ── POINTING → drag model like a mouse cursor ────────────
                    case 'pointing':
                        if (detected.position) {
                            const { x, y } = detected.position;
                            if (lastPointingPosRef.current) {
                                const dx = x - lastPointingPosRef.current.x;
                                const dy = y - lastPointingPosRef.current.y;
                                scene.moveModelByDelta(
                                    dx * POINTER_SENSITIVITY,
                                    dy * POINTER_SENSITIVITY   // Corrected Y mapping: finger up → model up
                                );
                            }
                            lastPointingPosRef.current = { x, y };
                        }
                        break;
                }
            }

            // Throttled WebSocket broadcast
            const shouldEmit =
                lastGestureEmitRef.current.type !== detected.type ||
                now - lastGestureEmitRef.current.at > 750;

            if (shouldEmit && socketInstance) {
                lastGestureEmitRef.current = { type: detected.type, at: now };
                socketInstance.emit('GESTURE_DETECTED', {
                    gesture:    detected.type,
                    user:       user?.name || 'You',
                    confidence: detected.confidence,
                });
            }
        }).catch((err) => {
            console.error('Failed to start gesture service:', err);
        });
    };

    const stopTracking = () => {
        setCurrentGesture('None');
        gestureRecognizerRef.current.reset();
        gestureServiceRef.current?.stop();
    };

    return { currentGesture, gestureRecognizerRef };
};

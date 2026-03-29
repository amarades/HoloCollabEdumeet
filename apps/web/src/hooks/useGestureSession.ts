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

export const useGestureSession = ({
    gesturesEnabled,
    arSceneRef,
    socketInstance,
    user,
    videoElement,
    isApproved
}: UseGestureSessionProps) => {
    const gestureServiceRef = useRef<GestureService | null>(null);
    const gestureRecognizerRef = useRef(new GestureRecognizer());
    const [currentGesture, setCurrentGesture] = useState<string>('None');
    
    const swipeAnimatingRef = useRef(false);
    const swipeCooldownRef = useRef(0);
    const lastGestureEmitRef = useRef<{ type: string; at: number }>({ type: 'none', at: 0 });
    const gesturesEnabledRef = useRef(gesturesEnabled);
    const lastPointingPosRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        gesturesEnabledRef.current = gesturesEnabled;
        if (gesturesEnabled) {
            startTracking();
        } else {
            stopTracking();
        }
    }, [gesturesEnabled]);

    const triggerSwipeSpin = (direction: 1 | -1) => {
        const now = Date.now();
        if (swipeAnimatingRef.current || now - swipeCooldownRef.current < 1200) return;
        if (!arSceneRef.current) return;

        swipeAnimatingRef.current = true;
        swipeCooldownRef.current = now;

        const total = Math.PI * 2;
        let rotated = 0;
        const step = 0.22;

        const animate = () => {
            if (!arSceneRef.current) {
                swipeAnimatingRef.current = false;
                return;
            }
            const delta = Math.min(step, total - rotated);
            arSceneRef.current.rotateModel('y', direction * delta);
            rotated += delta;

            if (rotated < total) {
                requestAnimationFrame(animate);
            } else {
                swipeAnimatingRef.current = false;
            }
        };

        requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (!videoElement || !isApproved) return;

        let active = true;

        const initGestureService = async () => {
            const gestureService = new GestureService();
            await gestureService.initialize();
            if (!active) {
                gestureService.stop();
                return;
            }
            gestureServiceRef.current = gestureService;
            
            // Re-evaluate using the latest active state
            if (gesturesEnabledRef.current) {
                startTracking();
            }
        };

        initGestureService();

        return () => {
            active = false;
            stopTracking();
            gestureServiceRef.current = null;
        };
    }, [videoElement, isApproved]);

    const startTracking = () => {
        if (!gestureServiceRef.current || !videoElement || !gesturesEnabledRef.current) return;

        gestureServiceRef.current.start(videoElement, (results: Results) => {
            const landmarks = results.multiHandLandmarks?.[0];
            if (!landmarks) {
                setCurrentGesture('None');
                gestureRecognizerRef.current.reset();
                return;
            }

            const detected = gestureRecognizerRef.current.recognize(landmarks);
            setCurrentGesture(detected.type.replace('_', ' ').toUpperCase());
            
            if (detected.type === 'none' || detected.confidence < 0.7) return;

            const canInteract = PermissionsService.getInstance().canInteract();
            if (canInteract && arSceneRef.current) {
                if (detected.type === 'fist') {
                    arSceneRef.current.zoomCamera(0.05);
                } else if (detected.type === 'open_left' || detected.type === 'open_right') {
                    arSceneRef.current.resetTransform();
                    arSceneRef.current.resetView();
                } else if (detected.type === 'pointing' && detected.position) {
                    if (lastPointingPosRef.current) {
                        const deltaX = detected.position.x - lastPointingPosRef.current.x;
                        const deltaY = detected.position.y - lastPointingPosRef.current.y;
                        // Multiply by a sensitivity factor, e.g., 200, to make rotation responsive
                        arSceneRef.current.rotateModelByDelta(deltaX * 200, deltaY * 200);
                    }
                    lastPointingPosRef.current = { x: detected.position.x, y: detected.position.y };
                    arSceneRef.current.selectAt(detected.position.x, detected.position.y);
                } else if (detected.type === 'fist_left') {
                    triggerSwipeSpin(-1);
                } else if (detected.type === 'fist_right') {
                    triggerSwipeSpin(1);
                }
            }

            // Reset pointing position if gesture is no longer pointing
            if (detected.type !== 'pointing') {
                lastPointingPosRef.current = null;
            }

            const now = Date.now();
            const shouldEmit =
                lastGestureEmitRef.current.type !== detected.type ||
                now - lastGestureEmitRef.current.at > 750;
            
            if (shouldEmit && socketInstance) {
                lastGestureEmitRef.current = { type: detected.type, at: now };
                socketInstance.emit('GESTURE_DETECTED', {
                    gesture: detected.type,
                    user: user?.name || 'You',
                    confidence: detected.confidence,
                });
            }
        }).catch((error) => {
            console.error('Failed to start gesture service:', error);
        });
    };

    const stopTracking = () => {
        setCurrentGesture('None');
        gestureRecognizerRef.current.reset();
        gestureServiceRef.current?.stop();
    };

    return {
        currentGesture,
        gestureRecognizerRef
    };
};

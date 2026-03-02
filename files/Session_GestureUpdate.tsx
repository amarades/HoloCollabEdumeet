// Session.tsx - UPDATED GESTURE DETECTION SECTION
// Replace lines 104-208 in your existing Session.tsx with this code

// After line 103: await gestureService.initialize();

const gestureRecognizer = new GestureRecognizer();

const startGestureDetection = () => {
    if (!videoRef.current) return;
        
    console.log('Starting gesture detection with improved recognizer');
    console.log('Video readyState:', videoRef.current.readyState);
    
    // Start processing video frames for gestures
    gestureService.start(videoRef.current!, (results) => {
        // Only emit gestures if enabled by the user
        if (!gesturesEnabledRef.current) return;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Use improved gesture recognizer
            const gesture = gestureRecognizer.recognize(landmarks);
            
            // Apply gesture controls to the model
            if (scene.currentModel && gesture.confidence > 0.7) {
                switch (gesture.type) {
                    case 'fist':
                        // Reset model to initial state
                        console.log('🤜 FIST: Resetting model');
                        scene.currentModel.rotation.set(0, 0, 0);
                        scene.currentModel.scale.setScalar(1);
                        scene.currentModel.position.set(0, 0, 0);
                        scene.camera.position.set(0, 0, 5);
                        setCurrentGesture('Fist - Reset');
                        break;
                    
                    case 'pointing':
                        // Move model based on finger position
                        if (gesture.position) {
                            console.log('☝️ POINTING: Moving model');
                            scene.currentModel.position.set(
                                gesture.position.x,
                                gesture.position.y,
                                gesture.position.z
                            );
                            setCurrentGesture('Pointing - Move');
                        }
                        break;
                    
                    case 'open_left':
                        // Rotate model left
                        console.log('👈 OPEN LEFT: Rotating left');
                        scene.currentModel.rotation.y -= 0.05; // Rotate left
                        setCurrentGesture('Open Hand - Rotate Left');
                        break;
                    
                    case 'open_right':
                        // Rotate model right
                        console.log('👉 OPEN RIGHT: Rotating right');
                        scene.currentModel.rotation.y += 0.05; // Rotate right
                        setCurrentGesture('Open Hand - Rotate Right');
                        break;
                    
                    case 'pinch_in':
                        // Zoom in (pinch close)
                        console.log('🤏 PINCH IN: Zooming in');
                        if (gesture.scale) {
                            const currentScale = scene.currentModel.scale.x;
                            const newScale = Math.max(0.5, currentScale * gesture.scale);
                            scene.currentModel.scale.setScalar(newScale);
                        }
                        setCurrentGesture('Pinch Close - Zoom In');
                        break;
                    
                    case 'pinch_out':
                        // Zoom out (pinch far)
                        console.log('👌 PINCH OUT: Zooming out');
                        if (gesture.scale) {
                            const currentScale = scene.currentModel.scale.x;
                            const newScale = Math.min(3, currentScale * gesture.scale);
                            scene.currentModel.scale.setScalar(newScale);
                        }
                        setCurrentGesture('Pinch Far - Zoom Out');
                        break;
                    
                    default:
                        setCurrentGesture('Hand Detected');
                }
                
                // Notify state change to sync with other users
                scene.notifyStateChange();
            }
            
            // Convert MediaPipe landmarks to plain array for serialization
            const landmarksArray = Array.from(landmarks).map(landmark => ({
                x: landmark.x,
                y: landmark.y,
                z: landmark.z
            }));
            
            // Emit gesture data to the socket
            if (socket) {
                socket.emit('GESTURE_LANDMARKS', {
                    landmarks: landmarksArray,
                    gesture: gesture.type,
                    confidence: gesture.confidence,
                    timestamp: Date.now()
                });
            }
        } else {
            setCurrentGesture('No Hand Detected');
        }
    });
    
    console.log('✅ Gesture service started with improved detection');
};

// Wait for video to be ready before starting gesture detection
setTimeout(startGestureDetection, 2000);

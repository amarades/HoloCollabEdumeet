
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ARScene } from '../three/ARScene';
import type { SlideData } from '../three/ARScene';

import { SocketManager } from '../realtime/SocketManager';
import { WebRTCManager } from '../realtime/WebRTCManager';
import { VideoManager } from '../services/VideoManager';
import { PermissionsService } from '../services/PermissionsService';
import { GestureService } from '../services/GestureService';
import { GestureRecognizer } from '../services/GestureRecognizer';
import type { Results } from '@mediapipe/hands';
import { useAuth } from '../context/AuthContext';
import { useScene } from '../hooks/useScene';
import { useSessionControls, REACTIONS } from '../hooks/useSessionControls';
import { useSessionRealtimeListeners } from '../hooks/useSessionRealtimeListeners';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Hand, Box, Sparkles, Users,
    MessageSquare, X, CheckCircle2, Copy, Check,
    Columns, Maximize2, Monitor, MonitorOff, ShieldCheck,
    Presentation, AlertTriangle, FileUp
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker using local Vite asset
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { apiRequest } from '../services/api';


import { SessionSidebar } from '../components/session/wrapper/SessionSidebar';
import { ChatPanel } from '../components/session/layout/ChatPanel';
import { Whiteboard } from '../components/session/tools/Whiteboard';
import { QuizPanel } from '../components/session/tools/QuizPanel';
import { MediaPanel } from '../components/session/tools/MediaPanel';
import { SettingsPanel } from '../components/session/tools/SettingsPanel';
import { ScenePanel } from '../components/session/tools/ScenePanel';
import { HostControls } from '../components/session/tools/HostControls';
import { AIAssistant } from '../components/AIAssistant';
import { VideoGrid } from '../components/VideoGrid';
import { ConnectionQuality } from '../components/ConnectionQuality';
import { ParticipantApproval } from '../components/session/ParticipantApproval';

const Session = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    // const { videoSettings } = useSettings();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const scenePanelFileInputRef = useRef<HTMLInputElement>(null);

    const arSceneRef = useRef<ARScene | null>(null);
    const socketRef = useRef<SocketManager | null>(null);
    const videoManagerRef = useRef<VideoManager | null>(null);
    const gestureServiceRef = useRef<GestureService | null>(null);
    const webRTCManagerRef = useRef<WebRTCManager | null>(null);

    const [socketInstance, setSocketInstance] = useState<SocketManager | null>(null);

    const [users, setUsers] = useState<any[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [gesturesEnabled, setGesturesEnabled] = useState(false); // Disabled by default
    const [modelVisible, setModelVisible] = useState(true);
    const [currentGesture, setCurrentGesture] = useState<string>('None');
    const [modelLoaded, setModelLoaded] = useState(false);
    const [visualFilter, setVisualFilter] = useState<'realistic' | 'blue_glow' | 'red_glow'>('realistic');
    const [autoOscillate, setAutoOscillate] = useState(false);
    const gesturesEnabledRef = useRef(false);
    const gestureRecognizerRef = useRef(new GestureRecognizer());
    const lastGestureEmitRef = useRef<{ type: string; at: number }>({ type: 'none', at: 0 });
    const swipeAnimatingRef = useRef(false);
    const swipeCooldownRef = useRef(0);

    // Layout state
    const [splitView, setSplitView] = useState(false);
    const [fullscreen3D, setFullscreen3D] = useState(false);

    // Active Tool State
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Room code & role (host vs participant) for this session
    const [roomCode] = useState<string | null>(() => sessionStorage.getItem('room_code'));
    const [sessionRole] = useState<string>(() => {
        const navState = (location.state as any) || {};
        return navState.role || sessionStorage.getItem('session_role') || 'student';
    });
    const isHost = sessionRole === 'host';
    const [isApproved, setIsApproved] = useState(isHost); // Host approved by default
    const [codeCopied, setCodeCopied] = useState(false);

    // Meeting timer
    const [meetingStartTime] = useState(Date.now());

    // Chat history for AI context
    const [chatHistory, setChatHistory] = useState<{ sender: string; text: string }[]>([]);

    // ── Feature 6: Persistent 3D Library ────────────────────────────────────
    const [libraryModels, setLibraryModels] = useState<any[]>([]);
    const [currentModelMetadata, setCurrentModelMetadata] = useState<any>(null);
    
    const fetchLibraryModels = async () => {
        try {
            const models = await apiRequest('/api/models/');
            setLibraryModels(models);
        } catch (err) {
            console.error('Failed to fetch library models:', err);
        }
    };

    useEffect(() => {
        fetchLibraryModels();
    }, []);

    // ── Scene sync hook ────────────────────────────────────────────────────
    const {
        sceneObjects,
        addObject,
        deleteObject,
        selectObject,
        selectedId,
    } = useScene(socketInstance);

    // ── Session controls hook (raise-hand, reactions, screen share, quality) ─
    const {
        handRaised, toggleHand,
        reactions, sendReaction,
        isScreenSharing, toggleScreenShare,
        connectionQuality,
    } = useSessionControls(socketInstance, user?.name || 'You');

    const [showHostControls, setShowHostControls] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);

    // ── Feature 4: Engagement Tracking ────────────────────────────────────────
    const [engagementMap, setEngagementMap] = useState<Record<string, number>>({});

    // ── Feature 7: Doubt Detection ────────────────────────────────────────────
    const [doubtAlert, setDoubtAlert] = useState<{ topic: string; pct: number } | null>(null);
    const doubtCheckRef = useRef<number>(0);

    // ── Feature 10: 3D Presentation Mode ──────────────────────────────────────
    const [presentationMode, setPresentationMode] = useState(false);
    const [currentSlides, setCurrentSlides] = useState<SlideData[]>([
        { title: 'Introduction', body: 'Welcome to today\'s lesson. We will explore the topic using 3D interactive models.' },
        { title: 'Key Concepts', body: 'Observe the 3D model carefully. Notice the structure, orientation, and components.' },
        { title: 'Discussion', body: 'How does this structure relate to what we studied previously? Share your observations.' },
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConverting, setIsConverting] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        setIsConverting(true);
        try {
            console.log('[PDF] Starting conversion for:', file.name);
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ 
                data: arrayBuffer,
                useWorkerFetch: true,
                isEvalSupported: false,
            });
            
            const pdf = await loadingTask.promise;
            console.log('[PDF] Document loaded, pages:', pdf.numPages);
            const newSlides: SlideData[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                // Scale up for high quality (Vite dev mode might be slow but it's okay for host)
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport } as any).promise;
                newSlides.push({
                    title: `Page ${i}`,
                    body: `Visual content from ${file.name}`,
                    imageUrl: canvas.toDataURL('image/jpeg', 0.8)
                });
                console.log(`[PDF] Rendered page ${i}/${pdf.numPages}`);
            }

            setCurrentSlides(newSlides);
            if (presentationMode) {
                arSceneRef.current?.startPresentationMode(newSlides);
                socketRef.current?.emit('PRESENTATION_STARTED', { slides: newSlides });
            }
            console.log('[PDF] Conversion complete');
        } catch (error: any) {
            console.error('PDF Conversion error details:', error);
            alert(`Failed to process PDF: ${error.message || 'Unknown error'}`);
        } finally {
            setIsConverting(false);
        }
    };

    const handleCopyCode = async () => {
        if (roomCode) {
            await navigator.clipboard.writeText(roomCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };


    // ── Feature 4: Tab visibility engagement signals ──────────────────────────
    useEffect(() => {
        const handleVisibility = () => {
            const type = document.hidden ? 'tab_away' : 'tab_back';
            socketRef.current?.emit('ENGAGEMENT_SIGNAL', { type });
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // ── Feature 7: Periodic doubt detection (host only) ───────────────────────
    useEffect(() => {
        if (!isHost || chatHistory.length < 5) return;
        const newMessages = chatHistory.length;
        if (newMessages - doubtCheckRef.current < 5) return;
        doubtCheckRef.current = newMessages;
        apiRequest('/api/ai/detect-doubts', {
            method: 'POST',
            body: JSON.stringify({ messages: chatHistory.slice(-20).map(m => `${m.sender}: ${m.text}`) }),
        }).then((result) => {
            if (result.confusion_percentage > 25) {
                setDoubtAlert({ topic: result.confused_topic, pct: result.confusion_percentage });
            }
        }).catch(() => { });
    }, [chatHistory, isHost]);

    // ── Feature 10: Keyboard navigation for presentation mode ─────────────────
    useEffect(() => {
        if (!presentationMode) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                arSceneRef.current?.nextSlide();
                socketRef.current?.emit('SLIDE_CHANGED', { direction: 'next' });
            } else if (e.key === 'ArrowLeft') {
                arSceneRef.current?.prevSlide();
                socketRef.current?.emit('SLIDE_CHANGED', { direction: 'prev' });
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [presentationMode]);

    // ── Feature 3 & 4: Socket listeners for new events ───────────────────────
    useSessionRealtimeListeners({
        socketRef,
        socketInstance,
        arSceneRef,
        isHost,
        currentSlides,
        setCurrentSlides,
        setPresentationMode,
        setEngagementMap,
        setVisualFilter,
        setAutoOscillate,
    });

    // ── 3D Scene Sync listeners ───────────────────────────────────────────────
    useEffect(() => {
        gesturesEnabledRef.current = gesturesEnabled;
    }, [gesturesEnabled]);

    useEffect(() => {
        const gestureService = gestureServiceRef.current;
        const video = videoRef.current;
        if (!gestureService || !video || !isApproved) return;

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

        if (!gesturesEnabled) {
            setCurrentGesture('None');
            gestureRecognizerRef.current.reset();
            gestureService.stop();
            return;
        }

        gestureService.start(video, (results: Results) => {
            if (!gesturesEnabledRef.current) return;

            const landmarks = results.multiHandLandmarks?.[0];
            if (!landmarks) {
                setCurrentGesture('None');
                gestureRecognizerRef.current.reset();
                return;
            }

            const detected = gestureRecognizerRef.current.recognize(landmarks);
            setCurrentGesture(detected.type.replace('_', ' ').toUpperCase());
            if (detected.type === 'none' || detected.confidence < 0.7) return;

            // Manipulation gestures (Host or permitted Students):
            // fist => reset, open hand => rotate, swipe => one full spin,
            // pinch => zoom, pointing => move model.
            const canInteract = PermissionsService.getInstance().canInteract();
            if (canInteract && arSceneRef.current) {
                if (detected.type === 'fist') {
                    arSceneRef.current.resetTransform();
                } else if (detected.type === 'open_left') {
                    arSceneRef.current.rotateModel('y', -0.08);
                } else if (detected.type === 'open_right') {
                    arSceneRef.current.rotateModel('y', 0.08);
                } else if (detected.type === 'fist_left') {
                    triggerSwipeSpin(-1);
                } else if (detected.type === 'fist_right') {
                    triggerSwipeSpin(1);
                } else if (detected.type === 'pinch_in' || detected.type === 'pinch_out') {
                    const state = arSceneRef.current.getState();
                    if (state?.scale !== undefined) {
                        const ratio = detected.scale && detected.scale > 0 ? detected.scale : (detected.type === 'pinch_in' ? 0.95 : 1.05);
                        arSceneRef.current.applyState({ scale: Math.max(0.5, Math.min(4, state.scale * ratio)) });
                        arSceneRef.current.notifyStateChange();
                    }
                } else if (detected.type === 'pointing' && detected.position) {
                    const mappedPosition = {
                        x: Math.max(-3, Math.min(3, detected.position.x * 0.35)),
                        y: Math.max(-2, Math.min(2, detected.position.y * 0.25)),
                        z: Math.max(-3, Math.min(2, detected.position.z * 0.35)),
                    };
                    arSceneRef.current.applyState({ position: mappedPosition });
                    arSceneRef.current.notifyStateChange();
                }
            }

            const now = Date.now();
            const shouldEmit =
                lastGestureEmitRef.current.type !== detected.type ||
                now - lastGestureEmitRef.current.at > 750;
            if (!shouldEmit) return;

            lastGestureEmitRef.current = { type: detected.type, at: now };
            socketRef.current?.emit('GESTURE_DETECTED', {
                gesture: detected.type,
                user: user?.name || 'You',
                confidence: detected.confidence,
            });
        })
            .catch((error) => {
                console.error('Failed to start gesture service:', error);
                setGesturesEnabled(false);
            });

        return () => {
            gestureService.stop();
        };
    }, [gesturesEnabled, isApproved, isHost, user?.name]);

    // ── Initialization ─────────────────────────────────────────────────────
    // NOTE: depend on user.email (stable primitive) not the whole user object,
    // to prevent the effect from re-running every render due to a new object reference.
    useEffect(() => {
        if (!canvasRef.current || !videoRef.current || !user || !sessionId) return;

        // Guard flag so async operations that complete after cleanup are ignored
        let cancelled = false;
        let checkInterval: ReturnType<typeof setInterval> | null = null;
        let videoManager: VideoManager | null = null;
        let socket: SocketManager | null = null;
        let scene: ARScene | null = null;

        const initSession = async () => {
            try {
                // ── Video ────────────────────────────────────────────────────
                // videoManager = new VideoManager(videoSettings.resolution, videoSettings.hdVideo);
                videoManager = new VideoManager();
                videoManagerRef.current = videoManager;
                try {
                    const stream = await videoManager.start(videoRef.current!);
                    if (cancelled) { videoManager.stop(); return; }
                    setLocalStream(stream);

                    // Set local stream for WebRTC after socket is initialized
                    setTimeout(() => {
                        if (webRTCManagerRef.current) {
                            webRTCManagerRef.current.setLocalStream(stream);
                        }
                    }, 1000); // Wait for WebRTC manager to be initialized
                } catch (videoError) {
                    console.warn('Video initialization failed, continuing without video:', videoError);
                }
                if (cancelled) return;

                // ── 3D Scene ─────────────────────────────────────────────────
                                scene = new ARScene(canvasRef.current!);
                arSceneRef.current = scene;

                const gestureService = new GestureService();
                await gestureService.initialize();
                gestureServiceRef.current = gestureService;

                // WebSocket
                socket = new SocketManager();
                socketRef.current = socket;

                // ── WebRTC Manager ────────────────────────────────────────
                const webRTCManager = new WebRTCManager(socket, {
                    onRemoteStream: (userId: string, stream: MediaStream) => {
                        setRemoteStreams(prev => ({
                            ...prev,
                            [userId]: stream
                        }));
                    },
                    onRemoteStreamRemoved: (userId: string) => {
                        setRemoteStreams(prev => {
                            const newStreams = { ...prev };
                            delete newStreams[userId];
                            return newStreams;
                        });
                    },
                    onError: (error: Error) => {
                        console.error('WebRTC error:', error);
                    }
                });
                webRTCManagerRef.current = webRTCManager;

                let lastTransformEmit = 0;
                scene.onStateChange = (state) => {
                    const now = Date.now();
                    if (now - lastTransformEmit > 50) {
                        socketRef.current?.emit('MODEL_TRANSFORM', state);
                        lastTransformEmit = now;
                    }
                };

                scene.onSlideFullscreen = (isFullscreen) => {
                    if (isHost) {
                        socketRef.current?.emit('SLIDE_FULLSCREEN', { isFullscreen });
                    }
                };

                scene.onSlideTransform = (zoom, offset) => {
                    if (isHost) {
                        socketRef.current?.emit('SLIDE_TRANSFORM', { zoom, offset });
                    }
                };

                socket.connect(
                    sessionId,
                    scene,
                    user.name,
                    isHost,
                    (updatedUsers) => {
                        if (!cancelled) setUsers(updatedUsers.filter((u: any) => u.name !== user.name));
                    },
                    (gestureEvent) => {
                        console.log('Gesture Detected', gestureEvent);
                    }
                );
                localStorage.setItem('user_name', user.name);

                socket.on('SLIDE_FULLSCREEN', (data: { isFullscreen: boolean }) => {
                    console.log('Remote fullscreen toggle:', data);
                    arSceneRef.current?.setSlideFullscreen(data.isFullscreen);
                });

                socket.on('SLIDE_TRANSFORM', (data: { zoom: number, offset: { x: number, y: number } }) => {
                    if (!isHost) {
                        arSceneRef.current?.setSlideTransform(data.zoom, data.offset);
                    }
                });

                socket.on('MODEL_CHANGED', (data) => {
                    console.log('Remote user changed model:', data);
                    if (arSceneRef.current && data.model_url) {
                        arSceneRef.current.loadModel(data.model_url).catch(console.error);
                    }
                });

                socket.onChat = (msg) => {
                    if (!cancelled) setChatHistory(prev => [...prev.slice(-20), { sender: msg.sender, text: msg.text }]);
                };

                if (!cancelled) setSocketInstance(socket);

                // ── Handle Join Approval (for students) ─────────────────────
                if (!isHost) {
                    const onJoinApproved = () => {
                        console.log('[Session] Join approved by host!');
                        setIsApproved(true);
                    };
                    
                    const onJoinRejected = (e: any) => {
                        alert(`Join request rejected: ${e.detail?.reason || 'Access denied'}`);
                        navigate('/dashboard');
                    };
                    window.addEventListener('joinApproved', onJoinApproved);
                    window.addEventListener('joinRejected', onJoinRejected as EventListener);

                    // Ensure handlers are cleaned up even if init succeeds and component later unmounts.
                    (window as any).__sessionJoinApprovedHandler = onJoinApproved;
                    (window as any).__sessionJoinRejectedHandler = onJoinRejected;
                } else {
                    setIsApproved(true); // Host is always approved
                }

                // ── Permissions Service ───────────────────────────────────────
                const permissionsService = PermissionsService.getInstance();
                permissionsService.initialize(socket, isHost);

                // ── Periodic Connection Check ──────────────────────────────
                checkInterval = setInterval(() => {
                    if (!cancelled) setIsConnected(socket?.isConnected() ?? false);
                }, 1000);

            } catch (err) {
                console.error('Failed to initialize session:', err);
            }
        };

        initSession();

        // ── Cleanup ───────────────────────────────────────────────────────────
        return () => {
            cancelled = true;
            if (checkInterval) clearInterval(checkInterval);
            videoManagerRef.current?.stop();
            gestureServiceRef.current?.stop();
            gestureServiceRef.current = null;
            webRTCManagerRef.current?.destroy();
            socketRef.current?.disconnect();
            arSceneRef.current?.dispose();
            PermissionsService.getInstance().destroy();
            
            const approvedHandler = (window as any).__sessionJoinApprovedHandler;
            const rejectedHandler = (window as any).__sessionJoinRejectedHandler;
            if (approvedHandler) {
                window.removeEventListener('joinApproved', approvedHandler);
                delete (window as any).__sessionJoinApprovedHandler;
            }
            if (rejectedHandler) {
                window.removeEventListener('joinRejected', rejectedHandler as EventListener);
                delete (window as any).__sessionJoinRejectedHandler;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, user?.email]);

    // ── Feature 11: Auto Load Model from Library ──────────────────────────────
    useEffect(() => {
        if (!isHost || !arSceneRef.current || !socketRef.current) return;
        
        const autoModelRaw = sessionStorage.getItem('auto_load_model');
        if (autoModelRaw) {
            try {
                const autoModel = JSON.parse(autoModelRaw);
                console.log('[AI] Auto-loading matched model:', autoModel.name);
                
                // Slight delay to ensure scene is fully settled
                const timer = setTimeout(async () => {
                    if (arSceneRef.current) {
                        try {
                            await arSceneRef.current.loadModel(autoModel.url);
                            setModelLoaded(true);
                            socketRef.current?.emit('MODEL_CHANGED', { 
                                model_url: autoModel.url, 
                                model_name: autoModel.name, 
                                timestamp: Date.now() 
                            });
                            // Clean up to prevent re-load on refreshes if not desired (optional)
                            // sessionStorage.removeItem('auto_load_model');
                        } catch (err) {
                            console.error('Failed to auto-load model:', err);
                        }
                    }
                }, 1500);
                
                return () => clearTimeout(timer);
            } catch (e) {
                console.error('Invalid auto_load_model in storage:', e);
            }
        }
    }, [isHost, socketInstance]); // socketInstance changes when ready

    // ── Media Controls ─────────────────────────────────────────────────────
    const handleModelUpload = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
            alert('Only GLB and GLTF files are supported');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('model', file);
            formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
            formData.append('category', 'Session Upload');
            if (sessionId) {
                formData.append('session_id', sessionId);
            }

            const newModel = await apiRequest('/api/models/upload', { method: 'POST', body: formData });

            setCurrentModelMetadata(newModel);
            if (arSceneRef.current) {
                await arSceneRef.current.loadModel(newModel.url);
                setModelLoaded(true);
            }
            if (socketRef.current) {
                socketRef.current.emit('MODEL_CHANGED', { model_url: newModel.url, model_name: newModel.name, timestamp: Date.now() });
            }
            alert(`Model "${newModel.name}" uploaded successfully!`);
        } catch (error) {
            console.error('Model upload failed:', error);
            const detail = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to upload model: ${detail}`);
        }
    };

    const handleAddToLibrary = async () => {
        if (!currentModelMetadata) {
            alert('No uploaded model to add to library.');
            return;
        }
        try {
            // In our current backend, list_models returns all saved ModelMetadata.
            // upload_model already calls db.save_model(model_data).
            // So if it's uploaded, it's ALREADY in the library if we fetch it again.
            // However, we might want to "pin" or "tag" it specifically if there's a distinction.
            // For now, let's just refresh the library list.
            await fetchLibraryModels();
            alert('Model added to library successfully!');
        } catch (err) {
            console.error('Failed to add to library:', err);
            alert('Failed to add to library.');
        }
    };

    const handleToggleModel = () => {
        setModelVisible(v => !v);
        if (arSceneRef.current) arSceneRef.current.toggleModelVisibility();
    };

    const handleDeleteModel = () => {
        if (arSceneRef.current) {
            arSceneRef.current.clearModel();
            setModelLoaded(false);
            setModelVisible(true);
        }
    };

    const handleToggleVideo = () => {
        setCameraOn(v => !v);
        if (videoManagerRef.current) videoManagerRef.current.toggleVideo(!cameraOn);
    };

    const setVideoEnabled = (enabled: boolean) => {
        setCameraOn(enabled);
        if (videoManagerRef.current) videoManagerRef.current.toggleVideo(enabled);
    };

    const handleToggleAudio = () => {
        setMicOn(v => !v);
        if (videoManagerRef.current) videoManagerRef.current.toggleAudio(!micOn);
    };

    const setAudioEnabled = (enabled: boolean) => {
        setMicOn(enabled);
        if (videoManagerRef.current) videoManagerRef.current.toggleAudio(enabled);
    };

    const handleLeave = () => setShowLeaveConfirm(true);
    const confirmLeave = () => {
        if (isHost && sessionId) {
            navigate(`/session/${sessionId}/report`);
        } else {
            navigate('/dashboard');
        }
    };

    // ── AI scene command handler ────────────────────────────────────────────
    const handleAISceneCommand = useCallback((action: string, payload: any) => {
        if (action === 'ADD_OBJECT') {
            addObject(payload.type || 'box', payload.color || '#6366f1', payload.position);
        } else if (action === 'DELETE_OBJECT' && payload.id) {
            deleteObject(payload.id);
        }
    }, [addObject, deleteObject]);

    // ── Participants for AI context ─────────────────────────────────────────
    const aiParticipants = [
        { id: 'local', name: user?.name || 'You' },
        ...users.map(u => ({ id: u.id || u.name, name: u.name })),
    ];

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-background">
            {/* ── Participant Approval ── */}
            <ParticipantApproval isHost={isHost} />

            <div className="relative z-10 h-full flex flex-col">

                {/* ── Main Area ── */}
                <div className={`flex-1 relative p-4 md:p-6 pb-0 flex ${splitView ? 'gap-4' : ''}`}>

                    {/* Video column (split-view only) */}
                    {splitView && !fullscreen3D && (
                        <div className="w-64 flex-shrink-0 rounded-[20px] overflow-hidden bg-gray-900 border border-gray-200/30">
                            <VideoGrid
                                localName={user?.name || 'You'}
                                localStream={localStream}
                                localCameraOn={cameraOn}
                                localMicOn={micOn}
                                localIsHost={true} // Current user is host
                                participants={users.map(u => ({
                                    id: u.id || u.name,
                                    name: u.name,
                                    cameraOn: true,
                                    micOn: true,
                                    isHost: u.isHost || false
                                }))}
                                remoteStreams={remoteStreams}
                                compact
                            />
                        </div>
                    )}

                    {/* 3D / main view */}
                    <div className="flex-1 relative rounded-[24px] overflow-hidden bg-gray-900 shadow-sm border border-gray-200/50 flex">

                        {/* Status Pills */}
                        <div className="absolute top-6 left-6 flex flex-col gap-3 z-30 pointer-events-none">
                            <div className="flex items-center gap-2 bg-white/90 border border-gray-200 shadow-sm backdrop-blur-md rounded-full px-4 py-2">
                                {isConnected
                                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                <span className="text-gray-700 text-sm font-medium">
                                    {isConnected ? 'Connected' : 'Reconnecting…'}
                                </span>
                                <ConnectionQuality quality={connectionQuality} />
                            </div>

                            <div className={`flex items-center gap-2 bg-white/90 border ${gesturesEnabled ? 'border-primary/30 text-primary' : 'border-gray-200 text-gray-500'} shadow-sm backdrop-blur-md rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-colors`}>
                                <Hand className="w-3 md:w-4 h-3 md:h-4" />
                                <span className="text-xs md:text-sm font-medium">{currentGesture}</span>
                            </div>

                            {/* Scene object count badge */}
                            {sceneObjects.length > 0 && (
                                <div className="flex items-center gap-2 bg-white/90 border border-violet-200 text-violet-600 shadow-sm backdrop-blur-md rounded-full px-4 py-2">
                                    <span className="text-sm font-medium">{sceneObjects.length} object{sceneObjects.length !== 1 ? 's' : ''} in scene</span>
                                </div>
                            )}

                            {/* Hand raised indicator */}
                            {handRaised && (
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 shadow-sm backdrop-blur-md rounded-full px-4 py-2">
                                    <span className="text-sm font-medium">✋ Hand raised</span>
                                </div>
                            )}
                        </div>

                        {/* Floating reactions overlay */}
                        {reactions.length > 0 && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-40 flex gap-3 pointer-events-none">
                                {reactions.map(r => (
                                    <div key={r.id} className="flex flex-col items-center animate-bounce-slow">
                                        <span className="text-4xl drop-shadow-lg" style={{ animation: 'floatUp 4s ease-out forwards' }}>{r.emoji}</span>
                                        <span className="text-xs text-white font-medium bg-black/40 rounded-full px-2 py-0.5 mt-1">{r.userName}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Screen share banner */}
                        {isScreenSharing && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
                                <Monitor className="w-4 h-4" />
                                Sharing your screen
                            </div>
                        )}

                        {/* Topic detection logic removed */}

                        {/* Auto Content Suggestion Banner removed */}

                        {/* Feature 4 + 2: Voice Detection & Presentation Buttons (Host only) */}
                        {isHost && (
                            <div className="absolute bottom-20 left-4 z-50 flex flex-col gap-2">
                                {/* Topic detection button removed */}
                                <button
                                    onClick={() => {
                                        if (presentationMode) {
                                            arSceneRef.current?.stopPresentationMode();
                                            setPresentationMode(false);
                                            socketRef.current?.emit('PRESENTATION_STOPPED', {});
                                        } else {
                                            arSceneRef.current?.startPresentationMode(currentSlides);
                                            setPresentationMode(true);
                                            socketRef.current?.emit('PRESENTATION_STARTED', { slides: currentSlides });
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${presentationMode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-800/80 hover:bg-gray-700 text-white'}`}
                                >
                                    <Presentation className="w-3.5 h-3.5" />
                                    {presentationMode ? 'Exit Slides' : '🖥 Slide Mode'}
                                </button>
                                
                                {isHost && (
                                    <>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept="application/pdf"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isConverting}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                                        >
                                            <FileUp className="w-3.5 h-3.5" />
                                            {isConverting ? 'Processing...' : 'Upload PDF'}
                                        </button>
                                    </>
                                )}

                                {presentationMode && (
                                    <div className="bg-black/60 text-white/70 text-xs px-2 py-1 rounded-lg text-center">← → to navigate</div>
                                )}
                                <div className="hidden">{engagementMap && JSON.stringify({})}</div>
                            </div>
                        )}

                        {/* Feature 7: Doubt Detection Alert (Host only) */}
                        {isHost && doubtAlert && (
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500/95 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium shadow-xl z-50 flex items-center gap-3">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>⚠️ <strong>{doubtAlert.pct}%</strong> confused about <strong>{doubtAlert.topic}</strong></span>
                                <button onClick={() => setDoubtAlert(null)} className="text-white/70 hover:text-white ml-2">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Main video / canvas area */}

                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <div className="relative w-full h-full">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${cameraOn ? 'opacity-100' : 'opacity-0'}`}
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                                {!cameraOn && (
                                    <div className="absolute inset-0 z-0 bg-gray-800 flex items-center justify-center">
                                        <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-4xl text-white font-medium shadow-inner">
                                            {user?.name?.[0]?.toUpperCase()}
                                        </div>
                                    </div>
                                )}

                                {/* AR Canvas */}
                                <canvas
                                    ref={canvasRef}
                                    className={`absolute inset-0 w-full h-full z-20 ${modelVisible ? 'pointer-events-auto' : 'pointer-events-none opacity-0 transition-opacity'}`}
                                    style={{ background: 'transparent', touchAction: 'none' }}
                                />

                                {/* Name tag */}
                                <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium z-30 pointer-events-none">
                                    {user?.name || 'Participant'}
                                </div>

                                {/* Fullscreen floating video tiles (fullscreen3D mode) */}
                                {fullscreen3D && (
                                    <div className="absolute top-6 left-6 flex flex-col gap-2 z-30 pointer-events-auto max-h-80 overflow-y-auto">
                                        {users.slice(0, 4).map(u => (
                                            <div key={u.id || u.name} className="w-32 rounded-xl overflow-hidden shadow-lg border border-white/20">
                                                <div className="bg-gray-800 aspect-video flex items-center justify-center">
                                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                                                        {u.name?.[0]?.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 px-2 py-1">
                                                    <span className="text-white text-xs truncate block">{u.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Sidebar Tools */}
                                <div className="absolute top-6 right-6 z-40 pointer-events-auto shadow-xl rounded-2xl">
                                    <SessionSidebar
                                        activeTool={activeTool}
                                        onSelectTool={setActiveTool}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Bottom Control Bar ── */}
                <div className="p-4 md:p-6 bg-black/5 md:bg-transparent z-30 flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* Left: Room code / label (Hidden on small mobile) */}
                    <div className="hidden sm:flex items-center gap-3">
                        {roomCode ? (
                            <button
                                onClick={handleCopyCode}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-xs md:text-sm hover:bg-gray-50 transition-all group"
                                title="Click to copy code"
                            >
                                <span className="text-gray-400 text-[10px] md:text-xs">Code:</span>
                                <span className="font-mono font-bold tracking-widest text-primary">{roomCode}</span>
                                {codeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />}
                            </button>
                        ) : (
                            <div className="px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-xs md:text-sm">
                                HoloCollab Secure Room
                            </div>
                        )}
                    </div>

                    {/* Center: Primary Controls (Wrapping on Mobile) */}
                    <div className="flex items-center gap-2 md:gap-3 mx-auto md:mx-0 w-full md:w-auto justify-center flex-wrap">
                        <button
                            onClick={handleToggleAudio}
                            className={`p-3 md:p-4 rounded-full transition-all shadow-sm ${!micOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {!micOn ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>

                        <button
                            onClick={handleToggleVideo}
                            className={`p-3 md:p-4 rounded-full transition-all shadow-sm ${!cameraOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {!cameraOn ? <VideoOff size={18} /> : <Video size={18} />}
                        </button>

                        <button
                            onClick={() => {
                                const permissionsService = PermissionsService.getInstance();
                                if (permissionsService.hasPermission('local', 'canControlGestures')) {
                                    setGesturesEnabled(g => !g);
                                }
                            }}
                            className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${gesturesEnabled ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Sparkles size={18} />
                        </button>

                        <button
                            onClick={handleToggleModel}
                            className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${modelVisible ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Box size={18} className={modelVisible ? "" : "opacity-50"} />
                        </button>

                        <div className="flex items-center gap-2 md:gap-3">
                            <button
                                onClick={() => { setSplitView(v => !v); setFullscreen3D(false); }}
                                className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${splitView ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                title="Split View"
                            >
                                <Columns size={18} />
                            </button>

                            <button
                                onClick={() => { setFullscreen3D(v => !v); setSplitView(false); }}
                                className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${fullscreen3D ? 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                title="Fullscreen 3D"
                            >
                                <Maximize2 size={18} />
                            </button>
                        </div>

                        <button
                            onClick={toggleHand}
                            className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${handRaised ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title="Raise Hand"
                        >
                            <Hand size={18} />
                        </button>

                        {/* Emoji reactions */}
                        <div className="relative">
                            <button
                                onClick={() => setShowReactionPicker(p => !p)}
                                className="p-3 md:p-4 rounded-full transition-all shadow-sm border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                title="Send Reaction"
                            >
                                <span className="text-lg md:text-xl leading-none">😊</span>
                            </button>
                            {showReactionPicker && (
                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                                    {REACTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { sendReaction(emoji); setShowReactionPicker(false); }}
                                            className="text-xl md:text-2xl p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Screen share */}
                        <button
                            onClick={toggleScreenShare}
                            className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${isScreenSharing ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                        >
                            {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
                        </button>

                        <button
                            onClick={handleLeave}
                            className="px-4 md:px-6 py-3 md:py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-md font-bold text-xs md:text-sm flex items-center gap-2"
                        >
                            <PhoneOff size={16} /> <span className="hidden xs:inline">Leave</span>
                        </button>
                    </div>

                    {/* Right: Side panel toggles (Always visible for mobile access) */}
                    <div className="flex md:flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => { setShowParticipants(p => !p); setShowChat(false); setShowHostControls(false); }}
                            className={`p-3 md:p-3.5 rounded-full transition-all border shadow-sm ${showParticipants ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            title="Participants"
                        >
                            <Users size={18} />
                        </button>
                        <button
                            onClick={() => { setShowChat(c => !c); setShowParticipants(false); setShowHostControls(false); }}
                            className={`p-3 md:p-3.5 rounded-full transition-all border shadow-sm ${showChat ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            title="Chat"
                        >
                            <MessageSquare size={18} />
                        </button>
                        {isHost && (
                            <button
                                onClick={() => { setShowHostControls(h => !h); setShowChat(false); setShowParticipants(false); }}
                                className={`p-3 md:p-3.5 rounded-full transition-all border shadow-sm ${showHostControls ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                title="Host Controls"
                            >
                                <ShieldCheck size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Participants Panel ── */}
            {showParticipants && (
                <div className="absolute top-0 md:top-6 right-0 md:right-6 bottom-0 md:bottom-32 w-full md:w-80 bg-white border border-gray-200 md:rounded-2xl shadow-xl z-[100] md:z-40 flex flex-col overflow-hidden animate-in md:slide-in-from-right-8">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-gray-900 font-semibold text-lg">Participants</h3>
                        <button onClick={() => setShowParticipants(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        <div className="p-3 rounded-xl flex items-center justify-between bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-lg">
                                    {user?.name?.[0]?.toUpperCase() || 'L'}
                                </div>
                                <div>
                                    <div className="text-gray-900 font-medium text-sm">{user?.name} (You)</div>
                                    <div className="text-xs text-gray-500 font-medium">
                                        {isHost ? 'Host' : 'Participant'}
                                    </div>
                                </div>
                            </div>
                            <Mic size={16} className="text-gray-400" />
                        </div>
                        {users.map((p, idx) => (
                            <div key={idx} className="p-3 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-lg">
                                        {p.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div className="text-gray-900 font-medium text-sm group-hover:text-primary transition-colors">{p.name}</div>
                                        <div className="text-xs text-gray-500">Participant</div>
                                    </div>
                                </div>
                                <Mic size={16} className="text-gray-400" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            

            {/* ── Tool Panels ── */}
            {activeTool === 'whiteboard' && (
                <Whiteboard onClose={() => setActiveTool(null)} socket={socketInstance} user={user} />
            )}
            {activeTool === 'quiz' && (
                <QuizPanel onClose={() => setActiveTool(null)} socket={socketInstance} user={user} />
            )}
            {activeTool === 'media' && (
                <MediaPanel
                    onClose={() => setActiveTool(null)}
                    onShareScreen={toggleScreenShare}
                    onPlayVideo={(url) => {
                        window.open(url, '_blank', 'noopener,noreferrer');
                        socketRef.current?.emit('CHAT_SEND', {
                            sender: user?.name || 'Host',
                            text: `Shared media link: ${url}`,
                            timestamp: Date.now(),
                        });
                    }}
                />
            )}
            {activeTool === '3d' && (
                <ScenePanel
                    onClose={() => setActiveTool(null)}
                    modelLoaded={modelLoaded}
                    modelVisible={modelVisible}
                    onToggleModel={handleToggleModel}
                    onDeleteModel={() => { handleDeleteModel(); setActiveTool(null); }}
                    onUpload={() => scenePanelFileInputRef.current?.click()}
                    sceneObjects={sceneObjects}
                    onAddObject={addObject}
                    onDeleteObject={deleteObject}
                    onSelectObject={selectObject}
                    selectedObjectId={selectedId}
                    visualFilter={visualFilter}
                    onSetVisualFilter={(filter) => {
                        setVisualFilter(filter);
                        arSceneRef.current?.setVisualFilter(filter);
                    }}
                    autoOscillate={autoOscillate}
                    onSetAutoOscillate={(enabled) => {
                        setAutoOscillate(enabled);
                        arSceneRef.current?.setAutoOscillate(enabled);
                    }}
                    isHost={isHost}
                    libraryModels={libraryModels}
                    onAddToLibrary={handleAddToLibrary}
                    onSelectLibraryModel={async (url, name) => {
                        if (!isHost) return;
                        try {
                            if (arSceneRef.current) {
                                await arSceneRef.current.loadModel(url);
                                setModelLoaded(true);
                            }
                            if (socketRef.current) {
                                socketRef.current.emit('MODEL_CHANGED', { 
                                    model_url: url, 
                                    model_name: name, 
                                    timestamp: Date.now() 
                                });
                            }
                        } catch (err) {
                            console.error('Failed to load library model:', err);
                        }
                    }}
                />
            )}
            {activeTool === 'ai' && (
                <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[380px] z-40 animate-in slide-in-from-right duration-200">
                    <AIAssistant
                        onClose={() => setActiveTool(null)}
                        modelName="Session"
                        sceneObjects={sceneObjects}
                        participants={aiParticipants}
                        chatHistory={chatHistory}
                        meetingStartTime={meetingStartTime}
                        onSceneCommand={handleAISceneCommand}
                    />
                </div>
            )}
            {activeTool === 'settings' && (
                <SettingsPanel
                    onClose={() => setActiveTool(null)}
                    micEnabled={micOn}
                    cameraEnabled={cameraOn}
                    gesturesEnabled={gesturesEnabled}
                    onMicEnabledChange={setAudioEnabled}
                    onCameraEnabledChange={setVideoEnabled}
                    onGesturesEnabledChange={setGesturesEnabled}
                />
            )}

            {/* ── Host Controls Panel ── */}
            {isHost && showHostControls && (
                <HostControls
                    participants={users}
                    localName={user?.name || 'Host'}
                    socket={socketInstance}
                    onClose={() => setShowHostControls(false)}
                    engagementMap={engagementMap}
                    onRemoveParticipant={(id) => setUsers(prev => prev.filter(u => (u.id || u.name) !== id))}
                />
            )}

            {/* Hidden file input for ScenePanel uploads */}
            <input
                ref={scenePanelFileInputRef}
                type="file"
                accept=".glb,.gltf"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleModelUpload(f); e.target.value = ''; }}
                className="hidden"
            />

            {/* ── Chat Panel ── */}
            {showChat && (
                <div className="absolute top-6 right-6 md:right-[350px] bottom-32 w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right-8">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-gray-900 font-semibold text-lg">In-Call Messages</h3>
                        <button onClick={() => setShowChat(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-white pb-4">
                        <ChatPanel socket={socketInstance} user={user} roomId={sessionId ?? ''} />
                    </div>
                </div>
            )}

            {/* ── Leave Confirmation ── */}
            {showLeaveConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-1">
                            <PhoneOff className="w-7 h-7 text-red-500" />
                        </div>
                        <h3 className="text-gray-900 font-semibold text-xl">Leave Meeting?</h3>
                        <p className="text-gray-500 text-sm text-center">Are you sure you want to leave this session?</p>
                        <div className="flex gap-3 w-full mt-2">
                            <button
                                onClick={() => setShowLeaveConfirm(false)}
                                className="flex-1 py-3 rounded-full border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                            >
                                Stay
                            </button>
                            <button
                                onClick={confirmLeave}
                                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition-all"
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Waiting for Approval Overlay ── */}
            {!isApproved && (
                <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
                    <div className="premium-bg">
                        <div className="floating-shape circle s3" />
                        <div className="floating-shape square s5" />
                    </div>
                    
                    <div className="max-w-md w-full glass-card p-10 rounded-[40px] relative z-10 border-white/5">
                        <div className="w-20 h-20 rounded-3xl bg-purple-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse shadow-2xl shadow-purple-500/20">
                            <Users className="w-10 h-10 text-purple-400" />
                        </div>
                        
                        <h2 className="text-3xl font-black text-white tracking-tight mb-4">Waiting for Host</h2>
                        <p className="text-gray-400 font-medium leading-relaxed mb-8">
                            The session host has been notified. Please wait a moment while they review your request to join <strong>{roomCode}</strong>.
                        </p>
                        
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
                        </div>
                        
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                        >
                            Cancel Request
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-in-from-right-8 {
                    from { transform: translateX(2rem); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes floatUp {
                    0%   { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-120px); opacity: 0; }
                }
                .animate-in { animation: slide-in-from-right-8 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #DFE2E8; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #C0C5CF; }
            `}</style>
        </div>
    );
};

export default Session;


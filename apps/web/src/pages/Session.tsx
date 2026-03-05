
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ARScene } from '../three/ARScene';
import { SocketManager } from '../realtime/SocketManager';
import { WebRTCManager } from '../realtime/WebRTCManager';
import { VideoManager } from '../services/VideoManager';
import { PermissionsService } from '../services/PermissionsService';
import { GestureService } from '../services/GestureService';
import { GestureRecognizer } from '../services/GestureRecognizer';
import { useAuth } from '../context/AuthContext';
import { useScene } from '../hooks/useScene';
import { useSessionControls, REACTIONS } from '../hooks/useSessionControls';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Hand, Box, Sparkles, Users,
    MessageSquare, X, CheckCircle2, Copy, Check,
    Columns, Maximize2, Monitor, MonitorOff, ShieldCheck
} from 'lucide-react';
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
    const gesturesEnabledRef = useRef(false);

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
    const [codeCopied, setCodeCopied] = useState(false);

    // Meeting timer
    const [meetingStartTime] = useState(Date.now());

    // Chat history for AI context
    const [chatHistory, setChatHistory] = useState<{ sender: string; text: string }[]>([]);

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

    const handleCopyCode = async () => {
        if (roomCode) {
            await navigator.clipboard.writeText(roomCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    useEffect(() => {
        gesturesEnabledRef.current = gesturesEnabled;
    }, [gesturesEnabled]);

    // ── Initialization ─────────────────────────────────────────────────────
    // NOTE: depend on user.email (stable primitive) not the whole user object,
    // to prevent the effect from re-running every render due to a new object reference.
    useEffect(() => {
        if (!canvasRef.current || !videoRef.current || !user || !sessionId) return;

        // Guard flag so async operations that complete after cleanup are ignored
        let cancelled = false;
        let gestureTimer: ReturnType<typeof setTimeout> | null = null;
        let checkInterval: ReturnType<typeof setInterval> | null = null;
        let videoManager: VideoManager | null = null;
        let gestureService: GestureService | null = null;
        let socket: SocketManager | null = null;
        let scene: ARScene | null = null;

        const initSession = async () => {
            try {
                // ── Video ────────────────────────────────────────────────────
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

                // ── WebSocket ────────────────────────────────────────────────
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

                scene.onStateChange = (state) => {
                    socketRef.current?.emit('MODEL_TRANSFORM', state);
                };

                socket.connect(
                    sessionId,
                    scene,
                    user.name,
                    (updatedUsers) => {
                        if (!cancelled) setUsers(updatedUsers.filter((u: any) => u.name !== user.name));
                    },
                    (gestureEvent) => {
                        console.log('Gesture Detected', gestureEvent);
                    }
                );

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

                // ── Permissions Service ───────────────────────────────────────
                const permissionsService = PermissionsService.getInstance();
                permissionsService.initialize(socket, true); // Current user is host

                // ── Gesture Tracking ─────────────────────────────────────────
                gestureService = new GestureService();
                gestureServiceRef.current = gestureService;
                const gestureRecognizer = new GestureRecognizer();

                try {
                    await gestureService.initialize();
                    if (cancelled) return;

                    const startGestureDetection = () => {
                        if (cancelled || !videoRef.current || !gestureService) return;

                        gestureService.start(videoRef.current!, (results) => {
                            if (!gesturesEnabledRef.current || cancelled) return;

                            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                                const landmarks = results.multiHandLandmarks[0];
                                const gesture = gestureRecognizer.recognize(landmarks);

                                if (scene?.currentModel && gesture.confidence > 0.7) {
                                    switch (gesture.type) {
                                        case 'fist':
                                            scene.currentModel.rotation.set(0, 0, 0);
                                            scene.currentModel.scale.setScalar(1);
                                            scene.currentModel.position.set(0, 0, 0);
                                            scene.camera.position.set(0, 0, 5);
                                            setCurrentGesture('Fist - Reset');
                                            break;
                                        case 'fist_left':
                                            scene.currentModel.rotation.y -= 0.05;
                                            setCurrentGesture('Fist - Rotate Left');
                                            break;
                                        case 'fist_right':
                                            scene.currentModel.rotation.y += 0.05;
                                            setCurrentGesture('Fist - Rotate Right');
                                            break;
                                        case 'pointing':
                                            if (gesture.position) {
                                                scene.currentModel.position.set(gesture.position.x, gesture.position.y, gesture.position.z);
                                                setCurrentGesture('Pointing - Move');
                                            }
                                            break;
                                        case 'open_left':
                                            scene.currentModel.rotation.y -= 0.05;
                                            setCurrentGesture('Open Hand - Rotate Left');
                                            break;
                                        case 'open_right':
                                            scene.currentModel.rotation.y += 0.05;
                                            setCurrentGesture('Open Hand - Rotate Right');
                                            break;
                                        case 'pinch_in':
                                            if (gesture.scale) {
                                                const s = Math.max(0.5, scene.currentModel.scale.x * gesture.scale);
                                                scene.currentModel.scale.setScalar(s);
                                            }
                                            setCurrentGesture('Pinch Close - Zoom In');
                                            break;
                                        case 'pinch_out':
                                            if (gesture.scale) {
                                                const s = Math.min(3, scene.currentModel.scale.x * gesture.scale);
                                                scene.currentModel.scale.setScalar(s);
                                            }
                                            setCurrentGesture('Pinch Far - Zoom Out');
                                            break;
                                        default:
                                            setCurrentGesture('Tracking Active');
                                    }
                                    scene.notifyStateChange();
                                }

                                const landmarksArray = Array.from(landmarks).map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
                                socket?.emit('GESTURE_LANDMARKS', {
                                    landmarks: landmarksArray, gesture: gesture.type,
                                    confidence: gesture.confidence, timestamp: Date.now()
                                });
                            } else {
                                setCurrentGesture('Ready');
                            }
                        });
                    };

                    // Delay gesture start so the video stream is stable first
                    gestureTimer = setTimeout(startGestureDetection, 2000);
                } catch (error) {
                    console.error('Failed to initialize gesture service:', error);
                }

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
            if (gestureTimer) clearTimeout(gestureTimer);
            if (checkInterval) clearInterval(checkInterval);
            videoManager?.stop();
            gestureService?.stop();
            webRTCManagerRef.current?.destroy();
            socket?.disconnect();
            scene?.dispose();
            PermissionsService.getInstance().destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, user?.email]);

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

            const newModel = await apiRequest('/api/models/upload', { method: 'POST', body: formData });

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
            alert('Failed to upload model. Please try again.');
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

    const handleToggleAudio = () => {
        setMicOn(v => !v);
        if (videoManagerRef.current) videoManagerRef.current.toggleAudio(!micOn);
    };

    const handleLeave = () => setShowLeaveConfirm(true);
    const confirmLeave = () => navigate('/dashboard');

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
            <ParticipantApproval isHost={true} />
            
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

                            <div className={`flex items-center gap-2 bg-white/90 border ${gesturesEnabled ? 'border-primary/30 text-primary' : 'border-gray-200 text-gray-500'} shadow-sm backdrop-blur-md rounded-full px-4 py-2 transition-colors`}>
                                <Hand className="w-4 h-4" />
                                <span className="text-sm font-medium">{currentGesture}</span>
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
                <div className="p-4 md:p-6 bg-transparent z-30 flex items-center justify-between">

                    {/* Left: Room code / label */}
                    <div className="hidden md:flex items-center gap-3">
                        {roomCode ? (
                            <button
                                onClick={handleCopyCode}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all group"
                                title="Click to copy code"
                            >
                                <span className="text-gray-400 text-xs">Code:</span>
                                <span className="font-mono font-bold tracking-widest text-primary">{roomCode}</span>
                                {codeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />}
                            </button>
                        ) : (
                            <div className="px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-sm">
                                HoloCollab Secure Room
                            </div>
                        )}
                    </div>

                    {/* Center: Primary Controls */}
                    <div className="flex items-center gap-3 mx-auto md:mx-0">
                        <button
                            onClick={handleToggleAudio}
                            className={`p-4 rounded-full transition-all shadow-sm ${!micOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {!micOn ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>

                        <button
                            onClick={handleToggleVideo}
                            className={`p-4 rounded-full transition-all shadow-sm ${!cameraOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {!cameraOn ? <VideoOff size={22} /> : <Video size={22} />}
                        </button>

                        <button
                            onClick={() => {
                                // Only host can toggle gestures
                                const permissionsService = PermissionsService.getInstance();
                                if (permissionsService.hasPermission('local', 'canControlGestures')) {
                                    setGesturesEnabled(g => !g);
                                }
                            }}
                            className={`p-4 rounded-full transition-all shadow-sm border ${gesturesEnabled ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title="Toggle Hand Tracking (Host Only)"
                        >
                            <Sparkles size={22} />
                        </button>

                        <button
                            onClick={handleToggleModel}
                            className={`p-4 rounded-full transition-all shadow-sm border ${modelVisible ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title="Toggle 3D Scene"
                        >
                            <Box size={22} className={modelVisible ? "" : "opacity-50"} />
                        </button>

                        {/* Layout toggles */}
                        <button
                            onClick={() => { setSplitView(v => !v); setFullscreen3D(false); }}
                            className={`p-4 rounded-full transition-all shadow-sm border ${splitView ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title="Split View (Video + 3D)"
                        >
                            <Columns size={22} />
                        </button>

                        <button
                            onClick={() => { setFullscreen3D(v => !v); setSplitView(false); }}
                            className={`p-4 rounded-full transition-all shadow-sm border ${fullscreen3D ? 'bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title="Fullscreen 3D"
                        >
                            <Maximize2 size={22} />
                        </button>

                        {/* Raise hand */}
                        <button
                            onClick={toggleHand}
                            className={`p-4 rounded-full transition-all shadow-sm border ${handRaised ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title="Raise / Lower Hand"
                        >
                            <Hand size={22} />
                        </button>

                        {/* Emoji reactions */}
                        <div className="relative">
                            <button
                                onClick={() => setShowReactionPicker(p => !p)}
                                className="p-4 rounded-full transition-all shadow-sm border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                title="Send Reaction"
                            >
                                <span className="text-xl leading-none">😊</span>
                            </button>
                            {showReactionPicker && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 flex gap-1 z-50">
                                    {REACTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { sendReaction(emoji); setShowReactionPicker(false); }}
                                            className="text-2xl p-2 hover:bg-gray-100 rounded-xl transition-colors"
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
                            className={`p-4 rounded-full transition-all shadow-sm border ${isScreenSharing ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                        >
                            {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
                        </button>

                        <div className="w-px h-8 bg-gray-300 mx-1" />

                        <button
                            onClick={handleLeave}
                            className="px-6 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-md font-medium text-sm flex items-center gap-2"
                        >
                            <PhoneOff size={20} /> Leave Call
                        </button>
                    </div>

                    {/* Right: Side panel toggles */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => setShowParticipants(p => !p)}
                            className={`p-3.5 rounded-full transition-all border shadow-sm ${showParticipants ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Users size={20} />
                        </button>
                        <button
                            onClick={() => setShowChat(c => !c)}
                            className={`p-3.5 rounded-full transition-all border shadow-sm ${showChat ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <MessageSquare size={20} />
                        </button>
                        {/* Host controls — only visible to session host */}
                        {isHost && (
                            <button
                                onClick={() => setShowHostControls(h => !h)}
                                className={`p-3.5 rounded-full transition-all border shadow-sm ${showHostControls ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                title="Host Controls"
                            >
                                <ShieldCheck size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Participants Panel ── */}
            {showParticipants && (
                <div className="absolute top-6 right-6 bottom-32 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right-8">
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
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-lg">
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
                <MediaPanel onClose={() => setActiveTool(null)} />
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
                <SettingsPanel onClose={() => setActiveTool(null)} />
            )}

            {/* ── Host Controls Panel ── */}
            {isHost && showHostControls && (
                <HostControls
                    participants={users}
                    localName={user?.name || 'Host'}
                    socket={socketInstance}
                    onClose={() => setShowHostControls(false)}
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
                        <ChatPanel socket={socketInstance} user={user} roomId={sessionId} />
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

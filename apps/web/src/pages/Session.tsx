
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ARScene } from '../three/ARScene';
import { SocketManager } from '../realtime/SocketManager';
import { VideoManager } from '../services/VideoManager';
import { GestureService } from '../services/GestureService';
import { GestureRecognizer } from '../services/GestureRecognizer';
import { useAuth } from '../context/AuthContext';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Hand, Eye, EyeOff, Users,
    MessageSquare, X, CheckCircle2, Copy, Check
} from 'lucide-react';
import { apiRequest } from '../services/api';

import { SessionSidebar } from '../components/session/wrapper/SessionSidebar';
import { ChatPanel } from '../components/session/layout/ChatPanel';

const Session = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const arSceneRef = useRef<ARScene | null>(null);
    const socketRef = useRef<SocketManager | null>(null);
    const videoManagerRef = useRef<VideoManager | null>(null);
    const gestureServiceRef = useRef<GestureService | null>(null);

    const [socketInstance, setSocketInstance] = useState<SocketManager | null>(null);

    const [users, setUsers] = useState<any[]>([]);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [gesturesEnabled, setGesturesEnabled] = useState(true);
    const [modelVisible, setModelVisible] = useState(true);
    const [currentGesture, setCurrentGesture] = useState<string>('None');
    const [modelLoaded, setModelLoaded] = useState(false);
    const gesturesEnabledRef = useRef(true);

    // Active Tool State
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Room code — only present when user just created the session
    const [roomCode] = useState<string | null>(() => sessionStorage.getItem('room_code'));
    const [codeCopied, setCodeCopied] = useState(false);

    const handleCopyCode = async () => {
        if (roomCode) {
            await navigator.clipboard.writeText(roomCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    // Sync ref
    useEffect(() => {
        gesturesEnabledRef.current = gesturesEnabled;
    }, [gesturesEnabled]);

    // --- Initialization Logic ---
    useEffect(() => {
        if (!canvasRef.current || !videoRef.current || !user || !sessionId) return;

        const initSession = async () => {
            try {
                // 1. Initialize Video Manager
                const videoManager = new VideoManager();
                videoManagerRef.current = videoManager;
                await videoManager.start(videoRef.current!);

                // 2. Initialize AR Scene
                const scene = new ARScene(canvasRef.current!);
                arSceneRef.current = scene;

                // 3. Initialize Socket Connection
                const socket = new SocketManager();
                socketRef.current = socket;

                socket.connect(
                    sessionId,
                    scene,
                    user.name,
                    (updatedUsers) => {
                        // Filter out the current user — they are shown separately as 'You' in the panel
                        setUsers(updatedUsers.filter((u: any) => u.name !== user.name));
                    },
                    (gestureEvent) => {
                        console.log("Gesture Detected", gestureEvent);
                    }
                );
                setSocketInstance(socket);

                socket.on('MODEL_CHANGED', (data) => {
                    console.log('Remote user changed model:', data);
                });

                // 4. Initialize Gesture Service
                const gestureService = new GestureService();
                gestureServiceRef.current = gestureService;
                const gestureRecognizer = new GestureRecognizer();
                console.log('Initializing gesture service...');

                try {
                    await gestureService.initialize();
                    console.log('Gesture service initialized, waiting for video...');

                    const startGestureDetection = () => {
                        if (!videoRef.current) return;

                        console.log('Starting gesture detection with improved recognizer');
                        console.log('Video readyState:', videoRef.current.readyState);

                        gestureService.start(videoRef.current!, (results) => {
                            if (!gesturesEnabledRef.current) return;

                            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                                const landmarks = results.multiHandLandmarks[0];
                                const gesture = gestureRecognizer.recognize(landmarks);

                                if (scene.currentModel && gesture.confidence > 0.7) {
                                    switch (gesture.type) {
                                        case 'fist':
                                            console.log('🤜 FIST: Resetting model');
                                            scene.currentModel.rotation.set(0, 0, 0);
                                            scene.currentModel.scale.setScalar(1);
                                            scene.currentModel.position.set(0, 0, 0);
                                            scene.camera.position.set(0, 0, 5);
                                            setCurrentGesture('Fist - Reset');
                                            break;
                                        case 'pointing':
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
                                            console.log('👈 OPEN LEFT: Rotating left');
                                            scene.currentModel.rotation.y -= 0.05;
                                            setCurrentGesture('Open Hand - Rotate Left');
                                            break;
                                        case 'open_right':
                                            console.log('👉 OPEN RIGHT: Rotating right');
                                            scene.currentModel.rotation.y += 0.05;
                                            setCurrentGesture('Open Hand - Rotate Right');
                                            break;
                                        case 'pinch_in':
                                            console.log('🤏 PINCH IN: Zooming in');
                                            if (gesture.scale) {
                                                const currentScale = scene.currentModel.scale.x;
                                                const newScale = Math.max(0.5, currentScale * gesture.scale);
                                                scene.currentModel.scale.setScalar(newScale);
                                            }
                                            setCurrentGesture('Pinch Close - Zoom In');
                                            break;
                                        case 'pinch_out':
                                            console.log('👌 PINCH OUT: Zooming out');
                                            if (gesture.scale) {
                                                const currentScale = scene.currentModel.scale.x;
                                                const newScale = Math.min(3, currentScale * gesture.scale);
                                                scene.currentModel.scale.setScalar(newScale);
                                            }
                                            setCurrentGesture('Pinch Far - Zoom Out');
                                            break;
                                        default:
                                            setCurrentGesture('Tracking Active');
                                    }
                                    scene.notifyStateChange();
                                }

                                const landmarksArray = Array.from(landmarks).map(landmark => ({
                                    x: landmark.x,
                                    y: landmark.y,
                                    z: landmark.z
                                }));

                                if (socket) {
                                    socket.emit('GESTURE_LANDMARKS', {
                                        landmarks: landmarksArray,
                                        gesture: gesture.type,
                                        confidence: gesture.confidence,
                                        timestamp: Date.now()
                                    });
                                }
                            } else {
                                setCurrentGesture('Ready');
                            }
                        });

                        console.log('✅ Gesture service started with improved detection');
                    };

                    setTimeout(startGestureDetection, 2000);
                } catch (error) {
                    console.error('❌ Failed to initialize gesture service:', error);
                }

                const checkInterval = setInterval(() => {
                    setIsConnected(socket.isConnected());
                }, 1000);

                return () => {
                    clearInterval(checkInterval);
                    videoManager.stop();
                    gestureService.stop();
                    socket.disconnect();
                    scene.dispose();
                };

            } catch (err) {
                console.error("Failed to initialize session:", err);
            }
        };

        const cleanupPromise = initSession();
        return () => { cleanupPromise.then(cleanup => cleanup && cleanup()); };
    }, [sessionId, user]);

    // --- Media Controls ---
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
            formData.append('name', file.name.replace(/\.[^/.]+$/, ""));
            formData.append('category', 'Session Upload');

            const newModel = await apiRequest('/api/models/upload', {
                method: 'POST',
                body: formData
            });

            if (arSceneRef.current) {
                await arSceneRef.current.loadModel(newModel.url);
                setModelLoaded(true);
            }

            if (socketRef.current) {
                socketRef.current.emit('MODEL_CHANGED', {
                    model_url: newModel.url,
                    model_name: newModel.name,
                    timestamp: Date.now()
                });
            }

            alert(`Model "${newModel.name}" uploaded successfully!`);

        } catch (error) {
            console.error('Model upload failed:', error);
            alert('Failed to upload model. Please try again.');
        }
    };

    const handleToggleModel = () => {
        const newState = !modelVisible;
        setModelVisible(newState);
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
        const newState = !cameraOn;
        setCameraOn(newState);
        if (videoManagerRef.current) videoManagerRef.current.toggleVideo(newState);
    };

    const handleToggleAudio = () => {
        const newState = !micOn;
        setMicOn(newState);
        if (videoManagerRef.current) videoManagerRef.current.toggleAudio(newState);
    };

    const handleLeave = () => {
        setShowLeaveConfirm(true);
    };

    const confirmLeave = () => {
        navigate('/dashboard');
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-background">
            {/* Main content */}
            <div className="relative z-10 h-full flex flex-col">
                {/* Main video area */}
                <div className="flex-1 relative p-4 md:p-6 pb-0">
                    <div className="relative h-full rounded-[24px] overflow-hidden bg-gray-900 shadow-sm border border-gray-200/50 flex">

                        {/* Status Pills */}
                        <div className="absolute top-6 left-6 flex flex-col gap-3 z-30 pointer-events-none">
                            <div className="flex items-center gap-2 bg-white/90 border border-gray-200 shadow-sm backdrop-blur-md rounded-full px-4 py-2">
                                {isConnected ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                )}
                                <span className="text-gray-700 text-sm font-medium">
                                    {isConnected ? 'Connected' : 'Reconnecting...'}
                                </span>
                            </div>

                            {/* Gesture Status */}
                            <div className={`flex items-center gap-2 bg-white/90 border ${gesturesEnabled ? 'border-primary/30 text-primary' : 'border-gray-200 text-gray-500'} shadow-sm backdrop-blur-md rounded-full px-4 py-2 transition-colors`}>
                                <Hand className="w-4 h-4" />
                                <span className="text-sm font-medium">{currentGesture}</span>
                            </div>
                        </div>

                        {/* Host video / big feed */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <div className="relative w-full h-full">
                                {/* Base video */}
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

                                {/* Subtitle overlay */}
                                <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium z-30 pointer-events-none">
                                    {user?.name || "Participant"}
                                </div>

                                {/* Tools Overlay */}
                                <div className="absolute top-6 right-6 z-40 pointer-events-auto shadow-xl rounded-2xl">
                                    <SessionSidebar
                                        activeTool={activeTool}
                                        onSelectTool={setActiveTool}
                                        onModelUpload={handleModelUpload}
                                        modelLoaded={modelLoaded}
                                        onDeleteModel={handleDeleteModel}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="p-4 md:p-6 bg-transparent z-30 flex items-center justify-between">

                    {/* Left: Room Code (host only) or Meeting label */}
                    <div className="hidden md:flex items-center gap-3">
                        {roomCode ? (
                            <button
                                onClick={handleCopyCode}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all group"
                                title="Click to copy code"
                            >
                                <span className="text-gray-400 text-xs">Code:</span>
                                <span className="font-mono font-bold tracking-widest text-primary">{roomCode}</span>
                                {codeCopied
                                    ? <Check className="w-4 h-4 text-green-500" />
                                    : <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />}
                            </button>
                        ) : (
                            <div className="px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-sm">
                                HoloCollab Secure Room
                            </div>
                        )}
                    </div>

                    {/* Center: Primary Controls */}
                    <div className="flex items-center gap-4 mx-auto md:mx-0">
                        <button
                            onClick={handleToggleAudio}
                            className={`p-4 rounded-full transition-all shadow-sm ${!micOn
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {!micOn ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>

                        <button
                            onClick={handleToggleVideo}
                            className={`p-4 rounded-full transition-all shadow-sm ${!cameraOn
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {!cameraOn ? <VideoOff size={22} /> : <Video size={22} />}
                        </button>

                        <button
                            onClick={() => setGesturesEnabled(!gesturesEnabled)}
                            className={`p-4 rounded-full transition-all shadow-sm border ${gesturesEnabled
                                ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            title="Toggle Hand Tracking"
                        >
                            <Hand size={22} />
                        </button>

                        <button
                            onClick={handleToggleModel}
                            className={`p-4 rounded-full transition-all shadow-sm border ${modelVisible
                                ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            title="Toggle 3D Scene"
                        >
                            {modelVisible ? <Eye size={22} /> : <EyeOff size={22} />}
                        </button>

                        <div className="w-px h-8 bg-gray-300 mx-1"></div>

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
                            onClick={() => setShowParticipants(!showParticipants)}
                            className={`p-3.5 rounded-full transition-all border shadow-sm ${showParticipants
                                ? 'bg-gray-100 border-gray-300 text-gray-900'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <Users size={20} />
                        </button>

                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`p-3.5 rounded-full transition-all border shadow-sm ${showChat
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <MessageSquare size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Participants Panel */}
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
                                    <div className="text-xs text-gray-500 font-medium">Host</div>
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
                                        <div className="text-xs text-gray-500">Student</div>
                                    </div>
                                </div>
                                <Mic size={16} className="text-gray-400" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Panel */}
            {showChat && (
                <div className="absolute top-6 right-6 md:right-[350px] bottom-32 w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right-8">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-gray-900 font-semibold text-lg">In-Call Messages</h3>
                        <button onClick={() => setShowChat(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-white pb-4">
                        <ChatPanel socket={socketInstance} user={user} />
                    </div>
                </div>
            )}

            {/* Leave Confirmation Modal */}
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
                .animate-in {
                    animation: slide-in-from-right-8 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #DFE2E8;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #C0C5CF;
                }
            `}</style>
        </div>
    );
};

export default Session;

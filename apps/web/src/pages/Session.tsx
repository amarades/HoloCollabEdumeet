import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ARScene } from '../three/ARScene';

import { SocketManager } from '../realtime/SocketManager';
import { PermissionsService } from '../services/PermissionsService';
import { useAuth } from '../context/AuthContext';
import { useScene } from '../hooks/useScene';
import { useSessionControls } from '../hooks/useSessionControls';
import { useSessionRealtimeListeners } from '../hooks/useSessionRealtimeListeners';
import {
    PhoneOff, Users
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Hooks
import { useMediaSession } from '../hooks/useMediaSession';
import { useGestureSession } from '../hooks/useGestureSession';
import { usePresentationSession } from '../hooks/usePresentationSession';

// Configure PDF.js worker using local Vite asset
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { apiRequest } from '../services/api';

import { ChatPanel } from '../components/session/layout/ChatPanel';
import { Whiteboard } from '../components/session/tools/Whiteboard';
import { QuizPanel } from '../components/session/tools/QuizPanel';
import { MediaPanel } from '../components/session/tools/MediaPanel';
import { SettingsPanel } from '../components/session/tools/SettingsPanel';
import { ScenePanel } from '../components/session/tools/ScenePanel';
import { HostControls } from '../components/session/tools/HostControls';
import { ParticipantApproval } from '../components/session/ParticipantApproval';

// Layout Components
import { SessionHeader } from '../components/session/layout/SessionHeader';
import { SessionMainArea } from '../components/session/layout/SessionMainArea';
import { SessionControlBar } from '../components/session/layout/SessionControlBar';
import { SessionPanels } from '../components/session/layout/SessionPanels';

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

    const [socketInstance, setSocketInstance] = useState<SocketManager | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [gesturesEnabled, setGesturesEnabled] = useState(false); 
    const [modelVisible, setModelVisible] = useState(true);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [visualFilter, setVisualFilter] = useState<'realistic' | 'blue_glow' | 'red_glow'>('realistic');
    const [autoOscillate, setAutoOscillate] = useState(false);

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
    const [isApproved, setIsApproved] = useState(isHost); 
    const [codeCopied, setCodeCopied] = useState(false);

    // ── Media Session Hook ────────────────────────────────────────────────
    const {
        localStream,
        remoteStreams,
        micOn,
        cameraOn,
        setMicEnabled,
        setCameraEnabled,
        toggleMic,
        toggleCamera,
        initializeMedia,
        cleanupMedia
    } = useMediaSession({ sessionId, socketInstance, user });

    // ── Presentation Session Hook ─────────────────────────────────────────
    const {
        presentationMode,
        setPresentationMode,
        currentSlides,
        setCurrentSlides,
        isConverting,
        handleFileUpload,
    } = usePresentationSession({ arSceneRef, socketInstance, isHost: true });

    // ── Gesture Session Hook ──────────────────────────────────────────────
    const {
        currentGesture
    } = useGestureSession({
        gesturesEnabled,
        arSceneRef,
        socketInstance,
        user,
        videoElement: videoRef.current,
        isApproved
    });

    // Meeting timer



    // ── Feature 6: Persistent 3D Library ────────────────────────────────────
    const [libraryModels, setLibraryModels] = useState<any[]>([]);
    
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
            socketInstance?.emit('ENGAGEMENT_SIGNAL', { type });
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [socketInstance]);


    // ── Feature 3 & 4: Socket listeners for new events ───────────────────────
    useSessionRealtimeListeners({
        socketRef,
        socketInstance,
        arSceneRef,
        isHost,
        currentSlides,
        setCurrentSlides,
        setPresentationMode,
        setVisualFilter,
        setAutoOscillate,
    });

    // ── Initialization ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!canvasRef.current || !videoRef.current || !user || !sessionId) return;

        let socket: SocketManager | null = null;
        let scene: ARScene | null = null;
        let checkInterval: ReturnType<typeof setInterval> | null = null;

        const initSession = async () => {
            try {
                // Initialize Media
                initializeMedia(videoRef.current!);

                // ── 3D Scene ─────────────────────────────────────────────────
                scene = new ARScene(canvasRef.current!);
                arSceneRef.current = scene;

                // WebSocket
                socket = new SocketManager();
                socketRef.current = socket;
                
                socket.on('connect', () => {
                    setIsConnected(true);
                    socket?.emit('JOIN_SESSION', { 
                        sessionId, 
                        user,
                        role: sessionRole,
                        roomCode 
                    });
                });

                socket.on('disconnect', () => setIsConnected(false));
                
                socket.on('SESSION_START', (data: any) => {
                    if (data.users) setUsers(data.users.filter((u: any) => u.id !== (user as any).id && u.id !== user.email));
                });

                socket.on('USER_JOINED', (data: any) => {
                    setUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
                });

                socket.on('USER_LEFT', (data: any) => {
                    setUsers(prev => prev.filter(u => u.id !== data.userId));
                });

                // Approval logic
                if (!isHost) {
                    const handleApproved = () => setIsApproved(true);
                    const handleRejected = () => {
                        alert('Your request to join was declined by the host.');
                        navigate('/dashboard');
                    };
                    window.addEventListener('joinApproved', handleApproved);
                    window.addEventListener('joinRejected', handleRejected as EventListener);
                    
                    socket.on('JOIN_APPROVED', handleApproved);
                    socket.on('JOIN_REJECTED', () => handleRejected());
                }



                // Scene transformation sync
                let lastTransformEmit = 0;
                scene.onStateChange = (state) => {
                    const now = Date.now();
                    if (now - lastTransformEmit > 50) {
                        socket?.emit('MODEL_TRANSFORM', state);
                        lastTransformEmit = now;
                    }
                };

                setSocketInstance(socket);

                // Permissions
                PermissionsService.getInstance().initialize(socket, isHost);

                checkInterval = setInterval(() => {
                    setIsConnected(socket?.isConnected() ?? false);
                }, 1000);

            } catch (error) {
                console.error('Session initialization failed:', error);
            }
        };

        initSession();

        return () => {
            if (checkInterval) clearInterval(checkInterval);
            cleanupMedia();
            socketRef.current?.disconnect();
            arSceneRef.current?.dispose();
            PermissionsService.getInstance().destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, user?.email]);

    // ── Feature 11: Auto Load Model from Library ──────────────────────────────
    useEffect(() => {
        if (!isHost || !arSceneRef.current || !socketInstance) return;
        
        const autoModelRaw = sessionStorage.getItem('auto_load_model');
        if (autoModelRaw) {
            try {
                const autoModel = JSON.parse(autoModelRaw);
                const timer = setTimeout(async () => {
                    if (arSceneRef.current) {
                        try {
                            await arSceneRef.current.loadModel(autoModel.url);
                            setModelLoaded(true);
                            socketInstance.emit('MODEL_CHANGED', { 
                                model_url: autoModel.url, 
                                model_name: autoModel.name, 
                                timestamp: Date.now() 
                            });
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
    }, [isHost, socketInstance]);

    const handleModelUpload = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
            alert('Only GLB and GLTF files are supported');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('model', file);
            formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
            formData.append('category', 'Session Upload');
            if (sessionId) formData.append('session_id', sessionId);

            const newModel = await apiRequest('/api/models/upload', { method: 'POST', body: formData });
            if (arSceneRef.current) {
                await arSceneRef.current.loadModel(newModel.url);
                setModelLoaded(true);
            }
            socketInstance?.emit('MODEL_CHANGED', { model_url: newModel.url, model_name: newModel.name, timestamp: Date.now() });
        } catch (error) {
            console.error('Model upload failed:', error);
        }
    };

    const handleAddToLibrary = async () => {
        try {
            await fetchLibraryModels();
            alert('Model added to library successfully!');
        } catch (err) {
            console.error('Failed to add to library:', err);
        }
    };

    const handleToggleModel = () => {
        setModelVisible(v => !v);
        arSceneRef.current?.toggleModelVisibility();
    };

    const handleDeleteModel = () => {
        if (arSceneRef.current) {
            arSceneRef.current.clearModel();
            setModelLoaded(false);
            setModelVisible(true);
        }
    };

    const handleLeave = () => setShowLeaveConfirm(true);
    const confirmLeave = () => {
        if (isHost && sessionId) navigate(`/session/${sessionId}/report`);
        else navigate('/dashboard');
    };

    // ── Waiting for Approval logic ──────────────────────────────────────────

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-background">
            {/* ── Participant Approval Overlay ── */}
            <ParticipantApproval isHost={isHost} />

            <div className="relative z-10 h-full flex flex-col">
                {/* ── Main Area (Video Grid + 3D Canvas) ── */}
                <SessionMainArea
                    user={user}
                    users={users}
                    localStream={localStream}
                    cameraOn={cameraOn}
                    micOn={micOn}
                    remoteStreams={remoteStreams}
                    splitView={splitView}
                    fullscreen3D={fullscreen3D}
                    isScreenSharing={isScreenSharing}
                    reactions={reactions}
                    activeTool={activeTool}
                    onSelectTool={setActiveTool}
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    modelVisible={modelVisible}
                    isHost={isHost}
                    presentationMode={presentationMode}
                    setPresentationMode={setPresentationMode}
                    onTogglePresentation={() => setPresentationMode(!presentationMode)}
                    onUploadPresentation={handleFileUpload}
                    isConverting={isConverting}
                />


                {/* ── Status Overlay (Header) ── */}
                <SessionHeader
                    isConnected={isConnected}
                    connectionQuality={connectionQuality as any}
                    gesturesEnabled={gesturesEnabled}
                    currentGesture={currentGesture}
                    sceneObjectCount={sceneObjects.length}
                    handRaised={handRaised}
                />

                {/* ── Bottom Control Bar ── */}
                <SessionControlBar
                    roomCode={roomCode}
                    codeCopied={codeCopied}
                    onCopyCode={handleCopyCode}
                    micOn={micOn}
                    toggleMic={toggleMic}
                    cameraOn={cameraOn}
                    toggleCamera={toggleCamera}
                    gesturesEnabled={gesturesEnabled}
                    toggleGestures={() => {
                        if (PermissionsService.getInstance().canInteract()) {
                            setGesturesEnabled(g => !g);
                        }
                    }}
                    modelVisible={modelVisible}
                    toggleModel={handleToggleModel}
                    splitView={splitView}
                    setSplitView={setSplitView}
                    fullscreen3D={fullscreen3D}
                    setFullscreen3D={setFullscreen3D}
                    handRaised={handRaised}
                    toggleHand={toggleHand}
                    isScreenSharing={isScreenSharing}
                    toggleScreenShare={toggleScreenShare}
                    showReactionPicker={showReactionPicker}
                    setShowReactionPicker={setShowReactionPicker}
                    onSendReaction={sendReaction}
                    onLeave={handleLeave}
                    isHost={isHost}
                    showParticipants={showParticipants}
                    setShowParticipants={setShowParticipants}
                    showChat={showChat}
                    setShowChat={setShowChat}
                    showHostControls={showHostControls}
                    setShowHostControls={setShowHostControls}
                />
            </div>

            {/* ── Side Panels & Modals ── */}
            <SessionPanels
                showParticipants={showParticipants}
                setShowParticipants={setShowParticipants}
                showChat={showChat}
                setShowChat={setShowChat}
                showHostControls={showHostControls}
                setShowHostControls={setShowHostControls}
                user={user}
                users={users}
                isHost={isHost}
                socketInstance={socketInstance}
                ChatPanel={ChatPanel}
                HostControls={HostControls}
            />

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
            {activeTool === 'settings' && (
                <SettingsPanel
                    onClose={() => setActiveTool(null)}
                    micEnabled={micOn}
                    cameraEnabled={cameraOn}
                    gesturesEnabled={gesturesEnabled}
                    onMicEnabledChange={setMicEnabled}
                    onCameraEnabledChange={setCameraEnabled}
                    onGesturesEnabledChange={setGesturesEnabled}
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

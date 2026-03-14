import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Pre-Join Lobby Screen
 * Shows camera preview, device checks, display name confirmation,
 * and waiting-room state before entering the session.
 */
const PreJoinLobby = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const sessionId = searchParams.get('session') || '';
    const roomCode = searchParams.get('code') || '';
    const role = searchParams.get('role') || 'student';

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [displayName, setDisplayName] = useState(user?.name || '');
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [permissionError, setPermissionError] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [joining, setJoining] = useState(false);

    // Start camera preview
    useEffect(() => {
        let rafId: number | null = null;
        let audioCtx: AudioContext | null = null;

        const startPreview = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // Audio level meter
                audioCtx = new AudioContext();
                const src = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                src.connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);
                const poll = () => {
                    analyser.getByteFrequencyData(data);
                    const avg = data.reduce((s, v) => s + v, 0) / data.length;
                    setAudioLevel(Math.min(100, avg * 2));
                    rafId = requestAnimationFrame(poll);
                };
                poll();
            } catch {
                setPermissionError('Camera/microphone access denied. Check browser permissions.');
            }
        };
        startPreview();
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (audioCtx) void audioCtx.close();
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const toggleCamera = () => {
        streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !cameraOn; });
        setCameraOn(v => !v);
    };

    const toggleMic = () => {
        streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
        setMicOn(v => !v);
    };

    const handleJoin = () => {
        if (!displayName.trim()) return;
        setJoining(true);
        // Stop preview tracks — Session.tsx will re-acquire
        streamRef.current?.getTracks().forEach(t => t.stop());

        // Give the OS a moment to fully release the hardware
        setTimeout(() => {
            localStorage.setItem('user_name', displayName.trim());
            if (role === 'host') {
                navigate('/topic-prep', { state: { sessionId } });
            } else {
                navigate(`/session/${sessionId}`, { state: { displayName: displayName.trim(), roomCode, role } });
            }
        }, 500);
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <h1 className="text-white text-2xl font-bold text-center mb-8">
                    Ready to join?
                </h1>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* Camera Preview */}
                    <div className="space-y-4">
                        <div className="relative rounded-2xl overflow-hidden bg-gray-800 aspect-video">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover transition-opacity ${cameraOn ? 'opacity-100' : 'opacity-0'}`}
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            {!cameraOn && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl text-white font-bold">
                                        {displayName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                                <button
                                    onClick={toggleCamera}
                                    className={`p-3 rounded-full backdrop-blur-md transition-all ${cameraOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white'}`}
                                >
                                    {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={toggleMic}
                                    className={`p-3 rounded-full backdrop-blur-md transition-all ${micOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white'}`}
                                >
                                    {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Mic level indicator */}
                        <div className="flex items-center gap-3">
                            <Mic className={`w-4 h-4 flex-shrink-0 ${micOn ? 'text-green-400' : 'text-gray-500'}`} />
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-400 rounded-full transition-all duration-75"
                                    style={{ width: `${micOn ? audioLevel : 0}%` }}
                                />
                            </div>
                            <span className="text-gray-400 text-xs w-16">{micOn ? 'Hearing you' : 'Muted'}</span>
                        </div>

                        {permissionError && (
                            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{permissionError}</p>
                            </div>
                        )}
                    </div>

                    {/* Join options */}
                    <div className="space-y-5">
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Display name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                                placeholder="Your name"
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                            />
                        </div>

                        {roomCode && (
                            <div className="p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
                                <p className="text-gray-400 text-xs mb-1">Room Code</p>
                                <p className="text-white font-mono font-bold tracking-widest text-lg">{roomCode}</p>
                            </div>
                        )}

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className={`w-2 h-2 rounded-full ${cameraOn ? 'bg-green-400' : 'bg-gray-500'}`} />
                                Camera {cameraOn ? 'on' : 'off'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className={`w-2 h-2 rounded-full ${micOn ? 'bg-green-400' : 'bg-red-400'}`} />
                                Microphone {micOn ? 'on' : 'muted'}
                            </div>
                        </div>

                        <button
                            onClick={handleJoin}
                            disabled={!displayName.trim() || joining}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30"
                        >
                            {joining ? 'Joining…' : 'Join Now'}
                            {!joining && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreJoinLobby;

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Users, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const JoinSession = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loginAsGuest } = useAuth();

    const isGuest = searchParams.get('source') === 'home' || !user;

    const [isLoading, setIsLoading] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [userName, setUserName] = useState('');
    const [error, setError] = useState('');
    const [participants, setParticipants] = useState<any[]>([]);
    const [sessionInfo, setSessionInfo] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (roomCode.length === 6) {
            validateRoom();
        } else {
            setParticipants([]);
            setSessionInfo(null);
        }
    }, [roomCode]);

    const validateRoom = async () => {
        setIsValidating(true);
        setError('');
        try {
            const data = await apiRequest(`/api/sessions/validate/${roomCode}`);
            setSessionInfo(data);
            setParticipants(data.participants || []);
        } catch (err: any) {
            setError('Invalid room code or session has ended.');
            setSessionInfo(null);
            setParticipants([]);
        } finally {
            setIsValidating(false);
        }
    };

    const handleJoin = async () => {
        if (!roomCode) {
            setError('Please enter the room code');
            return;
        }
        if (isGuest && !userName.trim()) {
            setError('Please enter your name');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const body: Record<string, string> = { room_code: roomCode.toUpperCase() };
            if (isGuest) body.user_name = userName.trim();

            const data = await apiRequest('/api/sessions/join', {
                method: 'POST',
                body: JSON.stringify(body),
            });

            if (isGuest) {
                loginAsGuest(userName.trim(), 'student');
            }

            sessionStorage.setItem('room_code', data.room_code);
            sessionStorage.setItem('session_role', data.role || 'student');
            navigate(`/lobby?session=${data.session_id}&code=${data.room_code}&role=${data.role || 'student'}`);
        } catch (err: any) {
            setError(err.message || 'Failed to join. Please check the room code.');
        } finally {
            setIsLoading(false);
        }
    };

    const backPath = isGuest ? '/' : '/dashboard';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="premium-bg">
                <div className="tech-grid opacity-30" />
                <div className="floating-shape circle s1" />
                <div className="floating-shape square s4" />
            </div>

            <div className="max-w-md w-full relative z-10">
                <button
                    onClick={() => navigate(backPath)}
                    className="mb-8 flex items-center gap-2 py-3 px-6 rounded-2xl bg-white border border-gray-100 text-gray-500 hover:text-indigo-500 hover:border-indigo-100 transition-all font-bold text-sm shadow-sm"
                >
                    <ArrowLeft size={18} /> Back
                </button>

                <div className="glass-card p-10 rounded-[40px]">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Join Session</h1>
                        <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Enter your 6-digit room code</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold leading-relaxed">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Meeting Code</label>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="XXXXXX"
                                maxLength={6}
                                className="w-full py-6 px-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl text-center text-4xl font-mono font-black tracking-[0.4em] text-gray-900 focus:border-indigo-400 focus:bg-white transition-all outline-none"
                                autoFocus
                            />
                        </div>

                        {isGuest && sessionInfo && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Your Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Enter display name"
                                    className="w-full p-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl text-gray-900 font-bold focus:border-indigo-400 focus:bg-white transition-all outline-none"
                                />
                            </div>
                        )}

                        {isValidating ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        ) : sessionInfo && (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{sessionInfo.session_name}</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {participants.length === 0 ? (
                                        <span className="text-gray-400 text-xs font-bold italic">Waiting for participants...</span>
                                    ) : (
                                        participants.map((p, idx) => (
                                            <div key={idx} className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 text-[10px] font-black uppercase text-gray-600 shadow-sm flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-indigo-500" /> {p.name}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={isLoading || !roomCode || (isGuest && !userName.trim())}
                        className="w-full py-5 rounded-2xl bg-indigo-500 text-white font-black uppercase tracking-widest text-sm mt-10 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-100 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Join Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinSession;

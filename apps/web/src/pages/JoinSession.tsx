import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const JoinSession = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loginAsGuest } = useAuth();

    // If coming from the Home page (?source=home), they are unauthenticated — need a name
    const isGuest = searchParams.get('source') === 'home' || !user;

    const [isLoading, setIsLoading] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [userName, setUserName] = useState('');
    const [error, setError] = useState('');

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

            // For guests, store a temporary auth context so Session.tsx has a user
            if (isGuest) {
                loginAsGuest(userName.trim(), 'student');
            }

            navigate(`/session/${data.session_id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to join. Please check the room code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleJoin();
    };

    const backPath = isGuest ? '/' : '/dashboard';

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full">
                {/* Back Button */}
                <button
                    onClick={() => navigate(backPath)}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-white/50 py-2 px-4 rounded-full border border-gray-200 hover:bg-white shadow-sm w-fit font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Card */}
                <div className="glass-panel p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="bg-primary/10 text-primary p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-5 mx-auto">
                            <Users className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Join Meeting</h1>
                        <p className="text-gray-500 text-sm">
                            Enter the 6-digit code provided by the host
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-5 mb-8">
                        {/* Room Code — always shown */}
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-1">Meeting Code</label>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                onKeyPress={handleKeyPress}
                                placeholder="XXXXXX"
                                maxLength={6}
                                className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-center text-3xl font-mono tracking-[0.5em] uppercase transition-all"
                                autoFocus
                            />
                        </div>

                        {/* Name — only for unauthenticated guests from Home page */}
                        {isGuest && (
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">Your Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="What should we call you?"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                        )}

                        {/* Logged-in user greeting */}
                        {!isGuest && user && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                                    {user.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-gray-900 font-medium text-sm">{user.name}</div>
                                    <div className="text-xs text-gray-500">Joining as yourself</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleJoin}
                        disabled={isLoading || !roomCode || (isGuest && !userName.trim())}
                        className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
                        ) : (
                            'Join Now'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinSession;

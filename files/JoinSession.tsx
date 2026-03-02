import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, Loader2, Users, Copy, Check } from 'lucide-react';
import { apiRequest } from '../services/api';

const JoinSession = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [userName, setUserName] = useState('');
    const [error, setError] = useState('');

    const handleJoin = async () => {
        if (!roomCode || !userName) {
            setError('Please enter both room code and your name');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const data = await apiRequest('/api/sessions/join', {
                method: 'POST',
                body: JSON.stringify({
                    room_code: roomCode.toUpperCase(),
                    user_name: userName
                })
            });

            // Store user info in localStorage for session
            localStorage.setItem('user', JSON.stringify({
                name: userName,
                role: 'student'
            }));

            // Navigate to session
            navigate(`/session/${data.session_id}`);
        } catch (err: any) {
            console.error('Join error:', err);
            setError(err.message || 'Failed to join session. Please check the room code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleJoin();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/')} 
                    className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Home</span>
                </button>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Join Session</h1>
                        <p className="text-white/60">Enter the room code to join</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-5 mb-6">
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Room Code
                            </label>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                onKeyPress={handleKeyPress}
                                placeholder="XXXXXX"
                                maxLength={6}
                                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl font-mono tracking-widest uppercase transition-all"
                                autoFocus
                            />
                            <p className="text-white/50 text-xs mt-2 text-center">
                                6-character code from your instructor
                            </p>
                        </div>

                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter your name"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Join Button */}
                    <button
                        onClick={handleJoin}
                        disabled={isLoading || !roomCode || !userName}
                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Join Session
                            </>
                        )}
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-white/50 text-sm">
                        Don't have a code? Ask your instructor to share it.
                    </p>
                    <p className="text-white/40 text-xs">
                        Students join as participants • Instructors create sessions
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                
                @keyframes slide-in-from-top-2 {
                    from {
                        transform: translateY(-0.5rem);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                
                .animate-in {
                    animation: fade-in 0.3s ease-out, slide-in-from-top-2 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default JoinSession;

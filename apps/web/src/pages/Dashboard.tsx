import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Video, Plus, Bot, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AIAssistant } from '../components/AIAssistant';
import { apiRequest, API_BASE_URL } from '../services/api';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showAI, setShowAI] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        // Verification check for backend connectivity (as requested)
        const checkBackend = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (response.ok) {
                    console.log("✅ Backend connection verified via /health");
                }
            } catch (err) {
                console.error("❌ Backend connection failure:", err);
            }
        };
        checkBackend();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleJoinSession = () => {
        navigate('/join');
    };

    const handleCreateSession = async () => {
        setIsCreating(true);
        try {
            const data = await apiRequest('/api/sessions/create', {
                method: 'POST',
                body: JSON.stringify({
                    session_name: `${user?.name || 'My'}'s Session`,
                    topic: 'General',
                })
            });
            sessionStorage.setItem('room_code', data.room_code);
            sessionStorage.setItem('session_role', data.role || 'host');
            if (data.host_token) {
                sessionStorage.setItem('host_token', data.host_token);
            } else {
                sessionStorage.removeItem('host_token');
            }
            navigate(`/lobby?session=${data.session_id}&code=${data.room_code}&role=${data.role || 'host'}`);
        } catch (err) {
            console.error('Create session failed:', err);
            alert('Failed to create session. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div className="premium-bg">
                <div className="floating-shape circle s1" />
                <div className="floating-shape square s4" />
                <div className="floating-shape circle s6" />
            </div>

            <nav className="fixed top-0 left-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-purple-500/20">
                <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/40">⬡</div>
                        <h1 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight">
                            HoloCollab<span className="hidden sm:inline text-purple-400 font-medium ml-1">Dashboard</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                        <span className="hidden xs:block text-xs md:text-sm font-bold text-white/40">
                            Welcome, <span className="text-white">{user?.name}</span>
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white hover:border-red-500"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-5xl mx-auto px-6 md:px-10 pt-32 pb-20 w-full">
                <div className="mb-12 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 italic">Workspace</h2>
                    <p className="text-purple-300/50 font-bold uppercase tracking-widest text-[10px] md:text-xs">Manage immersive sessions</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Join Session */}
                    <div
                        className="glass-card p-10 cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl group rounded-[32px]"
                        onClick={handleJoinSession}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-8 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-purple-600/40">
                            <Video className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Join Session</h3>
                        <p className="text-white/40 font-medium leading-relaxed">Enter a 6-digit room code to participate in an ongoing holographic class.</p>
                    </div>

                    {/* Create Session */}
                    <div
                        className={`glass-card p-10 cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl group rounded-[32px] ${isCreating ? 'opacity-70 pointer-events-none' : ''}`}
                        onClick={handleCreateSession}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-8 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                            {isCreating ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8" />}
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">
                            {isCreating ? 'Initializing...' : 'Start New Session'}
                        </h3>
                        <p className="text-white/40 font-medium leading-relaxed">Host a new interactive 3D laboratory environment for your students.</p>
                    </div>
                </div>

                {/* AI Assistant Floating UI */}
                <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 flex flex-col items-end gap-6 w-full pointer-events-none">
                    {showAI && (
                        <div className="w-[calc(100%-3rem)] sm:w-[400px] h-[70vh] sm:h-[600px] rounded-[32px] sm:rounded-[40px] overflow-hidden glass-card pointer-events-auto">
                            <AIAssistant onClose={() => setShowAI(false)} />
                        </div>
                    )}

                    <button
                        onClick={() => setShowAI(!showAI)}
                        className={`w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto ${showAI ? 'bg-white text-gray-900' : 'bg-purple-500 text-white shadow-purple-200'}`}
                    >
                        {showAI ? <LogOut className="w-5 h-5 md:w-6 md:h-6 rotate-180" /> : <Bot className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

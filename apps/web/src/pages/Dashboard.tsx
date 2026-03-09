import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Video, Plus, Bot, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { AIAssistant } from '../components/AIAssistant';
import { apiRequest } from '../services/api';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showAI, setShowAI] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

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
                <div className="tech-grid opacity-30" />
                <div className="floating-shape circle s3" />
                <div className="floating-shape square s6" />
            </div>

            <nav className="fixed top-0 left-0 w-full z-50 bg-white/20 backdrop-blur-md border-b border-gray-100/50">
                <div className="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100">⬡</div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">
                            HoloCollab<span className="text-indigo-500 font-medium ml-1">Dashboard</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-8">
                        <span className="text-sm font-bold text-gray-400">
                            Welcome, <span className="text-gray-900">{user?.name}</span>
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-5xl mx-auto px-10 pt-32 pb-20 w-full">
                <div className="mb-12">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Workspace</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Manage your immersive sessions</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Join Session */}
                    <div
                        className="glass-card p-10 cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl group rounded-[32px]"
                        onClick={handleJoinSession}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-8 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                            <Video className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Join Session</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">Enter a 6-digit room code to participate in an ongoing holographic class.</p>
                    </div>

                    {/* Create Session */}
                    <div
                        className={`glass-card p-10 cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl group rounded-[32px] ${isCreating ? 'opacity-70 pointer-events-none' : ''}`}
                        onClick={handleCreateSession}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-8 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                            {isCreating ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8" />}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">
                            {isCreating ? 'Initializing...' : 'Start New Session'}
                        </h3>
                        <p className="text-gray-500 font-medium leading-relaxed">Host a new interactive 3D laboratory environment for your students.</p>
                    </div>
                </div>

                {/* AI Assistant Floating UI */}
                <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-6">
                    {showAI && (
                        <div className="w-[400px] h-[600px] rounded-[40px] overflow-hidden glass-card">
                            <AIAssistant onClose={() => setShowAI(false)} />
                        </div>
                    )}

                    <button
                        onClick={() => setShowAI(!showAI)}
                        className={`w-16 h-16 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${showAI ? 'bg-white text-gray-900' : 'bg-indigo-500 text-white shadow-indigo-200'}`}
                    >
                        {showAI ? <LogOut className="w-6 h-6 rotate-180" /> : <Bot className="w-6 h-6" />}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

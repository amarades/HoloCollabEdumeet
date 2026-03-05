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
            // Store room metadata so Session page can display it & know role
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
        <div className="min-h-screen bg-background p-8 font-sans">
            <nav className="flex justify-between items-center mb-12 glass-panel px-6 py-4 rounded-2xl">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-gray-900">HoloCollab</span>
                    <span className="text-gray-500 font-normal">EduMeet</span>
                </h1>
                <div className="flex items-center gap-6">
                    <span className="text-gray-500 text-sm">
                        Welcome, <span className="text-gray-900 font-medium">{user?.name}</span>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 hover:bg-red-100 transition-all text-sm font-medium text-red-600"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto relative z-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Home</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Join Session */}
                    <div
                        className="glass-panel p-8 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl group"
                        onClick={handleJoinSession}
                    >
                        <div className="bg-primary/10 text-primary p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                            <Video className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Join Session</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">Have a 6-digit code? Enter a meeting already in progress.</p>
                    </div>

                    {/* Create Session — direct, no form */}
                    <div
                        className={`glass-panel p-8 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl group ${isCreating ? 'opacity-70 pointer-events-none' : ''}`}
                        onClick={handleCreateSession}
                    >
                        <div className="bg-green-50 text-green-600 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                            {isCreating ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8" />}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {isCreating ? 'Creating...' : 'Create Session'}
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">Start a new 3D session instantly and get a code to share with students.</p>
                    </div>
                </div>

                {/* AI Assistant Floating Button/Panel */}
                <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
                    {showAI && (
                        <div className="w-80 h-96 shadow-2xl rounded-2xl overflow-hidden glass-panel">
                            <AIAssistant onClose={() => setShowAI(false)} />
                        </div>
                    )}

                    <button
                        onClick={() => setShowAI(!showAI)}
                        className={`p-4 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${showAI ? 'bg-white text-gray-900 border border-gray-200' : 'bg-primary text-white'
                            }`}
                        title="AI Assistant"
                    >
                        {showAI ? <LogOut className="w-6 h-6 rotate-180" /> : <Bot className="w-6 h-6" />}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

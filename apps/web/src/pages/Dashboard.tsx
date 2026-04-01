import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Video, Plus, Loader2, BarChart3 } from 'lucide-react';
import { apiRequest, API_BASE_URL } from '../services/api';
import { AIChatMenu } from '../components/AIChatMenu';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { motion } from 'framer-motion';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const checkBackend = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (response.ok) {
                    console.log("✅ Backend connection verified");
                }
            } catch (err) {
                console.error("❌ Backend failure:", err);
            }
        };
        checkBackend();
    }, []);

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
                    topic: 'Spatial Computing',
                })
            });
            sessionStorage.setItem('room_code', data.room_code);
            sessionStorage.setItem('session_role', data.role || 'host');
            if (data.host_token) {
                sessionStorage.setItem('host_token', data.host_token);
            }
            navigate(`/lobby?session=${data.session_id}&code=${data.room_code}&role=${data.role || 'host'}`);
        } catch (err) {
            console.error('Create failed:', err);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="bg-bg-white text-text-dark min-h-screen overflow-x-hidden selection:bg-primary/30">
            <AIChatMenu />
            
            {/* Premium Background Elements */}
            <div className="premium-bg"></div>
            <div className="floating-shape s1"></div>
            <div className="floating-shape s2"></div>
            <div className="floating-shape s4 square"></div>
            <div className="floating-shape s6"></div>

            <Sidebar />
            <TopBar />

            <main className="ml-[300px] pt-32 pb-20 pr-10 relative z-10">
                <motion.header 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-14"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-px bg-primary/40"></span>
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Dashboard</p>
                    </div>
                    <h2 className="text-5xl font-black text-white tracking-tighter mb-4 italic">Dashboard<span className="text-primary non-italic ml-2">.</span></h2>
                    <p className="text-gray-500 font-medium max-w-xl">Join or create learning sessions.</p>
                </motion.header>

                <div className="grid grid-cols-12 gap-10">
                    {/* Action Cards */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="col-span-12 lg:col-span-6 glass-card p-12 cursor-pointer group rounded-[40px] relative overflow-hidden"
                        onClick={handleJoinSession}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                        
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-purple-700 text-white flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-[0_0_40px_rgba(147,51,234,0.4)] border border-purple-400">
                            <Video className="w-10 h-10" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Join Session</h3>
                        <p className="text-gray-400 font-medium leading-relaxed mb-10 text-sm">Join an existing session with room code.</p>
                        
                        <div className="flex items-center gap-3 text-purple-600 font-black uppercase text-[10px] tracking-[0.2em] group-hover:gap-5 transition-all">
                            Join Session <span className="material-symbols-outlined text-sm font-bold">arrow_right_alt</span>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`col-span-12 lg:col-span-6 glass-card p-12 cursor-pointer group rounded-[40px] relative overflow-hidden ${isCreating ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={handleCreateSession}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-secondary/10 transition-colors" />
                        
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-[0_0_40px_rgba(168,85,247,0.4)] border border-purple-400">
                            {isCreating ? <Loader2 className="w-10 h-10 animate-spin" /> : <Plus className="w-10 h-10" />}
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Create Session</h3>
                        <p className="text-gray-400 font-medium leading-relaxed mb-10 text-sm">Create a new session and invite participants.</p>
                        
                        <div className="flex items-center gap-3 text-purple-500 font-black uppercase text-[10px] tracking-[0.2em] group-hover:gap-5 transition-all">
                            Create Room <span className="material-symbols-outlined text-sm font-bold">bolt</span>
                        </div>
                    </motion.div>

                    {/* Analytics Teaser */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="col-span-12 glass-card p-12 cursor-pointer group rounded-[50px] relative overflow-hidden"
                        onClick={() => navigate('/profile')}
                    >
                        <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none transition-all group-hover:bg-primary/10"></div>
                        
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 text-primary flex items-center justify-center shadow-inner group-hover:border-primary/60 transition-colors">
                                        <BarChart3 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <span className="px-4 py-1.5 bg-gradient-to-r from-primary/15 to-secondary/15 border border-primary/30 rounded-full text-[9px] font-black uppercase tracking-widest text-primary shadow-lg">Reports</span>
                                    </div>
                                </div>
                                <h3 className="text-4xl font-black text-white mb-6 tracking-tight italic">Session<br /><span className="non-italic"> & Insights.</span></h3>
                                <p className="text-gray-400 font-medium leading-relaxed max-w-2xl text-sm">View session history, reports, and performance analytics.</p>
                            </div>
                            
                            <button className="px-12 py-6 bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_30px_rgba(147,51,234,0.5)] hover:scale-105 hover:shadow-[0_20px_50px_rgba(147,51,234,0.7)] transition-all flex items-center gap-4 border border-purple-400">
                                View Reports <span className="material-symbols-outlined font-black">arrow_forward_ios</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

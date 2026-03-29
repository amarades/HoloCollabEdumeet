import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User as UserIcon, Clock, Brain, BarChart3, TrendingUp, 
    Calendar, Award, ChevronLeft, ChevronRight, BookOpen,
    Filter, Download, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../services/api';

interface SessionHistory {
    session_id: string;
    name: string;
    topic: string;
    date: string;
    duration: number;
    score: number;
}

interface ProfileData {
    user_id: string;
    name: string;
    email: string;
    role: string;
    analytics: {
        total_sessions: number;
        total_learning_minutes: number;
        average_focus_score: number;
        recent_trend: number[];
        topics_engagement: { topic: string; minutes: number }[];
    };
    history: SessionHistory[];
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0, 
        transition: { type: "spring" as const, stiffness: 100 } 
    }
};

const Profile = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profileData = await apiRequest('/api/auth/profile');
                setData(profileData);
            } catch (err) {
                console.error(err);
                setError('Failed to load intelligence profile.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen premium-bg flex items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6"
                >
                    <div className="relative w-20 h-20 mx-auto">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-4 border-purple-500/20 rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Brain className="w-8 h-8 text-purple-400 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-purple-200/50 font-black uppercase tracking-[0.2em] text-xs transition-all">Synchronizing Profile Data…</p>
                </motion.div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen premium-bg flex items-center justify-center p-6">
                <motion.div className="glass-card max-w-md w-full p-10 text-center rounded-[40px] border-red-500/20">
                    <h2 className="text-2xl font-black text-white mb-4 italic">Synchronization Failed</h2>
                    <p className="text-white/40 mb-10">{error}</p>
                    <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest border border-white/10">
                        Return to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen premium-bg p-4 md:p-8 overflow-x-hidden selection:bg-purple-500/30">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-6xl mx-auto space-y-8"
            >
                {/* Header Navigation */}
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="group flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-2xl border border-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <button className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl border border-white/10 transition-all">
                            <Settings size={18} />
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 rounded-2xl border border-purple-500/30 transition-all font-black uppercase tracking-widest text-[10px]">
                            <Download size={14} />
                            Export Data
                        </button>
                    </div>
                </motion.div>

                {/* Profile Primary Card */}
                <motion.div 
                    variants={itemVariants} 
                    className="glass-card rounded-[48px] p-8 md:p-12 border-white/10 relative overflow-hidden group shadow-2xl"
                >
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000">
                        <UserIcon size={240} />
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        <div className="relative">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[40px] bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-white/10 flex items-center justify-center text-5xl md:text-6xl shadow-inner relative group-hover:scale-105 transition-transform duration-500">
                                {data.name[0].toUpperCase()}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-full border-4 border-[#0a0a0a] flex items-center justify-center">
                                <Award size={14} className="text-white" />
                            </div>
                        </div>
                        
                        <div className="text-center md:text-left space-y-4">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter leading-none mb-2">
                                    {data.name}
                                </h1>
                                <p className="text-white/30 text-xs font-black uppercase tracking-[0.4em]">
                                    {data.role} • Level 12 Academic
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                                <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/50">
                                    Member since {new Date().getFullYear()}
                                </div>
                                <div className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    Active Now
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { 
                            label: 'Total Learning', 
                            val: `${data.analytics.total_learning_minutes}m`, 
                            icon: Clock, 
                            color: 'blue',
                            sub: 'Cumulative Minutes'
                        },
                        { 
                            label: 'Avg Focus', 
                            val: `${data.analytics.average_focus_score}%`, 
                            icon: Brain, 
                            color: 'purple',
                            sub: 'Cognitive Efficiency'
                        },
                        { 
                            label: 'Sessions', 
                            val: data.analytics.total_sessions.toString(), 
                            icon: BookOpen, 
                            color: 'emerald',
                            sub: 'Completed Modules'
                        }
                    ].map((stat, idx) => (
                        <motion.div 
                            key={idx}
                            variants={itemVariants}
                            whileHover={{ y: -5 }}
                            className="glass-card rounded-[32px] p-8 border-white/5 relative overflow-hidden group shadow-xl"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center mb-6 border border-${stat.color}-500/20 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} className={`text-${stat.color}-400`} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</p>
                                <h3 className="text-4xl font-black text-white italic tracking-tight">{stat.val}</h3>
                                <p className="text-[9px] font-black text-white/10 uppercase tracking-widest pt-1">{stat.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance Trend Chart */}
                    <motion.div variants={itemVariants} className="glass-card rounded-[40px] p-10 border-white/5 space-y-8 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic tracking-tight">Focus Timeline</h3>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Efficiency over sessions</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-48 flex items-end gap-3 pt-6">
                            {data.analytics.recent_trend.length > 0 ? (
                                data.analytics.recent_trend.map((score: number, i: number) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                        <div className="relative w-full h-full flex items-end">
                                            <motion.div 
                                                initial={{ height: 0 }}
                                                animate={{ height: `${score}%` }}
                                                transition={{ duration: 1, delay: i * 0.1 }}
                                                className={`w-full rounded-t-xl ${score > 80 ? 'bg-purple-500' : 'bg-purple-500/40'} opacity-30 group-hover:opacity-100 transition-opacity shadow-[0_0_20px_rgba(168,85,247,0.2)]`}
                                            />
                                        </div>
                                        <span className="text-[8px] font-black text-white/20 uppercase group-hover:text-white transition-colors">S{i+1}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10">
                                    <p className="text-xs font-black uppercase tracking-widest italic">No Data Points</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Topic Distribution */}
                    <motion.div variants={itemVariants} className="glass-card rounded-[40px] p-10 border-white/5 space-y-8 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic tracking-tight">Topic Mastery</h3>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Time distribution by subject</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {data.analytics.topics_engagement.slice(0, 4).map((topic: {topic: string, minutes: number}, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                        <span className="text-white/60">{topic.topic}</span>
                                        <span className="text-blue-400 italic">{topic.minutes}m</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (topic.minutes / Math.max(1, data.analytics.total_learning_minutes)) * 100)}%` }}
                                            className="h-full bg-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                        />
                                    </div>
                                </div>
                            ))}
                            {data.analytics.topics_engagement.length === 0 && (
                                <div className="py-10 text-center opacity-10 italic font-black uppercase tracking-widest text-xs">Awaiting Engagement</div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Session History Table */}
                <motion.div 
                    variants={itemVariants} 
                    className="glass-card rounded-[48px] p-10 border-white/5 space-y-10 relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-white/60">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white italic tracking-tighter">Session Archive</h3>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Historical Intelligence Log</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH ARCHIVE..." 
                                    className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-6 py-3 text-[9px] font-black tracking-widest text-white outline-none focus:border-purple-500/50 transition-all w-full md:w-64"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                                    <th className="text-left py-6 px-4">Session Context</th>
                                    <th className="text-left py-6 px-4">Subject</th>
                                    <th className="text-left py-6 px-4">Time Entry</th>
                                    <th className="text-left py-6 px-4">Engagement</th>
                                    <th className="text-right py-6 px-4">Registry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.history.map((s: SessionHistory, i: number) => (
                                    <tr key={i} className="group hover:bg-white/[0.02] cursor-pointer transition-all duration-300">
                                        <td className="py-7 px-4">
                                            <div className="flex items-center gap-5">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:bg-purple-500/10 group-hover:text-purple-400 group-hover:border-purple-500/20 transition-all font-black text-xs">
                                                    {i + 1}
                                                </div>
                                                <span className="text-white font-black text-base italic tracking-tight">{s.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-7 px-4">
                                            <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                                                {s.topic}
                                            </span>
                                        </td>
                                        <td className="py-7 px-4 text-[11px] font-black text-white/40 uppercase tracking-widest">
                                            {new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="py-7 px-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 bg-white/5 h-1 rounded-full overflow-hidden border border-white/5">
                                                    <div 
                                                        className={`h-full ${s.score > 80 ? 'bg-emerald-500' : s.score > 50 ? 'bg-amber-400' : 'bg-red-400'} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} 
                                                        style={{ width: `${s.score}%` }}
                                                    />
                                                </div>
                                                <span className={`font-black italic text-xs ${s.score > 80 ? 'text-emerald-400' : s.score > 50 ? 'text-amber-400' : 'text-red-400'}`}>{s.score}%</span>
                                            </div>
                                        </td>
                                        <td className="py-7 px-4 text-right">
                                            <button 
                                                onClick={() => navigate(`/session/${s.session_id}/report`)}
                                                className="p-3 bg-white/5 hover:bg-white/10 text-white/20 hover:text-white rounded-xl border border-white/5 hover:border-white/20 transition-all inline-flex items-center justify-center"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {data.history.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center opacity-10 italic font-black uppercase tracking-[0.3em] text-xs">
                                            Empty Intelligence Core
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Aesthetic Footer */}
                <motion.div variants={itemVariants} className="text-center pt-10 pb-20 opacity-20">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="h-px w-20 bg-gradient-to-r from-transparent to-white" />
                        <Brain size={24} />
                        <div className="h-px w-20 bg-gradient-to-l from-transparent to-white" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">HoloCollab • Integrated Learning Profile</p>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Profile;

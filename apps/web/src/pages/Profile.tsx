import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Video, BarChart3, Loader2, Edit3, Shield, CreditCard, History, User } from 'lucide-react';
import { AIChatMenu } from '../components/AIChatMenu';

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

const Profile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profileData = await apiRequest('/api/auth/profile');
                setData(profileData);
            } catch (err) {
                console.error('Failed to load workspace profile:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                    </div>
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Synchronizing Neural Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-bg-white text-text-dark min-h-screen overflow-x-hidden selection:bg-primary/30">
            <AIChatMenu />
            
            {/* Premium Background Elements */}
            <div className="premium-bg"></div>
            <div className="floating-shape s1"></div>
            <div className="floating-shape s2"></div>
            <div className="floating-shape s3 square"></div>
            <div className="floating-shape s4"></div>
            <div className="floating-shape s5 square"></div>
            <div className="floating-shape s6"></div>

            <Sidebar activePage="/profile" />
            <TopBar />

            <main className="ml-[300px] pt-32 pb-20 pr-10 relative z-10">
                {/* Profile Header */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-14"
                >
                    <div className="relative overflow-hidden glass-card rounded-[40px] p-12 flex flex-col md:flex-row items-center gap-12 border border-white/10 shadow-2xl">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48 transition-all" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] -ml-32 -mb-32" />
                        
                        <div className="relative group">
                            <div className="w-44 h-44 rounded-[40px] p-1 bg-gradient-to-tr from-primary via-secondary to-accent shadow-2xl shadow-primary/20 transition-all duration-700 group-hover:scale-105 group-hover:rotate-3">
                                    <div className="w-full h-full rounded-[36px] overflow-hidden border-4 border-white relative">
                                    <img 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        alt={data?.name} 
                                        src={"https://lh3.googleusercontent.com/aida-public/AB6AXuBScMbyVlk6B0M9gupLXU_IHhbFy-Zam5zaQM_oQlenaFuqjYGpNBY-2R7uolwfsNBEtCmtgLALE3Dhz2D3TTHx7BfsA5am3SOhS6Aswuk8MX8FGizrmJydiMpUVIcXk8yxCIi7pjTJZnwPUzrOk_onzmCMoCQsgACBABxrP_G1QtPr0ZhOwY6XxlOTYJs2kh1TYRdPgYFoOX9gr-QSwYMK-SCKsJjSxwiemHfvjLnO314q6PJV5twln2a44sL5cIu4Jd-qqPUZ3Rb2"}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <button className="absolute -bottom-2 -right-2 bg-primary text-white p-4 rounded-2xl shadow-xl hover:scale-110 transition-transform border-[6px] border-white group/btn">
                                <Edit3 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                            </button>
                        </div>

                        <div className="flex-1 text-center md:text-left z-10">
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-5">
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                                    <Shield className="w-3 h-3 text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">Identity Verified</span>
                                </div>
                                <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest opacity-60">Node ID: 0x8F9C</span>
                            </div>
                            <h1 className="text-6xl font-black tracking-tighter mb-4 italic text-white">
                                {data?.name}<span className="text-primary non-italic">.</span>
                            </h1>
                            <p className="text-gray-400 font-bold tracking-[0.2em] flex items-center justify-center md:justify-start gap-3 uppercase text-xs">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                {data?.role} @ HoloCollab Ecosystem
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-3">
                                {['Spatial Computing', 'Immersive Learning', 'Neural Link'].map((tag) => (
                                    <span key={tag} className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] hover:border-primary/40 hover:text-white transition-all cursor-default">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 z-10 w-full md:w-auto">
                            <button className="btn-premium-primary px-10 py-5 text-[10px] uppercase tracking-[0.25em] font-black">
                                Broadcast Profile
                            </button>
                            <button className="bg-white/5 text-white px-10 py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.25em] hover:bg-white/10 transition-all border border-white/5 shadow-inner">
                                Protocol Settings
                            </button>
                        </div>
                    </div>
                </motion.section>

                {/* Navigation Tabs */}
                <nav className="mb-12 flex gap-12 border-b border-white/5 px-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {[
                        { id: 'identity', label: 'Identity', icon: User },
                        { id: 'history', label: 'History', icon: History },
                        { id: 'security', label: 'Security', icon: Shield },
                        { id: 'billing', label: 'Billing', icon: CreditCard }
                    ].map((tab, i) => (
                        <button 
                            key={tab.id}
                            className={`pb-5 flex items-center gap-3 font-black uppercase tracking-[0.25em] text-[10px] transition-all relative group ${i === 0 ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}
                        >
                            <tab.icon className={`w-3.5 h-3.5 ${i === 0 ? 'text-primary' : 'text-gray-500 group-hover:text-white'}`} />
                            {tab.label}
                            {i === 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary blur-[4px] opacity-40"></div>}
                        </button>
                    ))}
                </nav>

                <div className="grid grid-cols-12 gap-12">
                    <div className="col-span-12 xl:col-span-8">
                        <div className="glass-card rounded-[40px] p-12 relative overflow-hidden h-full border border-white/10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] pointer-events-none transition-all group-hover:bg-primary/10"></div>
                            <h2 className="text-2xl font-black mb-12 flex items-center gap-5 text-white uppercase tracking-[0.3em] italic">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center not-italic border border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.1)]">
                                    <User className="w-6 h-6" />
                                </div>
                                Personal Intelligence
                            </h2>
                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-10">
                                    <div className="group/field">
                                        <label className="block text-[10px] uppercase tracking-[0.4em] text-primary font-black mb-5 ml-1 transition-colors group-focus-within/field:text-white">Display Alias</label>
                                        <div className="relative">
                                            <input 
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-7 py-5 text-sm text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all placeholder:text-gray-700 shadow-inner" 
                                                value={data?.name} 
                                                readOnly 
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20"><Shield className="w-4 h-4" /></div>
                                        </div>
                                    </div>
                                    <div className="group/field">
                                        <label className="block text-[10px] uppercase tracking-[0.4em] text-primary font-black mb-5 ml-1 transition-colors group-focus-within/field:text-white">Neural Address</label>
                                        <div className="relative">
                                            <input 
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-7 py-5 text-sm text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all placeholder:text-gray-700 shadow-inner" 
                                                value={data?.email} 
                                                readOnly 
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20"><Shield className="w-4 h-4" /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="group/field h-full flex flex-col">
                                    <label className="block text-[10px] uppercase tracking-[0.4em] text-primary font-black mb-5 ml-1 transition-colors group-focus-within/field:text-white">Bio Transmission</label>
                                    <textarea 
                                        className="flex-1 w-full bg-white/5 border border-white/10 rounded-2xl px-7 py-5 text-sm text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all placeholder:text-gray-700 resize-none shadow-inner min-h-[160px]" 
                                        defaultValue="Building the future of spatial interaction. Focused on high-fidelity collaborative environments." 
                                    />
                                </div>
                            </div>
                            <div className="mt-12 pt-8 border-t border-white/5 flex justify-end gap-4">
                                <button className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-white hover:bg-white/10 transition-all">
                                    Restore Defaults
                                </button>
                                <button className="px-12 py-5 bg-gradient-to-br from-primary/80 to-secondary/80 hover:from-primary hover:to-secondary border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] text-white transition-all shadow-lg shadow-primary/10">
                                    Update Registry
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 xl:col-span-4 flex flex-col gap-8">
                        <div className="glass-card rounded-[40px] p-10 border border-white/10 h-full">
                            <h2 className="text-xl font-black mb-10 flex items-center gap-4 text-white uppercase tracking-[0.3em] italic">
                                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center not-italic border border-secondary/20">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                Stats
                            </h2>
                            <div className="grid grid-cols-2 gap-5">
                                {[
                                    { label: 'Total Syncs', value: data?.analytics.total_sessions, color: 'primary' },
                                    { label: 'Sync Time', value: data?.analytics.total_learning_minutes + 'h', color: 'secondary' },
                                    { label: 'Focus Avg', value: data?.analytics.average_focus_score + '%', color: 'accent' },
                                    { label: 'Integrity', value: 'HIGH', color: 'primary' }
                                ].map((stat) => (
                                    <div key={stat.label} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col justify-between hover:border-primary/20 transition-all group">
                                        <p className="text-[9px] text-gray-500 mb-6 uppercase tracking-widest font-black group-hover:text-gray-400">{stat.label}</p>
                                        <p className={`text-4xl font-black italic tracking-tighter text-white group-hover:text-${stat.color}`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-10 p-6 glass-panel rounded-[24px] border border-white/5 relative overflow-hidden group cursor-pointer">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-700" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Growth Index</p>
                                        <p className="text-xs text-gray-400 font-bold tracking-tight">System efficiency up 14.2%</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined font-black">trending_up</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12">
                        <div className="flex items-center justify-between mb-10 px-6">
                            <h2 className="text-4xl font-black tracking-tighter text-white flex items-center gap-5 italic uppercase">
                                <div className="w-14 h-14 rounded-[24px] bg-primary/10 text-primary flex items-center justify-center not-italic shadow-[0_0_30px_rgba(124,58,237,0.15)] border border-primary/20">
                                    <History className="w-7 h-7" />
                                </div>
                                Neural Archives
                            </h2>
                            <button className="text-[10px] text-primary font-black uppercase tracking-[0.3em] hover:text-white transition-all border-b border-primary/30 pb-1.5 px-2 hover:bg-primary/5 rounded-t-lg">Deep Storage Retrieval</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {data?.history.map((session, i) => (
                                <motion.div 
                                    key={session.session_id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group glass-card rounded-[48px] border border-white/10 overflow-hidden relative cursor-pointer hover:border-primary/40 transition-all duration-500 shadow-xl"
                                    onClick={() => navigate(`/session/${session.session_id}/report`)}
                                >
                                    <div className="relative h-56 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent z-10" />
                                        <div className="absolute top-6 left-6 z-20">
                                            <div className="flex items-center gap-2 bg-primary/20 backdrop-blur-md text-primary text-[9px] px-4 py-2 rounded-full border border-primary/20 uppercase tracking-[0.25em] font-black shadow-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                Archived
                                            </div>
                                        </div>
                                        <div className="absolute bottom-8 left-8 right-8 z-20 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] text-primary uppercase tracking-[.4em] font-black mb-2 opacity-80">Sync Quality</p>
                                                <p className="text-4xl font-black text-white italic tracking-tighter">{session.score}%</p>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/50 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-2xl group-hover:scale-110">
                                                <span className="material-symbols-outlined text-2xl font-black">visibility</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center group-hover:scale-125 transition-transform duration-[1.5s] ease-out">
                                            <span className="material-symbols-outlined text-8xl text-white/5">memory</span>
                                        </div>
                                    </div>
                                    <div className="p-10">
                                        <h3 className="font-black text-2xl mb-8 text-white tracking-tight group-hover:text-primary transition-colors truncate italic">{session.name}</h3>
                                        <div className="flex items-center gap-8 mb-10">
                                            <div className="flex items-center gap-3 text-gray-500 text-[10px] font-black uppercase tracking-widest group-hover:text-gray-300 transition-colors">
                                                <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                                                {new Date(session.date).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-500 text-[10px] font-black uppercase tracking-widest group-hover:text-gray-300 transition-colors">
                                                <span className="material-symbols-outlined text-primary text-lg">av_timer</span>
                                                {session.duration}m
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-5">
                                            <button className="py-4 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.25em] text-white/60 hover:text-white hover:bg-white/10 transition-all">Metadata</button>
                                            <button className="py-4 rounded-2xl bg-primary/10 border border-primary/30 text-[9px] font-black uppercase tracking-[0.25em] text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5">Intelligence</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            
                            <motion.button 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 }}
                                onClick={() => navigate('/dashboard')}
                                className="flex flex-col items-center justify-center gap-8 glass-card border-2 border-dashed border-white/10 rounded-[48px] hover:border-primary/40 group p-12 h-full min-h-[450px] transition-all bg-white/[0.01] shadow-inner"
                            >
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-[32px] bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500 relative z-10 group-hover:shadow-[0_0_50px_rgba(124,58,237,0.3)]">
                                        <span className="material-symbols-outlined text-primary text-5xl font-black group-hover:rotate-90 transition-transform duration-700">add</span>
                                    </div>
                                    <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-2xl text-white tracking-widest uppercase italic">Initiate Sync</p>
                                    <p className="text-[10px] text-gray-500 mt-4 font-black uppercase tracking-[0.4em] max-w-[180px] mx-auto leading-relaxed">System status optimal. Ready for provisioning.</p>
                                </div>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Contextual FAB */}
            <div className="fixed bottom-12 right-12 z-50">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-20 h-20 rounded-[30px] bg-gradient-to-br from-primary via-secondary to-accent text-white shadow-[0_20px_50px_rgba(124,58,237,0.5)] flex items-center justify-center hover:scale-110 hover:-rotate-12 transition-all group relative border border-white/20"
                >
                    <Video className="w-8 h-8 fill-white/20" />
                    <div className="absolute right-full mr-8 bg-glass-bg backdrop-blur-2xl px-8 py-4 rounded-3xl border border-white/20 text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none translate-x-10 group-hover:translate-x-0 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                        Launch Neural Environment
                    </div>
                    {/* Ring animation */}
                    <div className="absolute inset-0 rounded-[30px] border border-white/40 animate-ping opacity-20" />
                </button>
            </div>
        </div>
    );
};

export default Profile;

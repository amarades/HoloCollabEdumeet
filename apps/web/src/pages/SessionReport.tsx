import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, Clock, Brain, TrendingUp, CheckCircle, AlertTriangle, 
    BarChart3, Award, Home, LayoutDashboard, ChevronDown, Bot,
    ChevronLeft, Share2
} from 'lucide-react';
import { apiRequest, AUTH_TOKEN_KEY } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentStat {
    name: string;
    duration_minutes: number;
    attention_score: number;
    join_time: string | null;
    leave_time: string | null;
}

interface ReportData {
    session_id: string;
    session_name: string;
    topic: string;
    total_students: number;
    average_attention: number;
    average_duration_minutes: number;
    rating: string;
    students: StudentStat[];
    insights: {
        summary: string;
        low_engagement_follow_up: string[];
        recommendation: string;
    };
}

const ATTENTION_COLOR = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
};

const ATTENTION_BG = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-400';
    return 'bg-red-400';
};

const GET_RATING_LABEL = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
};

const RATING_INFO = (rating: string) => {
    switch (rating) {
        case 'Excellent': return { label: 'Excellent', icon: '🏆', color: 'text-green-400', bg: 'bg-green-500/10' };
        case 'Good': return { label: 'Good', icon: '👍', color: 'text-blue-400', bg: 'bg-blue-500/10' };
        case 'Fair': return { label: 'Fair', icon: '📊', color: 'text-amber-400', bg: 'bg-amber-500/10' };
        case 'Needs Attention': return { label: 'Needs Attention', icon: '⚠️', color: 'text-red-400', bg: 'bg-red-500/10' };
        default: return { label: rating, icon: '📝', color: 'text-purple-400', bg: 'bg-purple-500/10' };
    }
};

const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0, 
        transition: { type: "spring" as const, stiffness: 100 } 
    }
};

const cardHover: any = {
    y: -8,
    transition: { type: "spring" as const, stiffness: 300, damping: 20 }
};

const SessionReport = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const isGuest = token === 'guest';

    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'duration_minutes' | 'attention_score', direction: 'asc' | 'desc' }>({ key: 'attention_score', direction: 'desc' });
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [showAI, setShowAI] = useState(false);

    const toggleRow = (index: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(index)) newExpanded.delete(index);
        else newExpanded.add(index);
        setExpandedRows(newExpanded);
    };

    const handleSort = (key: 'name' | 'duration_minutes' | 'attention_score') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleExportCSV = async () => {
        if (!sessionId) return;
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (!token || token === 'guest') throw new Error('Please sign in to export attendance.');

            const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
            const endpoint = `${base}/api/sessions/${sessionId}/export/csv`;
            const response = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`Export failed (${response.status})`);

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `attendance_${sessionId}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            setError('Could not export attendance CSV.');
        }
    };

    useEffect(() => {
        const fetchReport = async () => {
            if (!sessionId) return;
            try {
                const data = await apiRequest(`/api/sessions/${sessionId}/report`);
                setReport(data);
            } catch (err) {
                setError('Could not load the session report.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [sessionId]);

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
                        <motion.div 
                            animate={{ rotate: -360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-4 border-t-purple-500 rounded-full"
                        />
                        <Brain className="absolute inset-0 m-auto w-8 h-8 text-purple-400 animate-pulse" />
                    </div>
                    <p className="text-purple-200/50 font-black uppercase tracking-[0.2em] text-xs">Generating Intelligent Report…</p>
                </motion.div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen premium-bg flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card max-w-md w-full p-10 text-center rounded-[40px] border-red-500/20"
                >
                    <div className="w-20 h-20 bg-red-500/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4 italic">Analysis Interrupted</h2>
                    <p className="text-white/40 font-medium mb-10 leading-relaxed">{error || 'The report could not be retrieved from the intelligence core.'}</p>
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest transition-all border border-white/10"
                    >
                        Return to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    const ratingInfo = RATING_INFO(report.rating);
    
    const sortedStudents = [...report.students].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="min-h-screen premium-bg p-4 md:p-8 overflow-x-hidden">
            {/* Background Dynamics */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div 
                    animate={{ 
                        x: [0, 50, 0], 
                        y: [0, 30, 0],
                        rotate: [0, 10, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-5%] left-[-5%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" 
                />
                <motion.div 
                    animate={{ 
                        x: [0, -40, 0], 
                        y: [0, 60, 0],
                        rotate: [0, -15, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[10%] right-[5%] w-72 h-72 bg-blue-600/10 rounded-full blur-[80px]" 
                />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100" />
            </div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-5xl mx-auto space-y-8"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => navigate('/')}
                            title="Go to Home"
                            className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group flex items-center justify-center"
                        >
                            <Home className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                        </button>
                        <div className="h-6 w-px bg-white/10" />
                        <button
                            onClick={() => navigate(isGuest ? '/join' : '/dashboard')}
                            title={isGuest ? "Join Another Session" : "Back to Workspace"}
                            className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group flex items-center gap-2 pr-6"
                        >
                            <ChevronLeft className="w-5 h-5 text-white/50 group-hover:text-white group-hover:-translate-x-1 transition-transform" />
                            <span className="text-white/70 text-sm font-black uppercase tracking-widest hidden sm:inline">
                                {isGuest ? 'Join Session' : 'Workspace'}
                            </span>
                        </button>
                        <div className="h-10 w-px bg-white/10 hidden md:block" />
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic">Insight.Report</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{report.session_name} • {report.topic}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAI(!showAI)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all shadow-2xl ${showAI ? 'bg-white text-gray-900' : 'bg-purple-600/20 text-purple-200 hover:bg-purple-600/30 border border-purple-500/30'}`}
                        >
                            <Bot className={`w-4 h-4 ${showAI ? 'animate-bounce' : ''}`} />
                            AI Analyst
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-[24px] text-xs font-black uppercase tracking-widest transition-all border border-white/10"
                        >
                            <Share2 className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Overall Rating Card */}
                    <motion.div 
                        variants={itemVariants} 
                        whileHover={cardHover}
                        className="lg:col-span-2 glass-card rounded-[40px] p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group border-white/10"
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Brain size={140} className="text-white" />
                        </div>
                        
                        <div className="flex-shrink-0 w-32 h-32 rounded-[40px] bg-white/5 flex items-center justify-center text-6xl border border-white/10 shadow-2xl relative z-10">
                            {ratingInfo.icon}
                        </div>
                        
                        <div className="text-center md:text-left flex-1 relative z-10">
                            <p className="text-purple-300/50 text-xs uppercase tracking-[0.3em] font-black mb-2">Executive Summary</p>
                            <h2 className={`text-5xl font-black italic tracking-tighter ${ratingInfo.color} leading-none`}>{ratingInfo.label}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                                <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
                                    Quality Score: <span className="text-white">{report.average_attention}%</span>
                                </div>
                                <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
                                    Participants: <span className="text-white">{report.total_students}</span>
                                </div>
                                <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    Verified Metrics
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Summary Column */}
                    <div className="grid grid-cols-3 lg:grid-cols-1 gap-6">
                        {[
                            { icon: Users, val: report.total_students, color: 'purple', label: 'Census' },
                            { icon: Clock, val: `${report.average_duration_minutes}m`, color: 'blue', label: 'Timeline' },
                            { icon: Brain, val: `${report.average_attention}%`, color: 'emerald', label: 'Focus' }
                        ].map((stat, idx) => (
                            <motion.div 
                                key={idx}
                                variants={itemVariants}
                                whileHover={cardHover}
                                className="glass-card rounded-[32px] p-6 lg:p-8 flex flex-col items-center justify-center text-center gap-3 border-white/5"
                            >
                                <div className={`w-12 h-12 rounded-[20px] bg-${stat.color}-500/15 flex items-center justify-center mb-1 border border-${stat.color}-500/10`}>
                                    <stat.icon size={22} className={`text-${stat.color}-400`} />
                                </div>
                                <span className="text-2xl lg:text-3xl font-black text-white leading-none tracking-tighter">{stat.val}</span>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Attention Chart Container */}
                    <motion.div variants={itemVariants} className="glass-card rounded-[48px] p-10 border-white/5">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-white/60">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic tracking-tight">Participant Engagement</h3>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Efficiency Ranking Matrix</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {sortedStudents.map((s, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, x: -30 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className="space-y-3 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm font-black shadow-2xl transition-all group-hover:scale-110 group-hover:border-purple-500/50">
                                                {s.name[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white text-base font-black tracking-tight group-hover:text-purple-400 transition-colors">{s.name}</p>
                                                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest leading-none">{s.duration_minutes}m Cumulative Activity</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-black italic tracking-tighter ${ATTENTION_COLOR(s.attention_score)}`}>
                                                {s.attention_score}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${s.attention_score}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.8, ease: "easeOut", delay: 0.5 + (i * 0.1) }}
                                            className={`h-full rounded-full ${ATTENTION_BG(s.attention_score)} relative shadow-[0_0_20px_rgba(168,85,247,0.3)]`}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ))}
                            {sortedStudents.length === 0 && (
                                <div className="text-center py-20 opacity-20">
                                    <Users size={64} className="mx-auto mb-4" />
                                    <p className="text-sm font-black uppercase tracking-[0.3em]">No Participant Data</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* AI Insights Container */}
                    <motion.div variants={itemVariants} className="glass-card rounded-[48px] p-0 border-white/5 overflow-hidden flex flex-col">
                        <div className="p-10 pb-6">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-300">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic tracking-tight">Intelligence Output</h3>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">AI Generated Post-Session Analysis</p>
                                </div>
                            </div>
                            
                            <div className="space-y-8">
                                <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] space-y-6 relative overflow-hidden group">
                                    <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000 rotate-12">
                                        <TrendingUp size={160} />
                                    </div>
                                    
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-[2px] bg-blue-500" />
                                            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em]">Executive Digest</p>
                                        </div>
                                        <p className="text-white/80 text-base leading-relaxed font-medium italic">
                                            "{report.insights.summary}"
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-3 pt-6 border-t border-white/10 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-[2px] bg-purple-500" />
                                            <p className="text-purple-300 text-[10px] font-black uppercase tracking-[0.3em]">Pedagogical Guidance</p>
                                        </div>
                                        <p className="text-white/70 text-base leading-relaxed font-semibold">
                                            {report.insights.recommendation}
                                        </p>
                                    </div>
                                </div>

                                {report.insights.low_engagement_follow_up.length > 0 && (
                                    <div className="px-2">
                                        <p className="text-red-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                            <AlertTriangle size={14} /> Critical Attention Required
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            {report.insights.low_engagement_follow_up.map((name, i) => (
                                                <motion.span 
                                                    key={i} 
                                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                                                    className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-100 text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all"
                                                >
                                                    Follow-up: {name}
                                                </motion.span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-auto p-6 bg-white/5 border-t border-white/5 grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4 group transition-colors hover:border-emerald-500/30">
                                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                                </div>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Integrity Verified</span>
                            </div>
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4 group transition-colors hover:border-amber-500/30">
                                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <Award className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                                </div>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Core Analysis</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Table Section */}
                {sortedStudents.length > 0 && (
                    <motion.div variants={itemVariants} className="glass-card rounded-[56px] p-12 border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                        
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-white/60">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic tracking-tighter">Participant Ledger</h3>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Detailed Attendance Manifest</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Ledger Sync</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-[11px] font-black uppercase tracking-widest text-white/20 border-b border-white/5">
                                        <th 
                                            className="text-left py-6 px-4 cursor-pointer hover:text-white transition-all group"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-3">
                                                Identity
                                                <ChevronDown size={14} className={`transition-all duration-500 ${sortConfig.key === 'name' ? (sortConfig.direction === 'desc' ? 'rotate-180 text-purple-400' : 'text-purple-400') : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>
                                        <th 
                                            className="text-left py-6 px-4 cursor-pointer hover:text-white transition-all group"
                                            onClick={() => handleSort('duration_minutes')}
                                        >
                                            <div className="flex items-center gap-3">
                                                Timeline
                                                <ChevronDown size={14} className={`transition-all duration-500 ${sortConfig.key === 'duration_minutes' ? (sortConfig.direction === 'desc' ? 'rotate-180 text-blue-400' : 'text-blue-400') : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>
                                        <th 
                                            className="text-left py-6 px-4 cursor-pointer hover:text-white transition-all group"
                                            onClick={() => handleSort('attention_score')}
                                        >
                                            <div className="flex items-center gap-3">
                                                Focus.Efficiency
                                                <ChevronDown size={14} className={`transition-all duration-500 ${sortConfig.key === 'attention_score' ? (sortConfig.direction === 'desc' ? 'rotate-180 text-emerald-400' : 'text-emerald-400') : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>
                                        <th className="text-left py-6 px-4">Performance.Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sortedStudents.map((s, i) => {
                                        const r = RATING_INFO(GET_RATING_LABEL(s.attention_score));
                                        const isExpanded = expandedRows.has(i);
                                        return (
                                            <React.Fragment key={i}>
                                                <tr 
                                                    className={`group cursor-pointer transition-all duration-500 ${isExpanded ? 'bg-white/5 border-l-2 border-purple-500' : 'hover:bg-white/5 hover:translate-x-1'}`}
                                                    onClick={() => toggleRow(i)}
                                                >
                                                    <td className="py-7 px-4">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-12 h-12 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center text-white text-xs font-black group-hover:border-purple-500/50 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all">
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-white font-black text-lg tracking-tight transition-colors group-hover:text-white">{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-7 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <Clock size={16} className="text-white/20 group-hover:text-blue-400 transition-colors" />
                                                            <span className="text-white/60 font-black tracking-tight">{s.duration_minutes}m</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-7 px-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-20 bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    whileInView={{ width: `${s.attention_score}%` }}
                                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                                    className={`h-full ${ATTENTION_BG(s.attention_score)} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} 
                                                                />
                                                            </div>
                                                            <span className={`font-black italic text-base ${ATTENTION_COLOR(s.attention_score)} tracking-tighter`}>
                                                                {s.attention_score}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-7 px-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 shadow-2xl ${r.bg} ${r.color}`}>
                                                                {r.icon} {r.label}
                                                            </span>
                                                            <ChevronDown size={20} className={`text-white/10 transition-all duration-500 ${isExpanded ? 'rotate-180 text-purple-400' : 'group-hover:text-white/40'}`} />
                                                        </div>
                                                    </td>
                                                </tr>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={4} className="p-0 border-none bg-white/[0.02]">
                                                                <motion.div 
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="p-10 pt-4">
                                                                        <div className="bg-white/5 rounded-[40px] p-10 grid grid-cols-2 md:grid-cols-4 gap-10 border border-white/10 relative overflow-hidden group/detail">
                                                                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover/detail:opacity-[0.06] transition-opacity">
                                                                                <Users size={120} />
                                                                            </div>
                                                                            
                                                                            {[
                                                                                { label: 'Admission Time', val: s.join_time ? new Date(s.join_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown' },
                                                                                { label: 'Departure Time', val: s.leave_time ? new Date(s.leave_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Session Active' },
                                                                                { label: 'Operational Duration', val: `${s.duration_minutes} Minutes` },
                                                                                { label: 'Efficiency Class', val: GET_RATING_LABEL(s.attention_score), class: ATTENTION_COLOR(s.attention_score) }
                                                                            ].map((detail, dIdx) => (
                                                                                <div key={dIdx} className="space-y-3 relative z-10">
                                                                                    <p className="text-[11px] text-white/30 uppercase font-black tracking-[0.2em]">{detail.label}</p>
                                                                                    <p className={`text-white text-lg font-black tracking-tight ${detail.class || ''} italic`}>
                                                                                        {detail.val}
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Footer Actions */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 pt-10">
                    <button
                        onClick={() => navigate(isGuest ? '/join' : '/dashboard')}
                        className="flex-1 py-7 bg-white/5 hover:bg-white/10 text-white rounded-[32px] font-black uppercase tracking-[0.3em] transition-all border border-white/10 flex items-center justify-center gap-4 group shadow-2xl hover:translate-y-[-4px]"
                    >
                        <LayoutDashboard className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
                        {isGuest ? 'Join Another' : 'Enter Dashboard'}
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 py-7 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 rounded-[32px] font-black uppercase tracking-[0.3em] transition-all border border-purple-500/30 flex items-center justify-center gap-4 group shadow-2xl hover:translate-y-[-4px]"
                    >
                        <Home className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
                        Return Home
                    </button>
                </motion.div>

                {/* Aesthetic Footer Branding */}
                <motion.div variants={itemVariants} className="text-center pt-10 pb-20 opacity-20">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">HoloCollab • Intelligent Education Analytics</p>
                </motion.div>
            </motion.div>

            {/* AI Assistant Removed */}
        </div>
    );
};

export default SessionReport;

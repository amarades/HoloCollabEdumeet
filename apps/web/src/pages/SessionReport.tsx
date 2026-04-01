import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Loader2, 
    Download, 
    CheckCircle2, 
    BarChart3, 
    Mic, 
    Play, 
    Users, 
    Brain, 
    Clock, 
    Zap,
    History,
    ArrowLeft,
    TrendingUp,
    FileText
} from 'lucide-react';
import { apiRequest, AUTH_TOKEN_KEY } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranscription } from '../context/TranscriptionContext';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { AIChatMenu } from '../components/AIChatMenu';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAarkXMp1O7UqsMspE9iy2ltJaNqZt_QS8';

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
    if (score >= 75) return 'text-primary';
    if (score >= 50) return 'text-secondary';
    return 'text-red-400';
};

const ATTENTION_BG = (score: number) => {
    if (score >= 75) return 'bg-primary';
    if (score >= 50) return 'bg-secondary';
    return 'bg-red-400';
};

const RATING_INFO = (rating: string) => {
    switch (rating) {
        case 'Excellent': return { label: 'Excellent', icon: '🏆', color: 'text-primary', bg: 'bg-primary/10' };
        case 'Good': return { label: 'Good', icon: '👍', color: 'text-secondary', bg: 'bg-secondary/10' };
        case 'Fair': return { label: 'Fair', icon: '📊', color: 'text-accent', bg: 'bg-accent/10' };
        case 'Needs Attention': return { label: 'Needs Attention', icon: '⚠️', color: 'text-red-400', bg: 'bg-red-400/10' };
        default: return { label: rating, icon: '📝', color: 'text-primary', bg: 'bg-primary/10' };
    }
};

const SessionReport = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isHost = 
        user?.role === 'teacher' || 
        user?.role === 'instructor' || 
        user?.role === 'admin' || 
        sessionStorage.getItem('session_role') === 'host';

    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [recordings, setRecordings] = useState<any[]>([]);
    const { isRecordingPostSession, recordingDuration } = useTranscription();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);

    const [sortConfig] = useState<{ key: 'name' | 'duration_minutes' | 'attention_score', direction: 'asc' | 'desc' }>({ key: 'attention_score', direction: 'desc' });

    useEffect(() => {
        if (!sessionId) return;
        let pollInterval: any;
        let attempts = 0;
        const fetchData = async () => {
            try {
                const res = await apiRequest(`/api/sessions/${sessionId}/report`);
                if (res && res.session_id) {
                    setReport(res);
                    setLoading(false);
                    const tRes = await apiRequest(`/api/sessions/${sessionId}/transcripts`);
                    if (tRes && tRes.text && tRes.text.length > 10) {
                        clearInterval(pollInterval);
                        setIsSyncing(false);
                    } else {
                        setIsSyncing(true);
                    }
                }
            } catch (err) {
                console.warn('[Sync] Report not ready yet, retrying...');
            }
        };
        fetchData();
        pollInterval = setInterval(() => {
            attempts++;
            if (attempts >= 24) { clearInterval(pollInterval); setIsSyncing(false); return; }
            fetchData();
        }, 5000);
        return () => clearInterval(pollInterval);
    }, [sessionId]);

    useEffect(() => {
        if (isRecordingPostSession) {
            setIsSyncing(true);
            setSyncProgress(Math.min(100, (recordingDuration / 120) * 100));
        }
    }, [isRecordingPostSession, recordingDuration]);

    const handleExportCSV = async () => {
        if (!sessionId) return;
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const endpoint = `/api/sessions/${sessionId}/export/csv`;
            const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `attendance_${sessionId}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed.', err);
        }
    };

    const generateDirectAISummary = async () => {
        if (!sessionId || !report) return;
        setIsGeneratingAI(true);
        try {
            const tokenResponse = localStorage.getItem(AUTH_TOKEN_KEY);
            const res = await fetch(`/api/sessions/${sessionId}/transcripts`, {
                headers: { Authorization: `Bearer ${tokenResponse}` }
            });
            const data = await res.json();
            const transcriptText = data.text;
            if (!transcriptText || transcriptText.trim() === '') {
                setAiSummary("No transcript data recorded.");
                setIsGeneratingAI(false);
                return;
            }
            const prompt = `Pedagogical analysis: ${report.topic}, ${report.total_students} students, ${report.average_attention}% avg attention. Transcript: ${transcriptText}`;
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const aiData = await aiRes.json();
            const textResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) { setAiSummary(textResponse); }
        } catch (err) {
            setAiSummary("AI Analysis failed.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    useEffect(() => {
        const fetchReport = async () => {
            if (!sessionId) return;
            try {
                const data = await apiRequest(`/api/sessions/${sessionId}/report`);
                setReport(data);
                const recordings = await apiRequest(`/api/sessions/${sessionId}/recordings`);
                setRecordings(recordings);
            } catch (err) { console.error('Failed to load report:', err); }
            finally { setLoading(false); }
        };
        fetchReport();
        if (!isRecordingPostSession && isHost && !aiSummary) generateDirectAISummary();
    }, [sessionId, isRecordingPostSession, isHost, aiSummary]);

    if (loading) return (
        <div className="min-h-screen bg-bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                </div>
                <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Compiling Intelligence Archive...</p>
            </div>
        </div>
    );

    const sortedStudents = [...(report?.students || [])].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });

    const ratingInfo = RATING_INFO(report?.rating || '');

    return (
        <div className="bg-bg-white text-text-dark min-h-screen overflow-x-hidden selection:bg-primary/30">
            <AIChatMenu />
            
            {/* Premium Background Elements */}
            <div className="premium-bg"></div>
            <div className="floating-shape s1"></div>
            <div className="floating-shape s2"></div>
            <div className="floating-shape s3 square"></div>
            <div className="floating-shape s4"></div>
            <div className="floating-shape s6"></div>

            <Sidebar />
            <TopBar />

            <main className="ml-[300px] pt-32 pb-20 pr-10 relative z-10">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="mb-8 flex items-center gap-2 text-gray-500 hover:text-primary transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Return to Command Central</span>
                </button>

                {/* Syncing Banner */}
                <AnimatePresence>
                    {isSyncing && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0, scale: 0.95 }} 
                            animate={{ height: 'auto', opacity: 1, scale: 1 }} 
                            exit={{ height: 0, opacity: 0, scale: 0.95 }} 
                            className="mb-10 glass-panel rounded-3xl overflow-hidden px-10 py-6 flex items-center justify-between border border-primary/20 shadow-[0_0_40px_rgba(124,58,237,0.1)]"
                        >
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    <div className="absolute inset-0 blur-md bg-primary/20 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Archiving Link Insights</p>
                                    <p className="text-xs text-gray-500 font-bold tracking-tight">Syncing spatial telemetry data with neural engine...</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Efficiency</span>
                                    <p className="text-sm font-black text-primary">{Math.round(syncProgress)}%</p>
                                </div>
                                <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                    <motion.div 
                                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_15px_rgba(124,58,237,0.5)]" 
                                        animate={{ width: `${isRecordingPostSession ? syncProgress : 100}%` }} 
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Report Header */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="mb-14"
                >
                    <div className="relative overflow-hidden glass-card rounded-[50px] p-12 flex flex-col md:flex-row items-center gap-12 border border-white/10 shadow-2xl">
                        <div className="absolute top-0 right-0 w-[600px] h-full bg-primary/5 blur-[120px] pointer-events-none" />
                        
                        <div className="flex-shrink-0 w-44 h-44 rounded-[48px] bg-white/5 border border-white/10 flex items-center justify-center text-7xl shadow-2xl z-10 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="relative z-10 group-hover:scale-110 transition-transform duration-700">{ratingInfo.icon}</span>
                        </div>

                        <div className="flex-1 text-center md:text-left z-10">
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-5">
                                <div className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/20 rounded-full">
                                    <Brain className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Neural Synthesis Output</span>
                                </div>
                                <div className={`flex items-center gap-2 px-5 py-2 ${ratingInfo.bg} border border-white/5 rounded-full`}>
                                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${ratingInfo.color}`}>{ratingInfo.label} Integrity</span>
                                </div>
                            </div>
                            <h1 className="text-6xl font-black tracking-tighter mb-4 italic text-white leading-tight">
                                {report?.session_name}<span className="text-primary non-italic">.</span>
                            </h1>
                            <p className="text-gray-400 font-bold tracking-[0.25em] flex items-center justify-center md:justify-start gap-3 uppercase text-[11px]">
                                <History className="w-4 h-4 text-primary" />
                                {report?.topic} • PROTOCOL_DATE_{new Date().toLocaleDateString().replace(/\//g, '_')}
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 z-10 w-full md:w-auto">
                            <button 
                                onClick={handleExportCSV} 
                                className="btn-premium-primary px-10 py-5 text-[10px] uppercase tracking-[0.25em] font-black flex items-center justify-center gap-3"
                            >
                                <Download className="w-4 h-4" /> Export CSV Record
                            </button>
                            <button 
                                onClick={() => navigate('/dashboard')} 
                                className="bg-white/5 text-white px-10 py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.25em] hover:bg-white/10 transition-all border border-white/5 shadow-inner"
                            >
                                Terminate Review
                            </button>
                        </div>
                    </div>
                </motion.section>

                <div className="grid grid-cols-12 gap-12">
                    {/* Stats Summary */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                        <div className="glass-card rounded-[40px] p-10 border border-white/10 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-primary/20 transition-all" />
                            <h2 className="text-xl font-black mb-10 flex items-center gap-5 text-white uppercase tracking-[0.3em] italic">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center not-italic border border-primary/20">
                                    <Zap className="w-6 h-6" />
                                </div>
                                Metrics
                            </h2>
                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    { label: 'Mean Attention', value: report?.average_attention + '%', color: 'primary', icon: BarChart3 },
                                    { label: 'Sync Duration', value: report?.average_duration_minutes + 'm', color: 'white', icon: Clock },
                                    { label: 'Neural Participants', value: report?.total_students, color: 'accent', icon: Users }
                                ].map((stat) => (
                                    <div key={stat.label} className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between hover:border-primary/20 transition-all group/stat cursor-default">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-[.3em] font-black mb-2 group-hover/stat:text-gray-400 transition-colors">{stat.label}</p>
                                            <p className={`text-5xl font-black italic tracking-tighter text-${stat.color}`}>{stat.value}</p>
                                        </div>
                                        <stat.icon className="w-10 h-10 text-white/5 group-hover/stat:text-primary/20 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Audio Records */}
                        <div className="glass-card rounded-[40px] p-10 border border-white/10 shadow-2xl">
                            <h2 className="text-xl font-black mb-10 flex items-center gap-5 text-white uppercase tracking-[0.3em] italic">
                                <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center not-italic border border-secondary/20">
                                    <Mic className="w-5 h-5" />
                                </div>
                                Telemetry Vault
                            </h2>
                            <div className="space-y-5">
                                {recordings.map((rec, idx) => (
                                    <div key={rec.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-4 group/rec hover:bg-white/[0.07] transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                                                    <Play className="w-4 h-4 fill-secondary" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[.25em] text-white/60">Segment_{idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}</span>
                                            </div>
                                            <TrendingUp className="w-4 h-4 text-secondary opacity-40 group-hover/rec:animate-pulse" />
                                        </div>
                                        <audio controls className="w-full h-8 opacity-40 hover:opacity-100 transition-all filter brightness-200">
                                            <source src={rec.url} type="audio/webm" />
                                        </audio>
                                    </div>
                                ))}
                                {recordings.length === 0 && (
                                    <div className="py-16 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                                        <Mic className="w-10 h-10 mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Audio Data Found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis & Students */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-12">
                        {/* AI Summary Card */}
                        <div className="glass-card rounded-[50px] p-12 border border-primary/30 shadow-[0_0_50px_rgba(124,58,237,0.15)] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
                            
                            <div className="flex items-center justify-between mb-12 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-primary/10 rounded-3xl border border-primary/20 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                        <Brain className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-white italic tracking-tighter">Neural Engine Analysis</h3>
                                        <p className="text-[10px] text-primary font-black uppercase tracking-[.4em] mt-1">High-Fidelity Learning Synthesis</p>
                                    </div>
                                </div>
                                {!aiSummary && isHost && (
                                    <button 
                                        onClick={generateDirectAISummary} 
                                        disabled={isGeneratingAI} 
                                        className="px-8 py-4 glass-panel rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-white/10 transition-all border border-primary/30 group/btn flex items-center gap-3"
                                    >
                                        {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />}
                                        {isGeneratingAI ? "Processing..." : "Force Synthesis"}
                                    </button>
                                )}
                            </div>
                            
                            <div className="bg-white/5 rounded-[32px] p-10 border border-white/5 shadow-inner relative z-10">
                                {isGeneratingAI ? (
                                    <div className="py-20 flex flex-col items-center gap-6 opacity-60">
                                        <div className="relative">
                                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                            <div className="absolute inset-0 blur-xl bg-primary/30 animate-pulse" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Synthesizing raw transcripts with pedagogical models...</p>
                                    </div>
                                ) : (
                                    <div className="prose prose-invert prose-p:text-gray-400 prose-headings:text-white prose-headings:italic prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-xs max-w-none text-base leading-relaxed font-medium" style={{ whiteSpace: 'pre-wrap' }}>
                                        {aiSummary ? aiSummary : report?.insights.summary}
                                    </div>
                                )}
                            </div>

                            {/* Decorative footer */}
                            <div className="mt-8 flex items-center justify-between text-[8px] font-black text-white/20 uppercase tracking-[0.5em] relative z-10">
                                <span>Engine_v4.2.0_Stable</span>
                                <span>Confidence: 98.4%</span>
                            </div>
                        </div>

                        {/* Participant Ledger */}
                        <div className="glass-card rounded-[50px] p-12 border border-white/10 overflow-hidden shadow-2xl relative">
                            <h2 className="text-3xl font-black mb-12 flex items-center gap-6 text-white uppercase tracking-[0.2em] italic">
                                <div className="w-14 h-14 rounded-[24px] bg-white/5 text-gray-400 flex items-center justify-center not-italic border border-white/10 shadow-inner">
                                    <Users className="w-7 h-7" />
                                </div>
                                Neural Participant Ledger
                            </h2>
                            <div className="overflow-x-auto h-[400px] scrollbar-hide">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-bg-white/80 backdrop-blur-xl z-20">
                                        <tr className="text-[10px] uppercase tracking-[0.4em] text-primary font-black border-b border-white/10">
                                            <th className="text-left py-6 px-4">Entity Identity</th>
                                            <th className="text-left py-6 px-4">Active Timeline</th>
                                            <th className="text-left py-6 px-4">Focus.Load.Factor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 mt-4">
                                        {sortedStudents.map((s, i) => (
                                            <tr key={i} className="group hover:bg-white/[0.03] transition-all">
                                                <td className="py-7 px-4">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-black text-white group-hover:from-primary/20 group-hover:border-primary/40 transition-all duration-500 group-hover:scale-110 shadow-lg">
                                                            {s.name[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-lg font-black text-white tracking-tight group-hover:text-primary transition-colors">{s.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-7 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="w-4 h-4 text-gray-500" />
                                                        <span className="text-xs text-gray-400 font-bold tracking-tight">{s.duration_minutes}m active_session</span>
                                                    </div>
                                                </td>
                                                <td className="py-7 px-4">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-32 bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 p-0.5">
                                                            <motion.div 
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${s.attention_score}%` }}
                                                                className={`h-full ${ATTENTION_BG(s.attention_score)} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                                                            />
                                                        </div>
                                                        <span className={`font-black italic text-sm ${ATTENTION_COLOR(s.attention_score)} tracking-tighter`}>{s.attention_score}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SessionReport;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, Clock, Brain, TrendingUp, CheckCircle, AlertTriangle, 
    BarChart3, Award, Home, LayoutDashboard, ChevronDown, Bot
} from 'lucide-react';
import { apiRequest, AUTH_TOKEN_KEY } from '../services/api';
import { AIAssistant } from '../components/AIAssistant';

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
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
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
        case 'Excellent': return { label: 'Excellent', icon: '🏆', color: 'text-green-400' };
        case 'Good': return { label: 'Good', icon: '👍', color: 'text-blue-400' };
        case 'Fair': return { label: 'Fair', icon: '📊', color: 'text-amber-400' };
        case 'Needs Attention': return { label: 'Needs Attention', icon: '⚠️', color: 'text-red-400' };
        default: return { label: rating, icon: '📝', color: 'text-purple-400' };
    }
};

const SessionReport = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
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
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-white/70">Generating your session report…</p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen premium-bg flex items-center justify-center">
                <div className="text-center space-y-4">
                    <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                    <p className="text-white/80">{error || 'Report unavailable'}</p>
                    <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-purple-600 text-white rounded-full text-sm">
                        Back to Dashboard
                    </button>
                </div>
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
        <div className="min-h-screen premium-bg p-4 md:p-8">
            {/* Floating Shapes */}
            <div className="floating-shape w-72 h-72 top-[-5%] left-[-5%]" />
            <div className="floating-shape w-48 h-48 bottom-[10%] right-[5%]" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/dashboard')}
                            title="Back to Dashboard"
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20 group"
                        >
                            <LayoutDashboard className="w-5 h-5 text-white/70 group-hover:text-white" />
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            title="Go Home"
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20 group"
                        >
                            <Home className="w-5 h-5 text-white/70 group-hover:text-white" />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Session Report</h1>
                        <p className="text-white/60 text-sm">{report.session_name} — {report.topic}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <button
                            onClick={() => setShowAI(!showAI)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${showAI ? 'bg-purple-600 text-white shadow-purple-900/40' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'}`}
                        >
                            <Bot className="w-4 h-4" />
                            AI Analyst
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-900/20"
                        >
                            <TrendingUp className="w-4 h-4 rotate-90" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Overall Rating Card */}
                <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0 w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-5xl border border-white/20 shadow-inner">
                        {ratingInfo.icon}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <p className="text-white/60 text-sm uppercase tracking-wide font-semibold mb-1">Overall Session</p>
                        <h2 className={`text-3xl font-bold ${ratingInfo.color}`}>{ratingInfo.label}</h2>
                        <p className="text-white/50 text-sm mt-1">
                            Average attention score: <span className="text-purple-300 font-semibold">{report.average_attention}%</span>
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 md:gap-6 text-center">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 mx-auto">
                                <Users className="w-5 h-5 text-purple-300" />
                            </div>
                            <p className="text-2xl font-bold text-white">{report.total_students}</p>
                            <p className="text-white/50 text-xs">Students</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 mx-auto">
                                <Clock className="w-5 h-5 text-blue-300" />
                            </div>
                            <p className="text-2xl font-bold text-white">{report.average_duration_minutes}m</p>
                            <p className="text-white/50 text-xs">Avg. Duration</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/20 mx-auto">
                                <Brain className="w-5 h-5 text-green-300" />
                            </div>
                            <p className="text-2xl font-bold text-white">{report.average_attention}%</p>
                            <p className="text-white/50 text-xs">Attention</p>
                        </div>
                    </div>
                </div>

                {/* Attention Bar Chart */}
                <div className="glass-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-purple-300" />
                        <h3 className="text-white font-semibold">Attention by Student</h3>
                    </div>
                    <div className="space-y-3">
                        {sortedStudents.map((s, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-purple-500/30 flex items-center justify-center text-white text-xs font-bold border border-purple-500/30">
                                            {s.name[0]?.toUpperCase()}
                                        </div>
                                        <span className="text-white/90 text-sm font-medium">{s.name}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${ATTENTION_COLOR(s.attention_score)}`}>
                                        {s.attention_score}%
                                    </span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-700 ${ATTENTION_BG(s.attention_score)}`}
                                        style={{ width: `${s.attention_score}%` }}
                                    />
                                </div>
                                <p className="text-white/40 text-xs">{s.duration_minutes}m in session</p>
                            </div>
                        ))}
                        {sortedStudents.length === 0 && (
                            <p className="text-white/40 text-sm text-center py-4">No student attendance data yet</p>
                        )}
                    </div>
                </div>

                {/* Performance Table */}
                {sortedStudents.length > 0 && (
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-5 h-5 text-amber-300" />
                            <h3 className="text-white font-semibold">Student Performance</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th 
                                            className="text-left text-white/50 font-medium pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Student {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                        </th>
                                        <th 
                                            className="text-left text-white/50 font-medium pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('duration_minutes')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Duration {sortConfig.key === 'duration_minutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                        </th>
                                        <th 
                                            className="text-left text-white/50 font-medium pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('attention_score')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Attention {sortConfig.key === 'attention_score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </div>
                                        </th>
                                        <th className="text-left text-white/50 font-medium pb-3">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sortedStudents.map((s, i) => {
                                        const r = RATING_INFO(GET_RATING_LABEL(s.attention_score));
                                        const isExpanded = expandedRows.has(i);
                                        return (
                                            <React.Fragment key={i}>
                                                <tr 
                                                    className="group cursor-pointer hover:bg-white/5 transition-colors"
                                                    onClick={() => toggleRow(i)}
                                                >
                                                    <td className="py-4 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-white text-xs font-bold">
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-white/90 font-medium">{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4 text-white/70">{s.duration_minutes}m</td>
                                                    <td className="py-4 pr-4">
                                                        <span className={`font-bold ${ATTENTION_COLOR(s.attention_score)}`}>
                                                            {s.attention_score}%
                                                        </span>
                                                    </td>
                                                    <td className="py-4 flex items-center justify-between">
                                                        <span className="text-white/60">{r.icon} {r.label}</span>
                                                        <ChevronDown size={16} className={`text-white/30 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={4} className="pb-4 pt-0">
                                                            <div className="bg-white/5 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] text-white/40 uppercase font-black">Joined At</p>
                                                                    <p className="text-white/80 text-sm">
                                                                        {s.join_time ? new Date(s.join_time).toLocaleTimeString() : 'N/A'}
                                                                    </p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] text-white/40 uppercase font-black">Left At</p>
                                                                    <p className="text-white/80 text-sm">
                                                                        {s.leave_time ? new Date(s.leave_time).toLocaleTimeString() : 'In Progress'}
                                                                    </p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] text-white/40 uppercase font-black">Duration</p>
                                                                    <p className="text-white/80 text-sm">{s.duration_minutes} Minutes</p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] text-white/40 uppercase font-black">Performance</p>
                                                                    <p className={`text-sm font-bold ${ATTENTION_COLOR(s.attention_score)}`}>
                                                                        {s.attention_score}% Score
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Insights */}
                <div className="glass-card rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-300" />
                        <h3 className="text-white font-semibold">AI Session Insights</h3>
                    </div>
                    
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="space-y-1">
                            <p className="text-blue-300 text-xs font-bold uppercase tracking-wider">Session Summary</p>
                            <p className="text-white/80 text-sm italic">"{report.insights.summary}"</p>
                        </div>
                        
                        <div className="space-y-2">
                            <p className="text-purple-300 text-xs font-bold uppercase tracking-wider">Engagement Recommendation</p>
                            <p className="text-white/80 text-sm">{report.insights.recommendation}</p>
                        </div>

                        {report.insights.low_engagement_follow_up.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Action Required: Low Engagement</p>
                                <div className="flex flex-wrap gap-2">
                                    {report.insights.low_engagement_follow_up.map((name, i) => (
                                        <span key={i} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-200 text-[10px] font-bold rounded-lg uppercase">
                                            Follow up: {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 pt-2">
                        {report.average_attention >= 75 && (
                            <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-green-200 text-xs">High engagement detected throughout. Methods used were effective.</p>
                            </div>
                        )}
                        {sortedStudents.length > 0 && (
                            <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                                <Award className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
                                <p className="text-purple-200 text-xs">
                                    Top performer <strong>{sortedStudents[0].name}</strong> demonstrated peak focus.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/20 flex items-center justify-center gap-3 shadow-lg shadow-black/20"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 py-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 rounded-2xl font-bold transition-all border border-purple-500/30 flex items-center justify-center gap-3 shadow-lg shadow-purple-900/20"
                    >
                        <Home className="w-5 h-5" />
                        Return Home
                    </button>
                </div>
            </div>

            {/* AI Assistant Overlay */}
            {showAI && (
                <div className="fixed inset-4 md:inset-auto md:bottom-24 md:right-8 md:w-[400px] md:h-[600px] z-[100] animate-in fade-in slide-in-from-right-8 duration-300">
                    <AIAssistant 
                        onClose={() => setShowAI(false)}
                        modelName={`Session Report: ${report.session_name}`}
                        detectedTopic={report.topic}
                        participants={report.students.map((s, idx) => ({ id: `s_${idx}`, name: s.name }))}
                    />
                </div>
            )}
        </div>
    );
};

export default SessionReport;

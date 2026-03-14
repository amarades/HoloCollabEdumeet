import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Sparkles, Loader2, ArrowRight, ArrowLeft, Brain, Tag, HelpCircle, BookOpen, Lightbulb } from 'lucide-react';
import { apiRequest } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LectureNotes {
    summary: string;
    key_points: string[];
    important_terms: string[];
    follow_up_questions: string[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const CHIP_COLOR_CLASS: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-200 border border-purple-500/30',
    blue: 'bg-blue-500/20 text-blue-200 border border-blue-500/30',
};

const Chip = ({ label, color = 'purple' }: { label: string; color?: string }) => (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CHIP_COLOR_CLASS[color] || CHIP_COLOR_CLASS.purple}`}>
        {label}
    </span>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const TopicPrep = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const sessionId = (location.state as any)?.sessionId || sessionStorage.getItem('session_id');

    // Speech
    const [speechSupported, setSpeechSupported] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    // Manual topic
    const [manualTopic, setManualTopic] = useState('');

    // Clear results when input changes to avoid stale states
    useEffect(() => {
        if (manualTopic || transcript) {
            setDetected(null);
            setNotes(null);
        }
    }, [manualTopic, transcript]);

    // Detection result
    const [isDetecting, setIsDetecting] = useState(false);
    const [detected, setDetected] = useState<any | null>(null);
    const [autoModel, setAutoModel] = useState<any | null>(null);

    // Notes
    const [isGenerating, setIsGenerating] = useState(false);
    const [notes, setNotes] = useState<LectureNotes | null>(null);

    useEffect(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setSpeechSupported(!!SR);
    }, []);

    // ── Speech ────────────────────────────────────────────────────────────────
    const startRecording = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (e: any) => {
            const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
            setTranscript(text);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        recognitionRef.current?.stop();
        setIsRecording(false);
    };

    // ── Detect topic ──────────────────────────────────────────────────────────
    const detectTopic = async () => {
        const input = (manualTopic.trim() || transcript.trim());
        if (!input) return;
        setIsDetecting(true);
        setDetected(null);
        setAutoModel(null);
        setNotes(null);
        try {
            const result = await apiRequest('/api/ai/topic-detect', {
                method: 'POST',
                body: JSON.stringify({ transcript: input }),
            });
            setDetected(result);
            if (result.auto_load_model) {
                setAutoModel(result.auto_load_model);
                sessionStorage.setItem('auto_load_model', JSON.stringify(result.auto_load_model));
            } else {
                sessionStorage.removeItem('auto_load_model');
            }
            // Auto-save to sessionStorage
            if (result.topic) sessionStorage.setItem('detected_topic', result.topic);
        } catch {
            // Simple keyword fallback
            const words = input.split(/\s+/).filter(w => w.length > 3);
            const topic = words.slice(0, 3).join(' ');
            setDetected({ topic, keywords: words.slice(0, 5) });
            sessionStorage.setItem('detected_topic', topic);
            sessionStorage.removeItem('auto_load_model');
        } finally {
            setIsDetecting(false);
        }
    };

    // ── Generate lecture notes ────────────────────────────────────────────────
    const generateNotes = async () => {
        if (!detected) return;
        setIsGenerating(true);
        try {
            const input = detected.topic || manualTopic || transcript;
            const result = await apiRequest('/api/ai/generate-notes', {
                method: 'POST',
                body: JSON.stringify({ topic: input, transcript }),
            });
            setNotes(result);
            sessionStorage.setItem('lecture_notes', JSON.stringify(result));
        } catch {
            const n: LectureNotes = {
                summary: `Introduction to ${detected.topic}.`,
                key_points: [`Overview of ${detected.topic}`, 'Core concepts', 'Practical applications'],
                important_terms: detected.keywords.slice(0, 5),
                follow_up_questions: [`What are the fundamentals of ${detected.topic}?`],
            };
            setNotes(n);
            sessionStorage.setItem('lecture_notes', JSON.stringify(n));
        } finally {
            setIsGenerating(false);
        }
    };

    const proceedToSession = () => {
        if (sessionId) {
            navigate(`/session/${sessionId}`, { state: { role: 'host' } });
        } else {
            navigate('/dashboard');
        }
    };

    const hasInput = transcript.trim() || manualTopic.trim();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative">
            {/* BG Layer */}
            <div className="premium-bg">
                <div className="floating-shape s1" />
                <div className="floating-shape s2" />
                <div className="floating-shape s3" />
                <div className="floating-shape s4" />
                <div className="floating-shape s5" />
                <div className="floating-shape s6" />
                <div className="floating-shape s7" />
            </div>

            <div className="relative z-10 w-full max-w-2xl space-y-5">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Brain className="w-6 h-6 text-purple-300" /> Topic Detection
                            </h1>
                            <p className="text-white/50 text-sm mt-0.5">Prepare your lesson topic and AI notes</p>
                        </div>
                    </div>

                    {/* Room Code Display */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Room Code</span>
                            <span className="text-xl font-mono font-bold text-primary tracking-tighter">
                                {sessionStorage.getItem('room_code') || '------'}
                            </span>
                        </div>
                        <button 
                            onClick={() => {
                                const code = sessionStorage.getItem('room_code');
                                if (code) navigator.clipboard.writeText(code);
                            }}
                            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all text-white/70 hover:text-white"
                            title="Copy Code"
                        >
                            <ArrowRight className="w-4 h-4 rotate-[-45deg]" />
                        </button>
                    </div>
                </div>

                {/* Input card */}
                <div className="glass-card rounded-2xl p-6 space-y-4">
                    <p className="text-sm font-semibold text-white/60 uppercase tracking-wide">Step 1 — Describe your topic</p>

                    {/* Manual input */}
                    <input
                        type="text"
                        value={manualTopic}
                        onChange={e => setManualTopic(e.target.value)}
                        placeholder="e.g. The Human Cardiovascular System"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                    />

                    {/* OR divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/30 text-xs">or speak</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Speech buttons */}
                    {!speechSupported ? (
                        <p className="text-xs text-white/30 text-center">Speech not supported in this browser</p>
                    ) : (
                        <div className="flex items-center gap-3">
                            {!isRecording ? (
                                <button onClick={startRecording} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all">
                                    <Mic className="w-4 h-4" /> Start Speaking
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-all">
                                    <MicOff className="w-4 h-4" />
                                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                    Stop
                                </button>
                            )}
                            {transcript && (
                                <p className="text-white/50 text-xs flex-1 truncate">"{transcript.slice(0, 80)}…"</p>
                            )}
                        </div>
                    )}

                    {/* Transcript box */}
                    {transcript && (
                        <textarea
                            readOnly
                            value={transcript}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 resize-none h-20 focus:outline-none"
                        />
                    )}

                    {/* Detect button */}
                    <button
                        onClick={detectTopic}
                        disabled={isDetecting || !hasInput}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                    >
                        {isDetecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting…</> : <><Sparkles className="w-4 h-4" /> Detect Topic</>}
                    </button>
                </div>

                {/* Detection result */}
                {detected && (
                    <div className="glass-card rounded-2xl p-6 space-y-4 border border-purple-500/30">
                        <p className="text-sm font-semibold text-white/60 uppercase tracking-wide">Step 2 — Detected Topic</p>

                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Tag className="w-5 h-5 text-purple-300" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{detected.topic}</h2>
                                {detected.keywords?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {detected.keywords.map((kw: string, i: number) => <Chip key={i} label={kw} />)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Feature 11: Auto Model Match Notification */}
                        {autoModel && (
                            <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{autoModel.thumbnail}</div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Matched 3D Model</p>
                                        <p className="text-sm font-semibold text-white">{autoModel.name}</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg uppercase">
                                    Ready to Load
                                </div>
                            </div>
                        )}

                        <button
                            onClick={generateNotes}
                            disabled={isGenerating || !!notes}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all"
                        >
                            {isGenerating
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating notes…</>
                                : notes ? '✅ Notes ready' : <><Lightbulb className="w-4 h-4" /> Generate Lecture Notes</>}
                        </button>
                    </div>
                )}

                {/* Lecture Notes preview */}
                {notes && (
                    <div className="glass-card rounded-2xl p-6 space-y-4 border border-blue-500/20">
                        <p className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-300" /> Lecture Notes Preview
                        </p>

                        <p className="text-white/80 text-sm leading-relaxed">{notes.summary}</p>

                        {notes.key_points?.length > 0 && (
                            <div>
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">Key Points</p>
                                <ul className="space-y-1.5">
                                    {notes.key_points.map((pt, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                            <span className="w-1.5 h-1.5 mt-2 rounded-full bg-blue-400 flex-shrink-0" />
                                            {pt}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {notes.important_terms?.length > 0 && (
                            <div>
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">Terms</p>
                                <div className="flex flex-wrap gap-2">
                                    {notes.important_terms.map((t, i) => <Chip key={i} label={t} color="blue" />)}
                                </div>
                            </div>
                        )}

                        {notes.follow_up_questions?.length > 0 && (
                            <div>
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <HelpCircle className="w-3.5 h-3.5" /> Follow-up Questions
                                </p>
                                <ol className="space-y-1.5">
                                    {notes.follow_up_questions.map((q, i) => (
                                        <li key={i} className="text-sm text-white/60">{i + 1}. {q}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                )}

                {/* Proceed button */}
                <button
                    onClick={proceedToSession}
                    className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-semibold transition-all shadow-lg flex items-center justify-center gap-3 mt-2"
                >
                    {notes ? 'Join Session with Notes' : 'Skip & Join Session'}
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default TopicPrep;

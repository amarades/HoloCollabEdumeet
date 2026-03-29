import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, Video, Mic, Sparkles, CheckCircle } from 'lucide-react';
import { apiRequest } from '../services/api';

interface LectureNotes {
    summary: string;
    key_points: string[];
    important_terms: string[];
    follow_up_questions: string[];
}

const CreateSession = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Form Data
    const [sessionName, setSessionName] = useState('');
    const [topic, setTopic] = useState('');

    // Speech Recognition
    const [speechSupported, setSpeechSupported] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    // Lecture Notes
    const [isGenerating, setIsGenerating] = useState(false);
    const [lectureNotes, setLectureNotes] = useState<LectureNotes | null>(null);

    useEffect(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setSpeechSupported(!!SR);
    }, []);

    const startRecording = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;

        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const text = Array.from(event.results)
                .map((r: any) => r[0].transcript)
                .join(' ');
            setTranscript(text);
            // Auto-fill topic field from speech if empty
            if (!topic) {
                const finalText = Array.from(event.results)
                    .filter((r: any) => r.isFinal)
                    .map((r: any) => r[0].transcript)
                    .join(' ');
                if (finalText) setTopic(finalText.trim());
            }
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

    const generateLectureNotes = async () => {
        if (!transcript && !topic) return;
        setIsGenerating(true);
        try {
            const result = await apiRequest('/api/ai/generate-notes', {
                method: 'POST',
                body: JSON.stringify({
                    transcript: transcript || '',
                    topic: topic || '',
                }),
            });
            setLectureNotes(result);
        } catch (err) {
            console.error('Failed to generate lecture notes:', err);
            // Fallback: create basic notes from topic
            if (topic) {
                setLectureNotes({
                    summary: `Session on ${topic}. Use the AI assistant during the session to generate detailed notes.`,
                    key_points: [`Introduction to ${topic}`, 'Key concepts and definitions', 'Practical applications'],
                    important_terms: topic.split(' ').filter(w => w.length > 4),
                    follow_up_questions: [`What are the core principles of ${topic}?`, `How does ${topic} apply in real-world scenarios?`],
                });
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const createSession = async () => {
        if (!sessionName) return;
        setIsCreating(true);
        try {
            const data = await apiRequest('/api/sessions/create', {
                method: 'POST',
                body: JSON.stringify({
                    session_name: sessionName,
                    topic: topic,
                })
            });

            const code = data.room_code || data.session_id.substring(0, 6).toUpperCase();
            setRoomCode(code);
            setSessionId(data.session_id);
            // Persist so the Session page and TopicPrep can read without props
            sessionStorage.setItem('room_code', code);
            sessionStorage.setItem('session_id', data.session_id);
            sessionStorage.setItem('session_role', data.role || 'host');
            if (data.host_token) {
                sessionStorage.setItem('host_token', data.host_token);
            } else {
                sessionStorage.removeItem('host_token');
            }
            // Persist lecture notes if generated already
            if (lectureNotes) {
                sessionStorage.setItem('lecture_notes', JSON.stringify(lectureNotes));
            }
            setIsCreating(false);
            // Navigate to Pre-join Lobby first (Camera/Mic check)
            navigate(`/lobby?session=${data.session_id}&code=${code}&role=host`);
        } catch (err) {
            console.error("Session creation failed", err);
            setIsCreating(false);
        }
    };

    const copyCode = async () => {
        if (roomCode) {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const joinSession = () => {
        if (sessionId && roomCode) {
            navigate(`/lobby?session=${sessionId}&code=${roomCode}&role=host`);
        }
    };

    const hasContent = transcript.trim() || topic.trim();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-xl glass-panel overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 bg-gray-50/50 px-8 py-6 border-b border-gray-100">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 bg-white hover:bg-gray-50 rounded-full transition-colors border border-gray-200 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Start New Meeting
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">Set up your 3D collaboration space</p>
                    </div>
                </div>

                <div className="p-8">
                    {!roomCode ? (
                        <div className="space-y-6">
                            <div className="grid gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Title</label>
                                    <input
                                        type="text"
                                        value={sessionName}
                                        onChange={(e) => setSessionName(e.target.value)}
                                        placeholder="e.g. Weekly Biology Review"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-primary focus:outline-none transition-all focus:ring-2 focus:ring-primary/20 placeholder-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic (Optional)</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="e.g. Cardiovascular System"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-primary focus:outline-none transition-all focus:ring-2 focus:ring-primary/20 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {/* ── Speech Section ──────────────────────────────── */}
                            {!speechSupported ? (
                                <p className="text-xs text-gray-400 text-center">
                                    Speech input not supported in this browser. Type your topic above.
                                </p>
                            ) : (
                                <div className="border border-gray-200 rounded-2xl p-5 space-y-4 bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <Mic className="w-4 h-4 text-purple-500" />
                                        <span className="text-sm font-semibold text-gray-800">Speak Your Topic</span>
                                        <span className="text-xs text-gray-400 ml-auto">optional</span>
                                    </div>

                                    {/* Record button */}
                                    <div className="flex items-center gap-3">
                                        {!isRecording ? (
                                            <button
                                                onClick={startRecording}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-white" />
                                                Start Speaking
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopRecording}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                                Stop
                                            </button>
                                        )}
                                        {isRecording && (
                                            <span className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                Recording…
                                            </span>
                                        )}
                                    </div>

                                    {/* Transcript */}
                                    {transcript && (
                                        <textarea
                                            readOnly
                                            value={transcript}
                                            placeholder="Your words will appear here as you speak..."
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none h-24 focus:outline-none"
                                        />
                                    )}

                                    {/* Generate Notes button */}
                                    {hasContent && (
                                        <button
                                            onClick={generateLectureNotes}
                                            disabled={isGenerating}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                                        >
                                            {isGenerating ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                                            ) : (
                                                <><Sparkles className="w-4 h-4" /> Generate Lecture Notes</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* ── Lecture Notes Preview ───────────────────────── */}
                            {lectureNotes && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">📋</span>
                                        <span className="text-sm font-semibold text-gray-800">Lecture Notes Preview</span>
                                    </div>

                                    <p className="text-sm text-gray-700 leading-relaxed">{lectureNotes.summary}</p>

                                    {lectureNotes.key_points?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Points</p>
                                            <ul className="space-y-1.5">
                                                {lectureNotes.key_points.map((pt, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                        <span className="w-1.5 h-1.5 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                                                        {pt}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {lectureNotes.important_terms?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Important Terms</p>
                                            <div className="flex flex-wrap gap-2">
                                                {lectureNotes.important_terms.map((term, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                        {term}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {lectureNotes.follow_up_questions?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Follow-up Questions</p>
                                            <ol className="space-y-1.5">
                                                {lectureNotes.follow_up_questions.map((q, i) => (
                                                    <li key={i} className="text-sm text-gray-700">
                                                        {i + 1}. {q}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={createSession}
                                disabled={isCreating || !sessionName}
                                className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                            >
                                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Meeting'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-2">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900">Meeting Created</h2>

                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 max-w-sm mx-auto">
                                <p className="text-gray-500 text-sm font-medium mb-3">Share this access code:</p>
                                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                    <p className="text-gray-900 text-3xl font-bold tracking-widest font-mono ml-4">{roomCode}</p>
                                    <button
                                        onClick={copyCode}
                                        className="p-3 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors border border-gray-200/50"
                                        title="Copy Code"
                                    >
                                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Lecture Notes Ready Banner */}
                            {lectureNotes && (
                                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 max-w-sm mx-auto text-left">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-800">Lecture notes ready</p>
                                        <p className="text-xs text-green-600 mt-0.5">Your notes will be available in the session AI assistant</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={joinSession}
                                className="w-full max-w-sm mx-auto py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all shadow-md flex items-center justify-center gap-3"
                            >
                                <Video className="w-5 h-5" /> Join Now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateSession;

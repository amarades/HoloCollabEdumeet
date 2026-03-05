import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, Video } from 'lucide-react';
import { apiRequest } from '../services/api';

const CreateSession = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Form Data
    const [sessionName, setSessionName] = useState('');
    const [topic, setTopic] = useState('');

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
            // Persist so the Session page can read without props
            sessionStorage.setItem('room_code', code);
            sessionStorage.setItem('session_role', data.role || 'host');
            setIsCreating(false);
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
        if (sessionId) {
            navigate(`/session/${sessionId}`, { state: { role: 'host' } });
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-xl glass-panel overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 bg-gray-50/50 px-8 py-6 border-b border-gray-100">
                    <button
                        onClick={() => navigate(-1)}
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

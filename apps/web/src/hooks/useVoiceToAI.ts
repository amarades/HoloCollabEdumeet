import { useState, useRef, useEffect, useCallback } from 'react';

export type SummarizeMode = 'summarize' | 'notes' | 'key_points';

export interface UseVoiceToAIReturn {
    transcript: string;
    summary: string;
    isRecording: boolean;
    isProcessing: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    summarizeWithAI: (mode: SummarizeMode) => Promise<void>;
    error: string | null;
    clearAll: () => void;
}

export const useVoiceToAI = (): UseVoiceToAIReturn => {
    const [transcript, setTranscript] = useState('');
    const [summary, setSummary] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const interimTranscriptRef = useRef('');

    const getSpeechRecognition = (): any | null => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        return SpeechRecognition ?? null;
    };

    const startRecording = useCallback(() => {
        if (isRecording) return;

        const SpeechRecognition = getSpeechRecognition();
        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        setError(null);
        setSummary('');
        setTranscript('');
        interimTranscriptRef.current = '';

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
            let finalChunk = '';
            let interimChunk = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalChunk += result[0].transcript;
                } else {
                    interimChunk += result[0].transcript;
                }
            }

            if (finalChunk) {
                setTranscript(prev => (prev + ' ' + finalChunk).trim());
            }

            interimTranscriptRef.current = interimChunk;
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') return; // Non-fatal: ignore
            console.error('SpeechRecognition error:', event.error);
            setError(`Speech recognition error: ${event.error}`);
            setIsRecording(false);
        };

        recognition.onend = () => {
            // Flush any lingering interim text as final
            if (interimTranscriptRef.current.trim()) {
                setTranscript(prev => (prev + ' ' + interimTranscriptRef.current).trim());
                interimTranscriptRef.current = '';
            }
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e) {
            setError('Failed to start speech recognition.');
            setIsRecording(false);
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    const summarizeWithAI = useCallback(async (mode: SummarizeMode): Promise<void> => {
        const currentTranscript = transcript.trim();
        if (!currentTranscript) {
            setError('No transcript available. Please record some speech first.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setSummary('');

        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Please log in to use the AI summarization feature.');

            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ text: currentTranscript, mode }),
            });

            if (!response.ok) {
                let errorDetail = `Request failed with status ${response.status}`;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errData = await response.json();
                        errorDetail = errData.detail?.message || errData.detail || errorDetail;
                    }
                } catch {
                    // Ignore parse errors — keep the status-based message
                }
                throw new Error(errorDetail);
            }

            const data = await response.json();
            setSummary(data.result ?? data.response ?? '');
        } catch (err: any) {
            console.error('Voice-to-AI summarization error:', err);
            setError(err.message || 'Failed to generate AI summary.');
        } finally {
            setIsProcessing(false);
        }
    }, [transcript]);

    const clearAll = useCallback(() => {
        setTranscript('');
        setSummary('');
        setError(null);
        interimTranscriptRef.current = '';
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        };
    }, []);

    return {
        transcript,
        summary,
        isRecording,
        isProcessing,
        startRecording,
        stopRecording,
        summarizeWithAI,
        error,
        clearAll,
    };
};

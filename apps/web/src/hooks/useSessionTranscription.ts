import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

interface UseSessionTranscriptionProps {
    sessionId: string | undefined;
    isHost: boolean;
    isActive: boolean;
}

export const useSessionTranscription = ({ sessionId, isHost, isActive }: UseSessionTranscriptionProps) => {
    const recognitionRef = useRef<any>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const lastUploadRef = useRef<number>(Date.now());
    const accumulatedTextRef = useRef<string>('');
    const retryCountRef = useRef<number>(0);
    const retryTimeoutRef = useRef<any>(null);

    useEffect(() => {
        if (!isHost || !isActive || !sessionId) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser.');
            return;
        }

        const startRecognition = () => {
            if (!recognitionRef.current) return;
            try {
                recognitionRef.current.start();
            } catch (e) {
                // If it's already started, start() throws an error. We can ignore it.
            }
        };

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('Session transcription started (Silent)');
            setIsTranscribing(true);
            retryCountRef.current = 0; // Reset retries on success
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                accumulatedTextRef.current += ' ' + finalTranscript;
                
                const now = Date.now();
                if (now - lastUploadRef.current > 30000 || accumulatedTextRef.current.length > 500) {
                    uploadTranscript(accumulatedTextRef.current.trim());
                    accumulatedTextRef.current = '';
                    lastUploadRef.current = now;
                }
            }
        };

        recognition.onerror = (event: any) => {
            // "no-speech" is not a terminal error, recognition stays active
            if (event.error === 'no-speech') return;
            
            console.error(`Transcription error: ${event.error}`);
            setIsTranscribing(false);

            // Special handling for network error - use backoff
            if (event.error === 'network') {
                retryCountRef.current++;
                const delay = Math.min(5000 * Math.pow(2, retryCountRef.current - 1), 60000); // 5s, 10s, 20s... max 1m
                console.warn(`Network error detected. Retrying transcription in ${delay/1000}s (Attempt ${retryCountRef.current})`);
                
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(() => {
                    if (isActive && isHost) startRecognition();
                }, delay);
            }
        };

        recognition.onend = () => {
            setIsTranscribing(false);
            // Only restart automatically if it wasn't a fatal error (which handles its own retry)
            // If it just "timed out" due to silence, let's restart it immediately
            if (isActive && isHost && retryCountRef.current === 0) {
                startRecognition();
            }
        };

        const uploadTranscript = async (text: string) => {
            if (!text) return;
            try {
                await apiRequest(`/api/sessions/${sessionId}/transcripts?text=${encodeURIComponent(text)}`, {
                    method: 'POST'
                });
            } catch (err) {
                console.error('Failed to upload transcript:', err);
            }
        };

        recognitionRef.current = recognition;
        startRecognition();

        return () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                if (accumulatedTextRef.current.trim()) {
                    uploadTranscript(accumulatedTextRef.current.trim());
                }
            }
        };
    }, [sessionId, isHost, isActive]);

    return { isTranscribing };
};

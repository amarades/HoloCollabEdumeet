import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

interface TranscriptionContextType {
    startPostSessionRecording: (sessionId: string) => void;
    startSessionTranscription: (sessionId: string) => void;
    stopSessionTranscription: () => void;
    isRecordingPostSession: boolean;
    isTranscribing: boolean;
    recordingDuration: number;
}

const TranscriptionContext = createContext<TranscriptionContextType | undefined>(undefined);

export const TranscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isRecordingPostSession, setIsRecordingPostSession] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);
    const sessionIdRef = useRef<string | null>(null);
    
    const recognitionRef = useRef<any>(null);
    const accumulatedTextRef = useRef<string>('');
    const lastUploadRef = useRef<number>(Date.now());
    const isOvertimeRef = useRef<boolean>(false);

    const uploadTranscript = useCallback(async (text: string) => {
        if (!text || !sessionIdRef.current) return;
        try {
            await apiRequest(`/api/sessions/${sessionIdRef.current}/transcripts`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });
            console.log(`[Transcription] Uploaded chunk: ${text.substring(0, 30)}...`);
        } catch (err) {
            console.error('[Transcription] Failed to upload transcript:', err);
        }
    }, []);

    const startSessionTranscription = useCallback((sessionId: string) => {
        sessionIdRef.current = sessionId;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser.');
            return;
        }

        if (recognitionRef.current) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsTranscribing(true);
            console.log('[Transcription] Engine active');
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
            if (event.error === 'no-speech') return;
            console.error(`[Transcription] Error: ${event.error}`);
            setIsTranscribing(false);
        };

        recognition.onend = () => {
            setIsTranscribing(false);
            // Auto-restart if we haven't reached overtime limit or session hasn't been stopped
            if (sessionIdRef.current && (!isOvertimeRef.current || isRecordingPostSession)) {
                try {
                    recognition.start();
                } catch (e) {}
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {}
    }, [uploadTranscript, isRecordingPostSession]);

    const stopSessionTranscription = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (accumulatedTextRef.current.trim()) {
            uploadTranscript(accumulatedTextRef.current.trim());
            accumulatedTextRef.current = '';
        }
        setIsTranscribing(false);
        isOvertimeRef.current = false;
    }, [uploadTranscript]);

    const startPostSessionRecording = async (sessionId: string) => {
        if (isRecordingPostSession) return;
        
        sessionIdRef.current = sessionId;
        isOvertimeRef.current = true;
        
        // Ensure transcription is running for the overtime period
        if (!recognitionRef.current) {
            startSessionTranscription(sessionId);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await uploadRecording(blob);
                stream.getTracks().forEach(track => track.stop());
                
                // Also stop transcription when the audio recording stops
                stopSessionTranscription();
            };

            mediaRecorder.start();
            setIsRecordingPostSession(true);
            setRecordingDuration(0);

            let seconds = 0;
            timerRef.current = setInterval(() => {
                seconds += 1;
                setRecordingDuration(seconds);
                if (seconds >= 120) {
                    stopRecording();
                }
            }, 1000);

            console.log(`[PostSession] Recording & Overtime Transcription started (2 min)`);
        } catch (err) {
            console.error('Failed to start post-session recording:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setIsRecordingPostSession(false);
    };

    const uploadRecording = async (blob: Blob) => {
        if (!sessionIdRef.current) return;
        
        const formData = new FormData();
        formData.append('file', blob, 'post_session_voice.webm');
        formData.append('duration', recordingDuration.toString());

        try {
            await apiRequest(`/api/sessions/${sessionIdRef.current}/recordings/upload`, {
                method: 'POST',
                body: formData,
            });
            console.log('[PostSession] Recording uploaded.');
        } catch (err) {
            console.error('[PostSession] Upload failed:', err);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return (
        <TranscriptionContext.Provider value={{ 
            startPostSessionRecording, 
            startSessionTranscription,
            stopSessionTranscription,
            isRecordingPostSession, 
            isTranscribing,
            recordingDuration 
        }}>
            {children}
        </TranscriptionContext.Provider>
    );
};

export const useTranscription = () => {
    const context = useContext(TranscriptionContext);
    if (context === undefined) {
        throw new Error('useTranscription must be used within a TranscriptionProvider');
    }
    return context;
};

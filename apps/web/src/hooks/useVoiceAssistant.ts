import { useState, useCallback, useRef } from 'react';
import { apiRequest } from '../services/api';
import { SocketManager } from '../realtime/SocketManager';

interface Params {
    socketInstance: SocketManager | null;
    isApproved: boolean;
}

export function useVoiceAssistant({ socketInstance, isApproved }: Params) {
    const [voiceActive, setVoiceActive] = useState(false);
    const recognitionRef = useRef<any>(null);
    const processingRef = useRef(false);

    const toggleVoice = useCallback(() => {
        if (!isApproved) return;
        
        if (voiceActive) {
            recognitionRef.current?.stop();
            setVoiceActive(false);
        } else {
            startRecognition();
        }
    }, [voiceActive, isApproved]);

    const startRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (!recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                console.log('[VoiceAssistant] Started listening...');
                setVoiceActive(true);
            };

            recognition.onresult = async (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('[VoiceAssistant] Recognized text:', transcript);
                
                if (processingRef.current) return;
                processingRef.current = true;

                try {
                    // Send to AI chat endpoint
                    const response = await apiRequest('/api/ai/chat', {
                        method: 'POST',
                        body: JSON.stringify({
                            history: [],
                            message: `[Voice Command]: ${transcript}`
                        })
                    });

                    if (response.response) {
                        // Emit to chat so others can see it (optional, but good for feedback)
                        socketInstance?.emit('CHAT_SEND', {
                            sender: 'AI Assistant (Voice)',
                            text: response.response,
                            timestamp: Date.now()
                        });
                    }
                } catch (err) {
                    console.error('[VoiceAssistant] Error processing command:', err);
                } finally {
                    processingRef.current = false;
                }
            };

            recognition.onerror = (event: any) => {
                console.error('[VoiceAssistant] Recognition error:', event.error);
                setVoiceActive(false);
            };

            recognition.onend = () => {
                console.log('[VoiceAssistant] Stopped listening.');
                setVoiceActive(false);
            };

            recognitionRef.current = recognition;
        }

        try {
            recognitionRef.current.start();
        } catch (err) {
            console.error('[VoiceAssistant] Failed to start recognition:', err);
            setVoiceActive(false);
        }
    };

    return {
        voiceActive,
        toggleVoice
    };
}

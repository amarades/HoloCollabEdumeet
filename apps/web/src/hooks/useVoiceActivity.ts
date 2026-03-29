import { useEffect, useRef, useState } from 'react';

interface UseVoiceActivityProps {
    stream: MediaStream | null;
    enabled: boolean;
    onSpeakingChange?: (isSpeaking: boolean) => void;
    threshold?: number; // 0 to 255
    debounceMs?: number;
}

export const useVoiceActivity = ({
    stream,
    enabled,
    onSpeakingChange,
    threshold = 15,
    debounceMs = 500
}: UseVoiceActivityProps) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastSpeakTimeRef = useRef<number>(0);
    const isSpeakingRef = useRef<boolean>(false);

    useEffect(() => {
        if (!stream || !enabled) {
            if (isSpeakingRef.current) {
                setIsSpeaking(false);
                isSpeakingRef.current = false;
                onSpeakingChange?.(false);
            }
            cleanup();
            return;
        }

        const initAudio = () => {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }

                const ctx = audioContextRef.current;
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }

                analyserRef.current = ctx.createAnalyser();
                analyserRef.current.fftSize = 512;
                analyserRef.current.smoothingTimeConstant = 0.4;

                streamSourceRef.current = ctx.createMediaStreamSource(stream);
                streamSourceRef.current.connect(analyserRef.current);

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                
                const checkVolume = () => {
                    if (!analyserRef.current) return;
                    
                    analyserRef.current.getByteFrequencyData(dataArray);
                    
                    // Simple average volume
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / dataArray.length;
                    const now = Date.now();

                    if (average > threshold) {
                        lastSpeakTimeRef.current = now;
                        if (!isSpeakingRef.current) {
                            setIsSpeaking(true);
                            isSpeakingRef.current = true;
                            onSpeakingChange?.(true);
                        }
                    } else if (isSpeakingRef.current && (now - lastSpeakTimeRef.current > debounceMs)) {
                        setIsSpeaking(false);
                        isSpeakingRef.current = false;
                        onSpeakingChange?.(false);
                    }

                    animationFrameRef.current = requestAnimationFrame(checkVolume);
                };

                checkVolume();
            } catch (err) {
                console.error('[useVoiceActivity] Failed to initialize audio analysis:', err);
            }
        };

        initAudio();

        return cleanup;
    }, [stream, enabled, threshold, debounceMs]);

    const cleanup = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamSourceRef.current) {
            streamSourceRef.current.disconnect();
            streamSourceRef.current = null;
        }
        // Don't close AudioContext completely as it's expensive to recreate
    };

    return { isSpeaking };
};

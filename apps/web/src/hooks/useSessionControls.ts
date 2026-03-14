/**
 * useSessionControls.ts
 * Hook managing raise-hand, emoji reactions, screen share, and connection quality.
 * Centralises docx checklist features into a single composable hook.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { SocketManager } from '../realtime/SocketManager';

export interface Reaction {
    id: string;
    userId: string;
    userName: string;
    emoji: string;
    timestamp: number;
}

export const REACTIONS = ['\u{1F44D}', '\u{1F44F}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F389}'];

export function useSessionControls(socket: SocketManager | null, userName: string) {
    const [handRaised, setHandRaised] = useState(false);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
    const screenStreamRef = useRef<MediaStream | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        socket?.emit('SCREEN_SHARE_STOP', { userName });
    }, [socket, userName]);

    // Listen for incoming reactions and hand-raise events
    useEffect(() => {
        if (!socket) return;

        const offReaction = socket.on('REACTION', (data: any) => {
            const reaction: Reaction = {
                id: `${data.userId}_${Date.now()}`,
                userId: data.userId,
                userName: data.userName,
                emoji: data.emoji,
                timestamp: Date.now(),
            };
            setReactions(prev => [...prev, reaction]);
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reaction.id));
            }, 4000);
        });

        const offRaise = socket.on('HAND_RAISE', () => { /* handled via USER_UPDATE */ });
        const offLower = socket.on('HAND_LOWER', () => { /* handled via USER_UPDATE */ });
        const offMute = socket.on('HOST_MUTE', () => {
            console.log('[HostControl] Host requested mute');
        });

        return () => {
            offReaction();
            offRaise();
            offLower();
            offMute();
        };
    }, [socket]);

    // Simulated connection quality ping (real impl would use WebRTC stats API)
    useEffect(() => {
        const interval = setInterval(() => {
            const rtt = Math.random() * 300;
            setConnectionQuality(rtt < 80 ? 'good' : rtt < 200 ? 'fair' : 'poor');
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleHand = useCallback(() => {
        const next = !handRaised;
        setHandRaised(next);
        socket?.emit(next ? 'HAND_RAISE' : 'HAND_LOWER', { userName });
    }, [handRaised, socket, userName]);

    const sendReaction = useCallback((emoji: string) => {
        socket?.emit('SEND_REACTION', { emoji, userName });
        const local: Reaction = {
            id: `local_${Date.now()}`,
            userId: 'local',
            userName,
            emoji,
            timestamp: Date.now(),
        };
        setReactions(prev => [...prev, local]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== local.id)), 4000);
    }, [socket, userName]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: true,
                audio: true,
            });
            screenStreamRef.current = stream;
            setIsScreenSharing(true);
            socket?.emit('SCREEN_SHARE_START', { userName });

            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };
        } catch (err) {
            console.error('Screen share failed:', err);
        }
    }, [socket, userName, stopScreenShare]);

    const toggleScreenShare = useCallback(() => {
        if (isScreenSharing) stopScreenShare();
        else startScreenShare();
    }, [isScreenSharing, startScreenShare, stopScreenShare]);

    return {
        handRaised,
        toggleHand,
        reactions,
        sendReaction,
        isScreenSharing,
        toggleScreenShare,
        screenVideoRef,
        connectionQuality,
        REACTIONS,
    };
}

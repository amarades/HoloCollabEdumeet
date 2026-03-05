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

export const REACTIONS = ['👍', '👏', '❤️', '😂', '😮', '🎉'];

export function useSessionControls(socket: SocketManager | null, userName: string) {
    const [handRaised, setHandRaised] = useState(false);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
    const screenStreamRef = useRef<MediaStream | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);

    // Listen for incoming reactions and hand-raise events
    useEffect(() => {
        if (!socket) return;
        socket.on('REACTION', (data: any) => {
            const reaction: Reaction = {
                id: `${data.userId}_${Date.now()}`,
                userId: data.userId,
                userName: data.userName,
                emoji: data.emoji,
                timestamp: Date.now(),
            };
            setReactions(prev => [...prev, reaction]);
            // Auto-remove after 4s
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reaction.id));
            }, 4000);
        });

        socket.on('HAND_RAISED', (_data: any) => { /* handled via USER_UPDATE */ });

        socket.on('HOST_MUTE', (_data: any) => {
            // Host asked to mute — surface a toast/notification to user
            console.log('[HostControl] Host requested mute');
        });
    }, [socket]);

    // Simulated connection quality ping (real impl would use WebRTC stats API)
    useEffect(() => {
        const interval = setInterval(() => {
            const rtt = Math.random() * 300;
            setConnectionQuality(rtt < 80 ? 'good' : rtt < 200 ? 'fair' : 'poor');
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // ── Actions ─────────────────────────────────────────────────────────

    const toggleHand = useCallback(() => {
        const next = !handRaised;
        setHandRaised(next);
        socket?.emit(next ? 'HAND_RAISE' : 'HAND_LOWER', { userName });
    }, [handRaised, socket, userName]);

    const sendReaction = useCallback((emoji: string) => {
        socket?.emit('SEND_REACTION', { emoji, userName });
        // Show local reaction immediately
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
    }, [socket, userName]);

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        socket?.emit('SCREEN_SHARE_STOP', { userName });
    }, [socket, userName]);

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
        screenStream: screenStreamRef.current,
        screenVideoRef,
        connectionQuality,
        REACTIONS,
    };
}

import { useEffect, useRef, useState } from 'react';
import { VideoManager } from '../services/VideoManager';
import { WebRTCManager } from '../realtime/WebRTCManager';
import { SocketManager } from '../realtime/SocketManager';

interface UseMediaSessionProps {
    sessionId: string | undefined;
    socketInstance: SocketManager | null;
    user: any;
}

export const useMediaSession = ({ sessionId, socketInstance, user }: UseMediaSessionProps) => {
    const videoManagerRef = useRef<VideoManager | null>(null);
    const webRTCManagerRef = useRef<WebRTCManager | null>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const initializeMedia = async (videoElement: HTMLVideoElement) => {
        if (!user || !sessionId) return;

        try {
            const videoManager = new VideoManager();
            videoManagerRef.current = videoManager;

            const stream = await videoManager.start(videoElement);
            setLocalStream(stream);

            if (webRTCManagerRef.current) {
                webRTCManagerRef.current.setLocalStream(stream);
            }
        } catch (err) {
            console.error('Failed to initialize local media:', err);
        }
    };

    useEffect(() => {
        if (!socketInstance || !sessionId || webRTCManagerRef.current) return;

        const webRTCManager = new WebRTCManager(socketInstance, {
            onRemoteStream: (userId: string, stream: MediaStream) => {
                setRemoteStreams(prev => ({ ...prev, [userId]: stream }));
            },
            onRemoteStreamRemoved: (userId: string) => {
                setRemoteStreams(prev => {
                    const newStreams = { ...prev };
                    delete newStreams[userId];
                    return newStreams;
                });
            },
            onError: (error: Error) => {
                console.error('WebRTC error:', error);
            }
        });

        webRTCManagerRef.current = webRTCManager;
        webRTCManager.initialize(sessionId).then(() => {
            if (localStream) webRTCManager.setLocalStream(localStream);
        });

        return () => {
            webRTCManager.destroy();
            webRTCManagerRef.current = null;
        };
    }, [socketInstance, sessionId, localStream]);

    const toggleCamera = () => {
        const newState = !cameraOn;
        setCameraOn(newState);
        videoManagerRef.current?.toggleVideo(newState);
    };

    const toggleMic = () => {
        const newState = !micOn;
        setMicOn(newState);
        videoManagerRef.current?.toggleAudio(newState);
    };

    const setCameraEnabled = (enabled: boolean) => {
        setCameraOn(enabled);
        videoManagerRef.current?.toggleVideo(enabled);
    };

    const setMicEnabled = (enabled: boolean) => {
        setMicOn(enabled);
        videoManagerRef.current?.toggleAudio(enabled);
    };

    const cleanupMedia = () => {
        videoManagerRef.current?.stop();
        webRTCManagerRef.current?.destroy();
        webRTCManagerRef.current = null;
        videoManagerRef.current = null;
    };

    useEffect(() => {
        return () => cleanupMedia();
    }, []);

    return {
        localStream,
        remoteStreams,
        micOn,
        cameraOn,
        setMicEnabled,
        setCameraEnabled,
        toggleMic,
        toggleCamera,
        initializeMedia,
        cleanupMedia,
        setLocalStream
    };
};

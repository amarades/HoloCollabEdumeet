import { SocketManager } from './SocketManager';

export interface WebRTCManagerCallbacks {
    onRemoteStream?: (userId: string, stream: MediaStream) => void;
    onRemoteStreamRemoved?: (userId: string) => void;
    onError?: (error: Error) => void;
}

// Free Tier WebRTC Manager
// Simplified mesh topology for free hosting platforms
export class FreeTierWebRTCManager {
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private localStream: MediaStream | null = null;
    private socket: SocketManager;
    private callbacks: WebRTCManagerCallbacks = {};
    private roomName: string = '';
    private userId: string = '';

    // Free tier limits
    private readonly MAX_PARTICIPANTS = 4;
    private readonly ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ];

    // Free tier video constraints (lower quality)
    private readonly VIDEO_CONSTRAINTS = {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
    };

    constructor(socket: SocketManager, callbacks: WebRTCManagerCallbacks = {}) {
        this.socket = socket;
        this.callbacks = callbacks;
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        // Listen for WebRTC signaling messages
        this.socket.on('webrtc-offer', (data: any) => this.handleOffer(data));
        this.socket.on('webrtc-answer', (data: any) => this.handleAnswer(data));
        this.socket.on('webrtc-ice-candidate', (data: any) => this.handleIceCandidate(data));
        this.socket.on('user-joined', (data: any) => this.handleUserJoined(data));
        this.socket.on('user-left', (data: any) => this.handleUserLeft(data));
    }

    async initialize(roomName: string, userId: string) {
        this.roomName = roomName;
        this.userId = userId;

        try {
            // Get user media with free tier constraints
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: this.VIDEO_CONSTRAINTS,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000 // Lower sample rate for free tier
                }
            });

            console.log('[FreeTierWebRTC] Initialized with constraints:', this.VIDEO_CONSTRAINTS);
        } catch (error) {
            console.error('[FreeTierWebRTC] Failed to get media:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    async joinRoom() {
        if (!this.localStream) {
            throw new Error('Local stream not initialized');
        }

        // Notify others that we joined
        this.socket.emit('join-room', {
            roomName: this.roomName,
            userId: this.userId
        });

        console.log('[FreeTierWebRTC] Joined room:', this.roomName);
    }

    private async createPeerConnection(targetUserId: string): Promise<RTCPeerConnection> {
        const peerConnection = new RTCPeerConnection({
            iceServers: this.ICE_SERVERS
        });

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream!);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            this.callbacks.onRemoteStream?.(targetUserId, remoteStream);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('webrtc-ice-candidate', {
                    targetUserId,
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`[FreeTierWebRTC] Connection state with ${targetUserId}:`, peerConnection.connectionState);
        };

        // Handle ICE connection state
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`[FreeTierWebRTC] ICE state with ${targetUserId}:`, peerConnection.iceConnectionState);
        };

        this.peerConnections.set(targetUserId, peerConnection);
        return peerConnection;
    }

    private async handleUserJoined(data: { userId: string; roomName: string }) {
        if (data.userId === this.userId || data.roomName !== this.roomName) return;

        // Check participant limit
        if (this.peerConnections.size >= this.MAX_PARTICIPANTS - 1) {
            console.warn('[FreeTierWebRTC] Max participants reached for free tier');
            return;
        }

        console.log('[FreeTierWebRTC] User joined:', data.userId);

        try {
            // Create peer connection and send offer
            const peerConnection = await this.createPeerConnection(data.userId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            this.socket.emit('webrtc-offer', {
                targetUserId: data.userId,
                offer: offer
            });
        } catch (error) {
            console.error('[FreeTierWebRTC] Failed to handle user joined:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleUserLeft(data: { userId: string }) {
        const peerConnection = this.peerConnections.get(data.userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(data.userId);
            this.callbacks.onRemoteStreamRemoved?.(data.userId);
        }
        console.log('[FreeTierWebRTC] User left:', data.userId);
    }

    private async handleOffer(data: { fromUserId: string; offer: RTCSessionDescriptionInit }) {
        try {
            let peerConnection = this.peerConnections.get(data.fromUserId);

            if (!peerConnection) {
                // Check participant limit
                if (this.peerConnections.size >= this.MAX_PARTICIPANTS - 1) {
                    console.warn('[FreeTierWebRTC] Max participants reached for free tier');
                    return;
                }

                peerConnection = await this.createPeerConnection(data.fromUserId);
            }

            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.socket.emit('webrtc-answer', {
                targetUserId: data.fromUserId,
                answer: answer
            });
        } catch (error) {
            console.error('[FreeTierWebRTC] Failed to handle offer:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleAnswer(data: { fromUserId: string; answer: RTCSessionDescriptionInit }) {
        try {
            const peerConnection = this.peerConnections.get(data.fromUserId);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        } catch (error) {
            console.error('[FreeTierWebRTC] Failed to handle answer:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleIceCandidate(data: { fromUserId: string; candidate: RTCIceCandidateInit }) {
        try {
            const peerConnection = this.peerConnections.get(data.fromUserId);
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (error) {
            console.error('[FreeTierWebRTC] Failed to handle ICE candidate:', error);
        }
    }

    // Toggle audio/video (free tier features)
    toggleAudio(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    toggleVideo(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    // Cleanup
    destroy() {
        // Close all peer connections
        this.peerConnections.forEach((pc, userId) => {
            pc.close();
            this.callbacks.onRemoteStreamRemoved?.(userId);
        });
        this.peerConnections.clear();

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        console.log('[FreeTierWebRTC] Destroyed');
    }

    // Get connection stats for debugging
    async getStats(userId?: string) {
        if (userId) {
            const pc = this.peerConnections.get(userId);
            return pc ? await pc.getStats() : null;
        }

        const allStats: any = {};
        for (const [userId, pc] of this.peerConnections) {
            allStats[userId] = await pc.getStats();
        }
        return allStats;
    }

    // Get participant count
    getParticipantCount(): number {
        return this.peerConnections.size + 1; // +1 for self
    }

    // Check if at participant limit
    isAtLimit(): boolean {
        return this.getParticipantCount() >= this.MAX_PARTICIPANTS;
    }
}
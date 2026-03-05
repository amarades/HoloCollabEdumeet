import { SocketManager } from './SocketManager';

export interface WebRTCManagerCallbacks {
    onRemoteStream?: (userId: string, stream: MediaStream) => void;
    onRemoteStreamRemoved?: (userId: string) => void;
    onError?: (error: Error) => void;
}

export class WebRTCManager {
    private socket: SocketManager;
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private callbacks: WebRTCManagerCallbacks = {};
    private iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ];

    constructor(socket: SocketManager, callbacks: WebRTCManagerCallbacks = {}) {
        this.socket = socket;
        this.callbacks = callbacks;
        this.setupSocketListeners();
    }

    setLocalStream(stream: MediaStream) {
        this.localStream = stream;
        // Add local stream to all existing peer connections
        this.peerConnections.forEach((pc) => {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        });
    }

    private setupSocketListeners() {
        // Listen for WebRTC signaling messages
        this.socket.on('WEBRTC_OFFER', async (data: any) => {
            await this.handleOffer(data.userId, data.offer);
        });

        this.socket.on('WEBRTC_ANSWER', async (data: any) => {
            await this.handleAnswer(data.userId, data.answer);
        });

        this.socket.on('WEBRTC_ICE_CANDIDATE', async (data: any) => {
            await this.handleIceCandidate(data.userId, data.candidate);
        });

        this.socket.on('USER_JOINED', (data: any) => {
            if (data.userId && data.userId !== this.socket.getUserId()) {
                this.createPeerConnection(data.userId);
                this.createOffer(data.userId);
            }
        });

        this.socket.on('USER_LEFT', (data: any) => {
            if (data.userId) {
                this.removePeerConnection(data.userId);
            }
        });
    }

    private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
        const pc = new RTCPeerConnection({ iceServers: this.iceServers });
        
        // Add local stream if available
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('WEBRTC_ICE_CANDIDATE', {
                    userId: userId,
                    candidate: event.candidate
                });
            }
        };

        // Handle remote streams
        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.callbacks.onRemoteStream?.(userId, event.streams[0]);
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`WebRTC connection state for ${userId}:`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.callbacks.onError?.(new Error(`WebRTC connection failed for user ${userId}`));
            }
        };

        this.peerConnections.set(userId, pc);
        return pc;
    }

    private async createOffer(userId: string) {
        const pc = this.peerConnections.get(userId);
        if (!pc) return;

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.socket.emit('WEBRTC_OFFER', {
                userId: userId,
                offer: offer
            });
        } catch (error) {
            console.error('Error creating offer:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
        const pc = await this.createPeerConnection(userId);
        
        try {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            this.socket.emit('WEBRTC_ANSWER', {
                userId: userId,
                answer: answer
            });
        } catch (error) {
            console.error('Error handling offer:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
        const pc = this.peerConnections.get(userId);
        if (!pc) return;

        try {
            await pc.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
        const pc = this.peerConnections.get(userId);
        if (!pc) return;

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    private removePeerConnection(userId: string) {
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
            this.callbacks.onRemoteStreamRemoved?.(userId);
        }
    }

    // Clean up all connections
    destroy() {
        this.peerConnections.forEach((pc, userId) => {
            pc.close();
            this.callbacks.onRemoteStreamRemoved?.(userId);
        });
        this.peerConnections.clear();
    }
}

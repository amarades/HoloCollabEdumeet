import { SocketManager } from './SocketManager';

export interface WebRTCManagerCallbacks {
    onRemoteStream?: (userId: string, stream: MediaStream) => void;
    onRemoteStreamRemoved?: (userId: string) => void;
    onError?: (error: Error) => void;
}

type IceServerInput = {
    urls: string | string[];
    username?: string;
    credential?: string;
};

function parseIceServersFromEnv(): RTCIceServer[] {
    const json = import.meta.env.VITE_ICE_SERVERS;
    if (!json) return [];
    try {
        const parsed = JSON.parse(json) as IceServerInput[];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((s) => !!s?.urls)
            .map((s) => ({
                urls: s.urls,
                username: s.username,
                credential: s.credential,
            }));
    } catch (err) {
        console.error('[WebRTC] Invalid VITE_ICE_SERVERS JSON:', err);
        return [];
    }
}

function buildIceServers(): RTCIceServer[] {
    const fromJson = parseIceServersFromEnv();
    if (fromJson.length > 0) return fromJson;

    const servers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (import.meta.env.VITE_TURN_URL) {
        servers.push({
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
        });
    }

    return servers;
}

// SFU Manager using LiveKit
class SFUManager {
    private room: any = null;
    private localParticipant: any = null;
    private callbacks: WebRTCManagerCallbacks = {};
    private socket: SocketManager;

    constructor(socket: SocketManager, callbacks: WebRTCManagerCallbacks = {}) {
        this.socket = socket;
        this.callbacks = callbacks;
    }

    async initialize(roomName: string) {
        try {
            // Dynamic import of LiveKit client
            const { Room, RoomEvent } = await import('livekit-client');

            this.room = new Room({
                adaptiveStream: true,
                dynacast: true,
                publishDefaults: {
                    simulcast: true,
                },
            });

            // Set up event listeners
            this.room.on(RoomEvent.ParticipantConnected, (participant: any) => {
                console.log('[SFU] Participant connected:', participant.identity);
            });

            this.room.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
                console.log('[SFU] Participant disconnected:', participant.identity);
                this.callbacks.onRemoteStreamRemoved?.(participant.identity);
            });

            this.room.on(RoomEvent.TrackSubscribed, (track: any, _publication: any, participant: any) => {
                if (track.kind === 'video' || track.kind === 'audio') {
                    const stream = new MediaStream([track.mediaStreamTrack]);
                    this.callbacks.onRemoteStream?.(participant.identity, stream);
                }
            });

            this.room.on(RoomEvent.TrackUnsubscribed, (_track: any, _publication: any, participant: any) => {
                this.callbacks.onRemoteStreamRemoved?.(participant.identity);
            });

            this.room.on(RoomEvent.Disconnected, () => {
                console.log('[SFU] Disconnected from room');
            });

            // Connect to LiveKit room
            const token = await this.getLiveKitToken(roomName);
            await this.room.connect(import.meta.env.VITE_LIVEKIT_URL, token);
            this.localParticipant = this.room.localParticipant;

            console.log('[SFU] Connected to room:', roomName);

        } catch (error) {
            console.error('[SFU] Failed to initialize:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async getLiveKitToken(roomName: string): Promise<string> {
        // Request token from backend API
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/livekit/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
                room_name: roomName,
                participant_name: this.socket.getUserId() || 'Anonymous',
                participant_identity: this.socket.getUserId(),
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to get LiveKit token: ${response.statusText}`);
        }

        const data = await response.json();
        return data.token;
    }

    setLocalStream(_stream: MediaStream) {
        if (this.localParticipant && this.room) {
            // Publish tracks to SFU
            _stream.getTracks().forEach(track => {
                this.localParticipant.publishTrack(track);
            });
        }
    }

    async destroy() {
        if (this.room) {
            await this.room.disconnect();
            this.room = null;
            this.localParticipant = null;
        }
    }
}

// Mesh Manager (original peer-to-peer implementation)
class MeshManager {
    private socket: SocketManager;
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
    private callbacks: WebRTCManagerCallbacks = {};
    private unsubs: Array<() => void> = [];

    private iceServers = buildIceServers();
    private iceTransportPolicy: RTCIceTransportPolicy =
        import.meta.env.VITE_WEBRTC_ICE_TRANSPORT_POLICY === 'relay' ? 'relay' : 'all';

    constructor(socket: SocketManager, callbacks: WebRTCManagerCallbacks = {}) {
        this.socket = socket;
        this.callbacks = callbacks;
        this.setupSocketListeners();
    }

    setLocalStream(stream: MediaStream) {
        this.localStream = stream;
        this.peerConnections.forEach((pc) => {
            const senders = pc.getSenders();
            stream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track?.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track).catch(() => undefined);
                } else {
                    pc.addTrack(track, stream);
                }
            });
        });
    }

    private setupSocketListeners() {
        this.unsubs.push(
            this.socket.on('WEBRTC_OFFER', async (data: any) => {
                const parsed = this.parseIncomingSignal(data, 'offer');
                if (parsed) await this.handleOffer(parsed.userId, parsed.value);
            }),
            this.socket.on('WEBRTC_ANSWER', async (data: any) => {
                const parsed = this.parseIncomingSignal(data, 'answer');
                if (parsed) await this.handleAnswer(parsed.userId, parsed.value);
            }),
            this.socket.on('WEBRTC_ICE_CANDIDATE', async (data: any) => {
                const parsed = this.parseIncomingSignal(data, 'candidate');
                if (parsed) await this.handleIceCandidate(parsed.userId, parsed.value);
            }),
            this.socket.on('USER_JOINED', (data: any) => {
                const joined = data.user || data.payload?.user;
                const userId = joined?.id || data.userId;
                if (userId && userId !== this.socket.getUserId()) {
                    this.createPeerConnection(userId);
                    this.createOffer(userId);
                }
            }),
            this.socket.on('USER_LEFT', (data: any) => {
                const userId = data.userId || data.payload?.userId;
                if (userId) {
                    this.removePeerConnection(userId);
                }
            })
        );
    }

    private parseIncomingSignal(
        data: any,
        key: 'offer' | 'answer' | 'candidate'
    ): { userId: string; value: any } | null {
        const payload = data?.payload ?? data;
        const userId = payload?.sender || payload?.userId || data?.sender || data?.userId;
        const value = payload?.[key] ?? payload?.data ?? data?.[key] ?? data?.data;

        if (!userId || !value) return null;
        return { userId, value };
    }

    private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
        const existing = this.peerConnections.get(userId);
        if (existing) return existing;

        const pc = new RTCPeerConnection({
            iceServers: this.iceServers,
            iceTransportPolicy: this.iceTransportPolicy,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceCandidatePoolSize: 4,
        });

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream!);
            });
        }

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;

            this.socket.emit('WEBRTC_ICE_CANDIDATE', {
                userId,
                candidate: event.candidate,
                sender: this.socket.getUserId(),
                target: userId,
            });
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.callbacks.onRemoteStream?.(userId, event.streams[0]);
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] ${userId} connection state:`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.callbacks.onError?.(new Error(`WebRTC connection failed for user ${userId}`));
                if (pc.connectionState === 'failed') {
                    pc.restartIce();
                }
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') {
                pc.restartIce();
            }
        };

        this.peerConnections.set(userId, pc);
        return pc;
    }

    private async createOffer(userId: string) {
        const pc = await this.createPeerConnection(userId);

        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);

            this.socket.emit('WEBRTC_OFFER', {
                userId,
                offer,
                sender: this.socket.getUserId(),
                target: userId,
            });
        } catch (error) {
            console.error('[WebRTC] Failed to create offer:', error);
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
                userId,
                answer,
                sender: this.socket.getUserId(),
                target: userId,
            });

            // Add any pending candidates
            const pending = this.pendingCandidates.get(userId) || [];
            for (const candidate of pending) {
                await pc.addIceCandidate(candidate);
            }
            this.pendingCandidates.delete(userId);
        } catch (error) {
            console.error('[WebRTC] Failed to handle offer:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
        const pc = this.peerConnections.get(userId);
        if (!pc) return;

        try {
            await pc.setRemoteDescription(answer);

            // Add any pending candidates
            const pending = this.pendingCandidates.get(userId) || [];
            for (const candidate of pending) {
                await pc.addIceCandidate(candidate);
            }
            this.pendingCandidates.delete(userId);
        } catch (error) {
            console.error('[WebRTC] Failed to handle answer:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    private async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
        const pc = this.peerConnections.get(userId);
        if (!pc) {
            // Store for later
            const pending = this.pendingCandidates.get(userId) || [];
            pending.push(candidate);
            this.pendingCandidates.set(userId, pending);
            return;
        }

        try {
            await pc.addIceCandidate(candidate);
        } catch (error) {
            console.error('[WebRTC] Failed to add ICE candidate:', error);
        }
    }

    private removePeerConnection(userId: string) {
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
            this.callbacks.onRemoteStreamRemoved?.(userId);
        }
        this.pendingCandidates.delete(userId);
    }

    destroy() {
        this.peerConnections.forEach((pc, userId) => {
            pc.close();
            this.callbacks.onRemoteStreamRemoved?.(userId);
        });
        this.peerConnections.clear();
        this.pendingCandidates.clear();
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];
    }
}

export class WebRTCManager {
    private socket: SocketManager;
    private callbacks: WebRTCManagerCallbacks = {};
    private manager: SFUManager | MeshManager | null = null;
    private mode: 'sfu' | 'mesh' = 'mesh';

    constructor(socket: SocketManager, callbacks: WebRTCManagerCallbacks = {}) {
        this.socket = socket;
        this.callbacks = callbacks;
        this.mode = (import.meta.env.VITE_WEBRTC_MODE as 'sfu' | 'mesh') || 'mesh';
    }

    async initialize(roomName: string) {
        if (this.mode === 'sfu') {
            this.manager = new SFUManager(this.socket, this.callbacks);
            await (this.manager as SFUManager).initialize(roomName);
        } else {
            this.manager = new MeshManager(this.socket, this.callbacks);
        }
    }

    setLocalStream(stream: MediaStream) {
        if (this.manager) {
            this.manager.setLocalStream(stream);
        }
    }

    destroy() {
        if (this.manager) {
            this.manager.destroy();
            this.manager = null;
        }
    }
}

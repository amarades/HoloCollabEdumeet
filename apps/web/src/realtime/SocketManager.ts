import { AUTH_TOKEN_KEY, createWebSocketTicket, API_BASE_URL } from '../services/api';

// Types for socket events to ensure type safety
export interface User {
    id: string;
    name: string;
    role: string;
    isHost?: boolean; // Add host indicator
}

export interface GestureData {
    gesture: string;
    user: string;
    confidence: number;
}

export interface DrawData {
    type: 'path' | 'clear' | 'undo';
    points?: { x: number, y: number }[];
    color?: string;
    width?: number;
}

export interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
}

export class SocketManager {
    private url: string;
    private socket: WebSocket | null = null;
    private connected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private reconnectDelay: number = 1000; // Start with 1s
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private intentionalDisconnect: boolean = false;
    private pendingMessages: string[] = [];
    private maxPendingMessages: number = 200;

    // Session State
    private roomId: string | null = null;
    private userName: string | null = null;
    private userId: string | null = null;
    private isHost: boolean = false;
    private scene: any = null; // Pending strict typing for Three.js scene

    // Event Callbacks
    private onUserUpdate: ((users: User[]) => void) | null = null;
    public onGesture: ((data: GestureData) => void) | null = null;
    public onDraw: ((data: DrawData) => void) | null = null;
    public onQuizUpdate: ((quiz: any) => void) | null = null;
    public onChat: ((message: ChatMessage) => void) | null = null;

    // Multi-listener custom event system (replaces single-listener map)
    private customListeners: Record<string, Array<(data: any) => void>> = {};
    // Buffer for events that arrived before a listener was registered
    private eventBuffer: Record<string, any[]> = {};
    // Events that should be buffered if no listener is registered yet
    private static BUFFERED_EVENTS = ['PARTICIPANT_JOIN_REQUEST', 'DRAW_STROKE', 'WHITEBOARD_CLEAR'];

    constructor(url?: string) {
        this.url = this.resolveBaseUrl(url);
    }

    private resolveBaseUrl(overrideUrl?: string): string {
        if (overrideUrl) return overrideUrl.replace(/\/$/, '');

        const explicitWs = import.meta.env.VITE_REALTIME_WS_URL?.trim();
        if (explicitWs) {
            const normalized = explicitWs.replace(/\/$/, '');
            if (import.meta.env.DEV) {
                try {
                    const parsed = new URL(normalized);
                    const isFrontendDevPort = parsed.port === window.location.port;
                    if (isFrontendDevPort && parsed.hostname === window.location.hostname) {
                        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                        const directRealtime = `${protocol}//${window.location.hostname}:8002`;
                        console.warn('[SocketManager] VITE_REALTIME_WS_URL points to frontend dev server; using direct realtime service URL:', directRealtime);
                        return directRealtime;
                    }
                } catch {
                    // Fall through to provided value if URL parsing fails.
                }
            }
            return normalized;
        }

        const realtimeHttp = import.meta.env.VITE_REALTIME_URL?.trim();
        if (realtimeHttp) {
            // Convert http(s) -> ws(s) when a HTTP realtime URL is provided.
            const wsUrl = realtimeHttp.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
            return wsUrl.replace(/\/$/, '');
        }

        // Local dev default: connect directly to realtime service.
        if (import.meta.env.DEV) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.hostname}:8002`;
        }

        // Production fallback for setups without explicit env vars.
        // If API_BASE_URL (from api.ts) is set to a specific host (e.g. Render), 
        // we should try to derive the WS host from that instead of window.location.
        if (API_BASE_URL && API_BASE_URL.startsWith('http')) {
            const wsUrl = API_BASE_URL.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
            return wsUrl;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.hostname}:8002`;
    }

    /**
     * Connects to the Realtime Service (WebSocket)
     */
    connect(
        roomId: string,
        scene: any,
        userName: string,
        isHost: boolean,
        onUserUpdate: (users: User[]) => void,
        onGesture?: (data: GestureData) => void
    ) {
        this.intentionalDisconnect = false;
        this.roomId = roomId;
        this.scene = scene;
        this.userName = userName;
        this.isHost = isHost;
        // Temporary client id until server assigns canonical websocket peer id.
        this.userId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        this.onUserUpdate = onUserUpdate;
        if (onGesture) this.onGesture = onGesture;

        void this.initiateConnection();
    }

    private async initiateConnection() {
        if (this.socket) {
            this.socket.close();
        }

        if (!this.roomId || !this.userName) return;

        // Construct WebSocket URL with query params
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const hostToken = this.isHost ? sessionStorage.getItem('host_token') : null;
        const params = new URLSearchParams({
            user: this.userName,
            is_host: String(this.isHost),
        });
        if (token && token !== 'guest') {
            const wsTicket = await createWebSocketTicket(this.roomId);
            if (wsTicket) {
                params.set('ws_ticket', wsTicket);
            } else {
                // Backward-compatible fallback if ticket endpoint is unavailable.
                params.set('token', token);
            }
        }
        if (hostToken) params.set('host_token', hostToken);

        const wsUrl = `${this.url}/ws/room/${this.roomId}?${params.toString()}`;
        const safeLogUrl = `${this.url}/ws/room/${this.roomId}?user=${encodeURIComponent(this.userName)}&is_host=${this.isHost}`;
        console.log(`[SocketManager] Connecting to ${safeLogUrl}...`);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('[SocketManager] Connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000; // Reset delay
            this.flushPendingMessages();
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (err) {
                console.error('[SocketManager] Failed to parse message:', err);
            }
        };

        this.socket.onerror = (error) => {
            // WebSocket errors are often silent in browsers for privacy, but we log what we can
            console.error('[SocketManager] Error:', error);
        };

        this.socket.onclose = (event) => {
            this.connected = false;
            this.socket = null;

            // Don't log or reconnect if user intentionally disconnected
            if (this.intentionalDisconnect) return;

            console.log(`[SocketManager] Disconnected (Code: ${event.code})`);

            // Attempt reconnect with exponential back-off
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            } else {
                console.error('[SocketManager] Max reconnect attempts reached. Is the Realtime Service (port 8002) running?');
            }
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        console.log(`[SocketManager] Reconnecting in ${this.reconnectDelay}ms (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Backoff up to 30s
            void this.initiateConnection();
        }, this.reconnectDelay);
    }

    /**
     * Handles incoming WebSocket messages and dispatches to appropriate callbacks.
     * Built-in handlers always fire first, then any custom listeners for the same event.
     */
    private handleMessage(data: any) {
        // Backend sends either { event: 'FOO', ... } (server-originated) or
        // { type: 'FOO', payload: ... } (echo of client message). Support both.
        const eventName: string = data.event ?? data.type ?? '';
        
        if (eventName === 'PARTICIPANT_JOIN_REQUEST') {
            console.log(`[SocketManager] Handling PARTICIPANT_JOIN_REQUEST:`, data);
        }
        
        const { state, users, action, value, message, payload } = data;

        // 1. Scene & State Updates
        if (eventName === 'MODEL_UPDATE' || eventName === 'STATE_SYNC') {
            if (this.scene && typeof this.scene.applyState === 'function' && state) {
                this.scene.applyState(state);
            }
            if (state?.active_quiz !== undefined && this.onQuizUpdate) {
                this.onQuizUpdate(state.active_quiz);
            }
            if (action === 'DRAW' && this.onDraw) {
                this.onDraw(value);
            }
        }
        // 2. User List Updates
        else if (eventName === 'USER_UPDATE') {
            if (this.onUserUpdate && users) {
                this.onUserUpdate(users as User[]);
            }
        }
        else if (eventName === 'SELF_ID') {
            if (data.userId) {
                this.userId = data.userId as string;
            }
        }
        // 3. Gestures
        else if (eventName === 'GESTURE_DETECTED') {
            if (this.onGesture) {
                this.onGesture(data as GestureData);
            }
        }
        // 4. Whiteboard Drawing — fires both the onDraw callback AND custom listeners
        else if (eventName === 'DRAW_STROKE') {
            if (this.onDraw) {
                this.onDraw(payload || data);
            }
        }
        // 5. Chat — fires onChat callback (used by Session.tsx for AI context)
        else if (eventName === 'CHAT_MESSAGE') {
            if (this.onChat) {
                this.onChat(message || data);
            }
        }

        // Always also fire any custom listeners registered via socket.on()
        this._fireListeners(eventName, data);
    }

    private _fireListeners(event: string, data: any) {
        if (!event) return;
        const listeners = this.customListeners[event];
        if (listeners && listeners.length > 0) {
            listeners.forEach(cb => {
                try { cb(data); } catch (e) { console.error(`[SocketManager] Error in listener for '${event}':`, e); }
            });
        } else if (SocketManager.BUFFERED_EVENTS.includes(event)) {
            // Buffer critical events that arrived before a listener was registered
            if (!this.eventBuffer[event]) this.eventBuffer[event] = [];
            if (this.eventBuffer[event].length < 20) {
                console.log(`[SocketManager] Buffering event '${event}' (no listener yet)`);
                this.eventBuffer[event].push(data);
            }
        }
    }

    /**
     * Adds an event listener. Supports multiple listeners per event type.
     * Returns an unsubscribe function — call it in your useEffect cleanup.
     * Replays any buffered events that arrived before this listener was registered.
     */
    on(eventType: string, callback: (data: any) => void): () => void {
        if (!this.customListeners[eventType]) {
            this.customListeners[eventType] = [];
        }
        this.customListeners[eventType].push(callback);

        // Replay any buffered events for this listener
        if (this.eventBuffer[eventType]?.length) {
            console.log(`[SocketManager] Replaying ${this.eventBuffer[eventType].length} buffered '${eventType}' event(s)`);
            const buffered = [...this.eventBuffer[eventType]];
            this.eventBuffer[eventType] = [];
            buffered.forEach(d => {
                try { callback(d); } catch (e) { console.error(e); }
            });
        }

        // Return an unsubscribe function
        return () => this.off(eventType, callback);
    }

    /**
     * Removes a specific listener for an event.
     */
    off(eventType: string, callback: (data: any) => void) {
        const listeners = this.customListeners[eventType];
        if (listeners) {
            this.customListeners[eventType] = listeners.filter(cb => cb !== callback);
        }
    }

    /**
     * Sends a message to backend.
     */
    emit(eventType: string, payload: any) {
        const message = JSON.stringify({
            type: eventType,
            payload: payload
        });

        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (this.pendingMessages.length >= this.maxPendingMessages) {
                this.pendingMessages.shift();
            }
            this.pendingMessages.push(message);
            console.warn('[SocketManager] Socket not connected. Queued outbound event:', eventType);
            return;
        }

        try {
            this.socket.send(message);
        } catch (err) {
            console.error('[SocketManager] Failed to emit message:', err);
            if (this.pendingMessages.length >= this.maxPendingMessages) {
                this.pendingMessages.shift();
            }
            this.pendingMessages.push(message);
        }
    }

    private flushPendingMessages() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.pendingMessages.length) return;
        const queued = [...this.pendingMessages];
        this.pendingMessages = [];
        queued.forEach((msg) => {
            try {
                this.socket?.send(msg);
            } catch {
                this.pendingMessages.push(msg);
            }
        });
    }

    /**
     * Gracefully disconnects the socket.
     */
    disconnect() {
        // Set flag so onclose handler knows not to reconnect
        this.intentionalDisconnect = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        console.log('[SocketManager] Disconnected by user');
    }

    getUserId() {
        return this.userId;
    }

    isConnected() {
        return this.connected;
    }
}

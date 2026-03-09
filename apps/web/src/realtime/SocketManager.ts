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

    // Custom event listeners keyed by `event` from server payload
    private customListeners: Record<string, (data: any) => void> = {};

    constructor(url?: string) {
        // Default: use Vite's proxy path so we work in both dev and prod
        if (url) {
            this.url = url;
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.url = `${protocol}//${window.location.host}`;
        }
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
        this.roomId = roomId;
        this.scene = scene;
        this.userName = userName;
        this.isHost = isHost;
        this.userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Generate unique ID
        this.onUserUpdate = onUserUpdate;
        if (onGesture) this.onGesture = onGesture;

        this.initiateConnection();
    }

    private initiateConnection() {
        if (this.socket) {
            this.socket.close();
        }

        if (!this.roomId || !this.userName) return;

        // Construct WebSocket URL with query params
        const wsUrl = `${this.url}/ws/room/${this.roomId}?user=${encodeURIComponent(this.userName)}&is_host=${this.isHost}`;
        console.log(`[SocketManager] Connecting to ${wsUrl}...`);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('[SocketManager] Connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000; // Reset delay
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
            this.initiateConnection();
        }, this.reconnectDelay);
    }

    /**
     * Handles incoming WebSocket messages and dispatches to appropriate callbacks.
     * Built-in handlers always fire first, then any custom listeners for the same event.
     */
    private handleMessage(data: any) {
        const { event, state, users, action, value, message, payload } = data;

        // 1. Scene & State Updates
        if (event === 'MODEL_UPDATE' || event === 'STATE_SYNC') {
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
        else if (event === 'USER_UPDATE') {
            if (this.onUserUpdate && users) {
                this.onUserUpdate(users as User[]);
            }
        }
        // 3. Gestures
        else if (event === 'GESTURE_DETECTED') {
            if (this.onGesture) {
                this.onGesture(data as GestureData);
            }
        }
        // 4. Whiteboard Drawing
        else if (event === 'DRAW_STROKE') {
            if (this.onDraw) {
                this.onDraw(payload || data);
            }
        }
        // 5. Chat — fires onChat callback (used by Session.tsx for AI context)
        else if (event === 'CHAT_MESSAGE') {
            if (this.onChat) {
                this.onChat(message || data);
            }
        }

        // Always also fire any custom listeners registered via socket.on()
        // This allows components like ChatPanel to listen to CHAT_MESSAGE
        // independently without overwriting Session.tsx's onChat handler.
        if (event && this.customListeners[event]) {
            this.customListeners[event](data);
        }
    }

    /**
     * Adds an event listener for custom events
     */
    on(eventType: string, callback: (data: any) => void) {
        this.customListeners[eventType] = callback;
    }

    /**
     * Sends a message to backend.
     */
    emit(eventType: string, payload: any) {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('[SocketManager] Cannot emit, socket not connected.');
            return;
        }

        try {
            this.socket.send(JSON.stringify({
                type: eventType,
                payload: payload
            }));
        } catch (err) {
            console.error('[SocketManager] Failed to emit message:', err);
        }
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

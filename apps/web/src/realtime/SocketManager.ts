// Types for socket events to ensure type safety
export interface User {
    id: string;
    name: string;
    role: string;
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
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000; // Start with 1s
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private messageQueue: Array<{ eventType: string; payload: any }> = [];
    private intentionalDisconnect: boolean = false;
    private customListeners: { [event: string]: (data: any) => void } = {};

    // Session State
    private roomId: string | null = null;
    private userName: string | null = null;
    private scene: any = null; // Pending strict typing for Three.js scene

    // Event Callbacks
    private onUserUpdate: ((users: User[]) => void) | null = null;
    public onGesture: ((data: GestureData) => void) | null = null;
    public onDraw: ((data: DrawData) => void) | null = null;
    public onQuizUpdate: ((quiz: any) => void) | null = null;
    public onChat: ((message: ChatMessage) => void) | null = null;

    constructor(url: string = (import.meta.env.VITE_WS_URL || 'ws://localhost:8002')) {
        this.url = url;
    }

    /**
     * Connects to the Realtime Service (WebSocket)
     */
    connect(
        roomId: string,
        scene: any,
        userName: string,
        onUserUpdate: (users: User[]) => void,
        onGesture?: (data: GestureData) => void
    ) {
        this.roomId = roomId;
        this.scene = scene;
        this.userName = userName;
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
        const wsUrl = `${this.url}/ws/room/${this.roomId}?user=${encodeURIComponent(this.userName)}`;
        console.log(`[SocketManager] Connecting to ${wsUrl}...`);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('[SocketManager] ✅ Connected to WebSocket');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000; // Reset delay

            // Send any queued messages
            this.flushMessageQueue();
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SocketManager] Received message:', data);
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
            console.log(`[SocketManager] Disconnected (Code: ${event.code})`);
            this.connected = false;
            this.socket = null;

            // Only reconnect if not intentionally disconnected
            if (!this.intentionalDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            } else if (this.intentionalDisconnect) {
                console.log('[SocketManager] Intentional disconnect, skipping reconnect.');
            } else {
                console.error('[SocketManager] Max reconnect attempts reached.');
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
     */
    public on(event: string, callback: (data: any) => void) {
        this.customListeners[event] = callback;
    }

    private handleMessage(data: any) {
        const { event, state, users, action, value, message, payload } = data;
        console.log('[SocketManager] handleMessage event=', event, 'state=', state);

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
        // 5. Chat
        else if (event === 'CHAT_MESSAGE') {
            if (this.onChat) {
                this.onChat(message || data);
            }
        }

        // 6. Fire any custom listeners registered via on()
        if (event && this.customListeners[event]) {
            this.customListeners[event](data);
        }
    }

    /**
     * Sends a message to the backend.
     */
    emit(eventType: string, payload: any) {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            // Queue the message for later sending
            this.messageQueue.push({ eventType, payload });
            console.log(`[SocketManager] ⏸️ Message queued (${eventType}), not connected yet.`);
            return;
        }

        try {
            const message = {
                type: eventType,
                payload: payload
            };
            this.socket.send(JSON.stringify(message));
            console.log(`[SocketManager] 📤 Sent: ${eventType}`);
        } catch (err) {
            console.error('[SocketManager] Failed to emit message:', err);
        }
    }

    /**
     * Flushes queued messages once connection is established.
     */
    private flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            if (message) {
                try {
                    this.socket.send(JSON.stringify({
                        type: message.eventType,
                        payload: message.payload
                    }));
                    console.log('[SocketManager] Sent queued message:', message.eventType);
                } catch (err) {
                    console.error('[SocketManager] Failed to send queued message:', err);
                }
            }
        }
    }

    /**
     * Gracefully disconnects the socket.
     */
    disconnect() {
        this.intentionalDisconnect = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        console.log('[SocketManager] Disconnected by user');
    }

    isConnected() {
        return this.connected;
    }
}

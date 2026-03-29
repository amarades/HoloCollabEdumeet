// Use environment variable if provided, otherwise default to empty string (Vite proxy)
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, "");

// Shared token key — import this constant in AuthContext too to keep them in sync
export const AUTH_TOKEN_KEY = 'access_token';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const requestId = crypto.randomUUID();

    // Use Headers object for proper casing and merging
    const headers = new Headers(options.headers || {});

    if (token && token !== 'guest') {
        headers.set('Authorization', `Bearer ${token}`);
    } else if (endpoint !== '/api/auth/login' && endpoint !== '/api/auth/register') {
        console.warn(`⚠️ API calling protected endpoint [${endpoint}] without a valid token.`);
    }
    headers.set('x-request-id', requestId);

    // 2. Body Formatting
    if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    try {
        const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            console.error(`🔒 Authentication Failure (401) on ${normalizedEndpoint}. Token state: ${token ? 'Present' : 'Missing'}`);
            if (!token || token === 'guest') {
                throw new Error("You are not logged in. Please log in to complete this action.");
            }
        }

        const text = await response.text();
        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            console.error("Non-JSON response received:", text.substring(0, 150));
            throw new Error(`Invalid JSON response from server (Status: ${response.status}).`);
        }

        if (!response.ok) {
            const errorMsg = data.detail || data.message || `HTTP Request failed with status ${response.status}`;
            throw new Error(errorMsg);
        }

        return data;

    } catch (error: unknown) {
        console.error(`API Request Error [${options.method || 'GET'} ${normalizedEndpoint}]:`, error);

        if (error instanceof Error && error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error("Network error: Could not connect to the backend server. Is it running?");
        }

        throw error;
    }
}

export async function createWebSocketTicket(roomCode: string): Promise<string | null> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || token === 'guest') return null;

    const requestId = crypto.randomUUID();
    const headers = new Headers({
        Authorization: `Bearer ${token}`,
        'x-request-id': requestId,
    });

    const response = await fetch(`${API_BASE_URL}/api/auth/ws-ticket?room_code=${encodeURIComponent(roomCode)}`, {
        method: 'POST',
        headers,
    });

    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.ws_ticket === 'string' ? data.ws_ticket : null;
}

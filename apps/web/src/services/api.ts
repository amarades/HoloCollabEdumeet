// Use environment variable if provided, otherwise default to empty string (Vite proxy)
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, "");

// Shared token key — import this constant in AuthContext too to keep them in sync
export const AUTH_TOKEN_KEY = 'access_token';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    // Use Headers object for proper casing and merging
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // 2. Body Formatting
    // If the body is NOT FormData and NOT URLSearchParams, default to JSON
    // (URLSearchParams automatically sets application/x-www-form-urlencoded)
    // (FormData automatically sets multipart/form-data with boundaries)
    if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Ensure endpoint starts with a slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    try {
        // 3. Network Request
        const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
            ...options,
            headers,
        });

        // 4. Response Parsing
        // Handle 204 No Content or empty responses safely without crashing `response.json()`
        const text = await response.text();
        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch (_) {
            // This happens if the backend crashes and returns an HTML error page (e.g., 502 Bad Gateway)
            console.error("Non-JSON response received:", text.substring(0, 150));
            throw new Error(`Invalid JSON response from server (Status: ${response.status}). Expected JSON but got HTML/Text.`);
        }

        // 5. Error Handling
        if (!response.ok) {
            // FastAPI throws exceptions in `detail`
            const errorMsg = data.detail || data.message || `HTTP Request failed with status ${response.status}`;
            throw new Error(errorMsg);
        }

        return data;

    } catch (error: unknown) {
        // 6. Network/CORS level failures (e.g. backend is completely down)
        console.error(`API Request Error [${options.method || 'GET'} ${normalizedEndpoint}]:`, error);

        if (error instanceof Error && error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error("Network error: Could not connect to the backend server. Is it running?");
        }

        throw error;
    }
}

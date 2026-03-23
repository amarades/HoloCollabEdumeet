import { useState } from 'react';

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const useAIHelper = () => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = async (message: string) => {
        if (!message.trim()) return;

        setIsLoading(true);
        setError(null);
        
        // Optimistically add user message
        const userMsg: ChatMessage = { role: 'user', text: message };
        setHistory(prev => [...prev, userMsg]);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    history: history,
                    message: message
                })
            });

            if (!response.ok) {
                let errorDetail = 'Failed to fetch AI response';
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errData = await response.json();
                        errorDetail = errData.detail?.message || errData.detail || errorDetail;
                    } else {
                        const text = await response.text();
                        errorDetail = text || `Error ${response.status}: ${response.statusText}`;
                    }
                } catch (e) {
                    errorDetail = `Error ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorDetail);
            }

            const data = await response.json();
            const aiMsg: ChatMessage = { role: 'model', text: data.response };
            
            setHistory(prev => [...prev, aiMsg]);
        } catch (err: any) {
            console.error('AI Chat Error:', err);
            setError(err.message || 'Something went wrong.');
            // Remove the user message if it failed or keep it? 
            // Better to keep it and show error.
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => setHistory([]);

    return {
        history,
        isLoading,
        error,
        sendMessage,
        clearChat
    };
};

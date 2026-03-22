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
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    history: history,
                    message: message
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to fetch AI response');
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

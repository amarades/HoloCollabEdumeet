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
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Please log in to use the AI Assistant.');

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            let userFriendlyError = err.message || 'Something went wrong.';
            if (userFriendlyError.includes('429') && userFriendlyError.includes('RESOURCE_EXHAUSTED')) {
                userFriendlyError = 'You have reached the free AI quota limit. Please wait about 1 minute and try your request again!';
            }
            setError(userFriendlyError);
            // Remove the user message if it failed or keep it? 
            // Better to keep it and show error.
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => setHistory([]);

    const generateSummary = async (transcript: string) => {
        if (!transcript.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Please log in to use this feature.');

            const response = await fetch('/api/ai/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ transcript })
            });
            if (!response.ok) throw new Error('Failed to generate summary');
            const data = await response.json();
            const aiMsg: ChatMessage = { role: 'model', text: `📋 **Meeting Summary**\n\n${data.response}` };
            setHistory(prev => [...prev, aiMsg]);
        } catch (err: any) {
            let userFriendlyError = err.message || 'Failed to generate summary';
            if (userFriendlyError.includes('429') && userFriendlyError.includes('RESOURCE_EXHAUSTED')) {
                userFriendlyError = 'You have reached the free AI quota limit. Please wait about 1 minute before summarizing!';
            }
            setError(userFriendlyError);
        } finally {
            setIsLoading(false);
        }
    };

    const generateNotes = async (transcript: string) => {
        if (!transcript.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Please log in to use this feature.');

            const response = await fetch('/api/ai/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ transcript })
            });
            if (!response.ok) throw new Error('Failed to generate notes');
            const data = await response.json();
            const aiMsg: ChatMessage = { role: 'model', text: `📝 **Meeting Notes**\n\n${data.response}` };
            setHistory(prev => [...prev, aiMsg]);
        } catch (err: any) {
            let userFriendlyError = err.message || 'Failed to generate notes';
            if (userFriendlyError.includes('429') && userFriendlyError.includes('RESOURCE_EXHAUSTED')) {
                userFriendlyError = 'You have reached the free AI quota limit. Please wait about 1 minute before generating notes!';
            }
            setError(userFriendlyError);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        history,
        isLoading,
        error,
        sendMessage,
        generateSummary,
        generateNotes,
        clearChat
    };
};

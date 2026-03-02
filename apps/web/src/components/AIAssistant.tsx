import { useState, useRef, useEffect } from 'react';
import { Send, Bot, RefreshCw, X } from 'lucide-react';
import { apiRequest } from '../services/api';

interface Msg {
    id: number;
    text: string;
    sender: 'user' | 'assistant';
}

export const AIAssistant = ({ onClose, modelName = 'General' }: { onClose?: () => void, modelName?: string }) => {
    const [messages, setMessages] = useState<Msg[]>([
        { id: 1, text: "Hello! I'm your AI learning assistant. Ask me anything!", sender: 'assistant' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Msg = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Call Backend API
            const data = await apiRequest('/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: userMsg.text,
                    context: { modelName }
                })
            });
            // ...

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: data.response || "I didn't quite catch that.",
                sender: 'assistant'
            }]);

        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Sorry, I'm having trouble connecting to my brain right now.",
                sender: 'assistant'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-white">AI Assistant</h3>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user'
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-white/10 text-gray-200 rounded-bl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none">
                            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-primary rounded-xl text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

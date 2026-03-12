import React, { useState, useEffect, useRef } from 'react';
import { Smile, Send } from 'lucide-react';
import { SocketManager } from '../../../realtime/SocketManager';
import type { ChatMessage } from '../../../realtime/SocketManager';
import { ChatStorage } from '../../../services/ChatStorage';

interface ChatPanelProps {
    socket: SocketManager | null;
    user: any;
    roomId: string;
}

interface Message extends ChatMessage {
    isOwn: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ socket, user, roomId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load messages from storage on component mount
    useEffect(() => {
        if (!roomId) return;
        
        const storedMessages = ChatStorage.getMessages(roomId);
        const formattedMessages: Message[] = storedMessages.map(msg => ({
            ...msg,
            isOwn: msg.sender === user?.name
        }));
        setMessages(formattedMessages);
    }, [roomId, user?.name]);

    useEffect(() => {
        if (!socket) return;

        // Use the custom listener system (socket.on) so we don't overwrite
        // the Session.tsx onChat handler that captures messages for AI context.
        const handleChat = (data: any) => {
            // Backend sends: { event: 'CHAT_MESSAGE', message: { text, sender, timestamp } }
            const msg = data.message || data;
            const newMessage: Message = {
                id: msg.id || Date.now().toString(),
                text: msg.text,
                sender: msg.sender,
                timestamp: msg.timestamp || Date.now(),
                isOwn: msg.sender === user?.name
            };
            
            // Save to storage
            ChatStorage.saveMessage(roomId, {
                id: newMessage.id,
                text: newMessage.text,
                sender: newMessage.sender,
                timestamp: newMessage.timestamp
            });
            
            setMessages(prev => [...prev, newMessage]);
        };

        // on() now returns an unsubscribe function — use it for proper cleanup
        const unsubscribe = socket.on('CHAT_MESSAGE', handleChat);
        return () => unsubscribe();
    }, [socket, user, roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim() || !socket) return;

        const msgPayload = {
            id: Date.now().toString(),
            text: input,
            sender: user?.name || 'You',
            timestamp: Date.now()
        };

        // Optimistic local update (own message shown immediately)
        setMessages(prev => [...prev, { ...msgPayload, isOwn: true }]);

        // Backend expects type: 'CHAT_SEND'
        socket.emit('CHAT_SEND', { text: input, sender: user?.name || 'You', timestamp: Date.now() });
        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <div className="bg-white flex flex-col h-full w-full relative">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 text-sm mt-10">
                        No messages yet. Start the conversation!
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.isOwn ? 'justify-end' : ''}`}>
                        {!msg.isOwn && (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-700 text-xs font-semibold">
                                {msg.sender.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="flex flex-col max-w-[75%]">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className={`text-xs font-semibold ${msg.isOwn ? 'text-primary ml-auto' : 'text-gray-700'}`}>
                                    {msg.sender}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className={`px-4 py-2.5 text-sm ${msg.isOwn
                                ? 'bg-primary text-white rounded-l-xl rounded-br-none rounded-tr-xl'
                                : 'bg-gray-100 text-gray-900 rounded-r-xl rounded-bl-none rounded-tl-xl border border-gray-200/50'
                                }`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>

                        {msg.isOwn && (
                            <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
                                {msg.sender.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <input
                        type="text"
                        placeholder="Send a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-500"
                    />
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Smile size={20} />
                    </button>
                    <button
                        onClick={sendMessage}
                        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-all shadow-sm ml-1"
                    >
                        <Send size={14} className="ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

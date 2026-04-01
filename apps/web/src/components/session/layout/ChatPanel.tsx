import React, { useState, useEffect, useRef } from 'react';
import { Smile, Send, MessageSquare } from 'lucide-react';
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
    const [messages, setMessages] = useState<Message[]>(() => {
        if (!roomId) return [];
        return ChatStorage.getMessages(roomId).map(msg => ({
            ...msg,
            isOwn: msg.sender === user?.name,
        }));
    });
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleChat = (data: any) => {
            const msg = data.message || data;
            const newMessage: Message = {
                id: msg.id || Date.now().toString(),
                text: msg.text,
                sender: msg.sender,
                timestamp: msg.timestamp || Date.now(),
                isOwn: msg.sender === user?.name
            };
            
            ChatStorage.saveMessage(roomId, {
                id: newMessage.id,
                text: newMessage.text,
                sender: newMessage.sender,
                timestamp: newMessage.timestamp
            });
            
            setMessages(prev => [...prev, newMessage]);
        };

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

        setMessages(prev => [...prev, { ...msgPayload, isOwn: true }]);
        socket.emit('CHAT_SEND', { text: input, sender: user?.name || 'You', timestamp: Date.now() });
        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <div className="bg-transparent flex flex-col h-full w-full relative">
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 select-none">
                        <MessageSquare size={48} className="mb-4 text-white" />
                        <p className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Silence in the Stream</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.isOwn ? 'justify-end' : ''}`}>
                        {!msg.isOwn && (
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center text-white/60 text-[10px] font-black border border-white/5">
                                {msg.sender.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className={`flex flex-col max-w-[85%] ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1.5 px-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${msg.isOwn ? 'text-primary' : 'text-white/40'}`}>
                                    {msg.sender}
                                </span>
                                <span className="text-[9px] font-bold text-white/20">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className={`px-4 py-3 text-sm leading-relaxed ${msg.isOwn
                                ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-2xl rounded-tr-none shadow-[0_8px_20px_rgba(168,85,247,0.2)]'
                                : 'bg-white/5 border border-white/10 text-white/90 rounded-2xl rounded-tl-none backdrop-blur-md'
                                }`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>

                        {msg.isOwn && (
                            <div className="w-8 h-8 rounded-xl bg-primary flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-primary/20">
                                {msg.sender.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-white/5 bg-[#1a1919]/40 backdrop-blur-xl">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all group">
                    <input
                        type="text"
                        placeholder="Pulse a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/20 font-medium"
                    />
                    <button className="text-white/30 hover:text-white transition-colors">
                        <Smile size={18} />
                    </button>
                    <button
                        onClick={sendMessage}
                        className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white hover:bg-secondary transition-all shadow-lg shadow-primary/20 hover:shadow-secondary/30 active:scale-95"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

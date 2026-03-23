import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { useAIHelper } from '../hooks/useAIHelper';
import clsx from 'clsx'; // Assuming clsx is installed based on vite config

export const AIChatMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const { history, isLoading, error, sendMessage, generateSummary, generateNotes } = useAIHelper();
    const chatEndsRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (isOpen && chatEndsRef.current) {
            chatEndsRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [history, isOpen, isLoading]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;
        
        sendMessage(inputValue);
        setInputValue('');
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
                    title="Ask AI Assistant"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="flex flex-col w-80 sm:w-96 max-h-[500px] h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-400" />
                            <h3 className="font-semibold text-white">Gemini AI Assistant</h3>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {history.length === 0 && (
                            <div className="text-center text-slate-400 mt-10 text-sm">
                                <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>How can I help you with your meeting or models today?</p>
                            </div>
                        )}

                        {history.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={clsx("flex gap-2 max-w-[85%]", 
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={clsx(
                                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                                    msg.role === 'user' ? "bg-blue-600" : "bg-purple-600"
                                )}>
                                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>
                                <div className={clsx(
                                    "px-4 py-2 rounded-2xl text-sm",
                                    msg.role === 'user' 
                                        ? "bg-blue-600 text-white rounded-tr-sm" 
                                        : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm whitespace-pre-wrap"
                                )}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2 max-w-[85%]">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white animate-pulse" />
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-xs text-red-400 text-center p-2 bg-red-900/20 rounded-md border border-red-900/50">
                                {error}
                            </div>
                        )}
                        
                        {/* Quick Actions */}
                        <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                            <button 
                                onClick={() => generateSummary(history.map(m => `${m.role}: ${m.text}`).join('\n'))}
                                disabled={isLoading || history.length === 0}
                                className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-30"
                            >
                                📋 Summarize
                            </button>
                            <button 
                                onClick={() => generateNotes(history.map(m => `${m.role}: ${m.text}`).join('\n'))}
                                disabled={isLoading || history.length === 0}
                                className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-30"
                            >
                                📝 Notes
                            </button>
                        </div>

                        <div ref={chatEndsRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-slate-800 border-t border-slate-700">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input 
                                type="text" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask me anything..." 
                                disabled={isLoading}
                                className="w-full bg-slate-900 text-white rounded-full pl-4 pr-12 py-3 text-sm border border-slate-700 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                            />
                            <button 
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="absolute right-2 p-2 text-white bg-purple-600 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

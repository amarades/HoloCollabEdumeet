import { useState, useRef, useEffect } from 'react';
import { Send, Bot, RefreshCw, X, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { apiRequest } from '../services/api';
import { buildAIContext, parseSceneCommands } from '../ai/ContextBuilder';
import type { Participant, ChatMsg } from '../ai/ContextBuilder';
import type { SceneObject } from '../3d/SceneSync';

interface Msg {
    id: number;
    text: string;
    sender: 'user' | 'assistant';
    hasCommands?: boolean;
}

interface AIAssistantProps {
    onClose?: () => void;
    modelName?: string;
    detectedTopic?: string;
    // Context props
    sceneObjects?: SceneObject[];
    participants?: Participant[];
    chatHistory?: ChatMsg[];
    meetingStartTime?: number;
    // Scene action callback (executes parsed scene commands)
    onSceneCommand?: (action: string, payload: any) => void;
}

export const AIAssistant = ({
    onClose,
    modelName = 'General',
    detectedTopic = '',
    sceneObjects = [],
    participants = [],
    chatHistory = [],
    meetingStartTime = Date.now(),
    onSceneCommand,
}: AIAssistantProps) => {
    const [messages, setMessages] = useState<Msg[]>([
        {
            id: 1,
            text: "Hi! I'm your AI assistant for this session. I can see the 3D scene, participants, and chat. Ask me anything!",
            sender: 'assistant'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Msg = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const systemContext = buildAIContext(
                participants,
                sceneObjects,
                chatHistory,
                meetingStartTime
            );

            const data = await apiRequest('/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: userMsg.text,
                    context: {
                        modelName,
                        systemContext,
                        participants: participants.map(p => p.name),
                        sceneObjectCount: sceneObjects.length,
                    }
                })
            });

            const responseText: string = data.response || "I didn't quite catch that.";

            // Check for scene commands in response
            const commands = parseSceneCommands(responseText);
            const hasCommands = commands.length > 0;

            // Strip the scene_commands block from display text
            const displayText = responseText.replace(/```scene_commands[\s\S]*?```/g, '').trim();

            const assistantMsg: Msg = {
                id: Date.now() + 1,
                text: displayText,
                sender: 'assistant',
                hasCommands,
            };
            setMessages(prev => [...prev, assistantMsg]);

            // Auto-execute scene commands
            if (hasCommands && onSceneCommand) {
                commands.forEach((cmd: any) => {
                    onSceneCommand(cmd.action, cmd);
                });
            }

        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Sorry, I'm having trouble connecting right now. Please try again.",
                sender: 'assistant'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            const transcript = chatHistory.slice(-20).map((m: any) => `${m.sender}: ${m.text}`).join('\n');
            const data = await apiRequest('/api/ai/lecture-notes', {
                method: 'POST',
                body: JSON.stringify({
                    topic: detectedTopic || modelName,
                    model_name: modelName,
                    transcript,
                }),
            });
            const summaryText = [
                `📋 **Session Summary**\n`,
                data.summary || '',
                data.key_points?.length ? `\n**Key Points:**\n${data.key_points.map((p: string) => `• ${p}`).join('\n')}` : '',
                data.follow_up_questions?.length ? `\n**Follow-up:** ${data.follow_up_questions[0]}` : '',
            ].filter(Boolean).join('\n');
            setMessages(prev => [...prev, { id: Date.now(), text: summaryText, sender: 'assistant' }]);
        } catch {
            setMessages(prev => [...prev, { id: Date.now(), text: 'Could not generate summary. Is the AI service running?', sender: 'assistant' }]);
        } finally {
            setIsSummarizing(false);
        }
    };

    const contextSummary = `${participants.length + 1} participant${participants.length !== 0 ? 's' : ''} · ${sceneObjects.length} object${sceneObjects.length !== 1 ? 's' : ''} in scene`;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary/5 to-violet-50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Bot className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-tight">AI Assistant</h3>
                        <p className="text-gray-600 text-xs">{contextSummary}</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                        {msg.sender === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-primary" />
                            </div>
                        )}
                        <div className="flex flex-col gap-1 max-w-[82%]">
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user'
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-sm'
                                }`}>
                                {msg.text}
                            </div>
                            {msg.hasCommands && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-1">
                                    <Sparkles className="w-3 h-3" />
                                    Scene updated
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm">
                            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Context indicator */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-primary/5 border-t border-primary/10">
                <AlertCircle className="w-3 h-3 text-primary/60" />
                <span className="text-xs text-primary">Context-aware: sees scene & participants</span>
            </div>

            {/* Feature 6: Summarize button */}
            <div className="px-3 pb-2 bg-white border-t border-gray-100">
                <button
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition-all disabled:opacity-50"
                >
                    <FileText className="w-3.5 h-3.5" />
                    {isSummarizing ? 'Summarizing…' : '📋 Summarize Session'}
                </button>
            </div>

            {/* Input */}
            <div className="p-3 md:p-4 border-t border-gray-100 bg-white">
                <div className="flex gap-2 items-end">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder='Ask anything…'
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 md:py-2.5 text-sm text-gray-800 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 bg-gray-50 resize-none md:text-base"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="p-3 md:p-2.5 bg-primary rounded-xl text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm"
                    >
                        <Send className="w-4.5 h-4.5 md:w-4 md:h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};


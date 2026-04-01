import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import './AIChatMenu.css';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAarkXMp1O7UqsMspE9iy2ltJaNqZt_QS8";
const GEMINI_MODEL   = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `You are EduMeet AI, an intelligent assistant embedded inside HoloCollab EduMeet — an immersive AI-powered classroom platform. 
You help students with:
- Summarizing lectures and generating timestamped notes
- Explaining deep learning, AI, and computer science concepts clearly
- Analyzing whiteboard notes and collaborative sessions
- Providing study guidance and concept breakdowns
- Answering questions about neural networks, NLP, transformers, CNNs, and related topics

Be concise, friendly, and educational. Use markdown-style formatting when helpful (bold key terms, use bullet points for lists). Keep responses focused and practical.`;

const SUGGESTIONS = [
  "Summarize today's lecture",
  "Explain backpropagation",
  "How does attention work?",
  "Quiz me on CNNs",
];

// ─── GEMINI API CALL ─────────────────────────────────────────────────────────
async function callGemini(chatHistory: Message[]) {
  const contents = chatHistory.map(msg => ({
    role: msg.role === "ai" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || "Gemini API error");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

interface Message {
  id: number;
  role: 'user' | 'ai';
  content: string;
  time: string;
}

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="hc-error-banner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{message}</span>
      <button onClick={onDismiss}>✕</button>
    </div>
  );
}

interface AIChatMenuProps {
  isStandalone?: boolean;
  onClose?: () => void;
}

export const AIChatMenu: React.FC<AIChatMenuProps> = ({ isStandalone = false, onClose }) => {
  const [isOpen, setIsOpen] = useState(isStandalone);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "ai",
      content: "Welcome back! I'm your EduMeet AI assistant powered by Gemini. I can help you summarize lectures, explain concepts, and track your learning progress. What would you like to explore today?",
      time: "Now",
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, error]);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isTyping) return;
    setInput("");
    setError(null);

    const userMsg: Message = { id: Date.now(), role: "user", content, time: now() };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setIsTyping(true);

    try {
      // Pass full history (excluding the initial greeting for cleaner context)
      const historyForAPI = updatedHistory.slice(1);
      const aiText = await callGemini(historyForAPI);

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "ai",
        content: aiText,
        time: now(),
      }]);
    } catch (err: any) {
      setError(err.message || "Failed to reach Gemini. Check your API key.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const chatContent = (
    <div className={`holocollab-chat-shell ${!isStandalone ? 'holocollab-chat-floating' : ''}`}>
      {/* HEADER */}
      <div className="hc-header">
        <div className="hc-header-left">
          <div className="hc-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="hc-header-title">Holo AI</div>
            <div className="hc-header-sub">Powered by Gemini 2.5 Flash-Lite</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hc-model-badge">
            <div className="hc-status-dot" />
            gemini-2.5-flash-lite
          </div>
          <button 
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* MESSAGES */}
      <div className="hc-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`hc-message-row ${msg.role === 'user' ? 'user' : ''}`}>
            {msg.role === 'ai' && (
              <div className="hc-avatar hc-ai-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <div className={`hc-bubble ${msg.role === 'user' ? 'hc-user-bubble' : 'hc-ai-bubble'}`}>
              <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
              <span className="hc-timestamp">{msg.time}</span>
            </div>
            {msg.role === 'user' && (
              <div className="hc-avatar hc-user-avatar">U</div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="hc-typing-row">
            <div className="hc-avatar hc-ai-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="hc-typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* SUGGESTIONS */}
      <div className="hc-suggestions">
        {SUGGESTIONS.map(s => (
          <button 
            key={s} 
            className="hc-suggestion-chip" 
            onClick={() => sendMessage(s)}
            disabled={isTyping}
          >
            {s}
          </button>
        ))}
      </div>

      {/* INPUT */}
      <div className="hc-input-area">
        <div className="hc-input-bar">
          <div className="hc-input-actions">
            <button className="hc-icon-btn" title="Attach file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
          </div>
          <input
            type="text"
            placeholder="Ask about lectures, concepts..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={isTyping}
          />
          <button 
            className="hc-send-btn" 
            onClick={() => sendMessage()} 
            disabled={!input.trim() || isTyping}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={isStandalone ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" : "fixed bottom-6 right-6 z-50 flex flex-col items-end"}>
      {/* Toggle Button */}
      {!isOpen && !isStandalone && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
          title="Ask AI Assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && chatContent}
    </div>
  );
};

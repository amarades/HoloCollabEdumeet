import { useState, useRef, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // 👈 Replace this
const GEMINI_MODEL   = "gemini-2.0-flash";

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
async function callGemini(chatHistory) {
  // Convert chat history to Gemini format
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
function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span /><span /><span />
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`message-row ${isUser ? "user" : "ai"}`}>
      {!isUser && (
        <div className="avatar ai-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <div className={`bubble ${isUser ? "user-bubble" : "ai-bubble"}`}>
        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
        <span className="timestamp">{msg.time}</span>
      </div>
      {isUser && <div className="avatar user-avatar">U</div>}
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="error-banner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{message}</span>
      <button onClick={onDismiss}>✕</button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function HoloCollabChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "ai",
      content: "Welcome back! I'm your EduMeet AI assistant powered by Gemini. I can help you summarize lectures, explain concepts, and track your learning progress. What would you like to explore today?",
      time: "Now",
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || isTyping) return;
    setInput("");
    setError(null);

    const userMsg = { id: Date.now(), role: "user", content, time: now() };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setIsTyping(true);

    try {
      // Pass full history (excluding the initial greeting for cleaner context)
      const historyForAPI = updatedHistory.slice(1); // skip system greeting
      const aiText = await callGemini(historyForAPI);

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "ai",
        content: aiText,
        time: now(),
      }]);
    } catch (err) {
      setError(err.message || "Failed to reach Gemini. Check your API key.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #060a14;
          font-family: 'DM Sans', sans-serif;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .shell {
          width: 100%;
          max-width: 820px;
          height: 100vh;
          max-height: 720px;
          display: flex;
          flex-direction: column;
          background: #0b1120;
          border: 1px solid rgba(56, 189, 248, 0.12);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 0 80px rgba(56, 189, 248, 0.06), 0 30px 60px rgba(0,0,0,0.6);
          position: relative;
        }

        .shell::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.5), rgba(139,92,246,0.5), transparent);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(11, 17, 32, 0.95);
          border-bottom: 1px solid rgba(56, 189, 248, 0.08);
          backdrop-filter: blur(20px);
          flex-shrink: 0;
        }

        .header-left { display: flex; align-items: center; gap: 12px; }

        .logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
          box-shadow: 0 0 20px rgba(56,189,248,0.3);
        }

        .header-title {
          font-family: 'Syne', sans-serif;
          font-size: 15px; font-weight: 700;
          color: #e2e8f0; letter-spacing: 0.01em;
        }

        .header-sub { font-size: 11px; color: #475569; margin-top: 1px; }

        .model-badge {
          display: flex; align-items: center; gap: 6px;
          background: rgba(56, 189, 248, 0.06);
          border: 1px solid rgba(56, 189, 248, 0.18);
          border-radius: 20px; padding: 5px 12px;
          font-size: 11px; color: #38bdf8; font-weight: 500;
        }

        .status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80; box-shadow: 0 0 6px #4ade80;
          animation: pulse 2s infinite;
        }

        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        .error-banner {
          display: flex; align-items: center; gap: 8px;
          margin: 8px 20px 0;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px; padding: 9px 14px;
          font-size: 12px; color: #fca5a5;
          flex-shrink: 0;
        }

        .error-banner span { flex: 1; }

        .error-banner button {
          background: none; border: none;
          color: #fca5a5; cursor: pointer; font-size: 12px;
          opacity: 0.7; padding: 0 2px;
        }

        .error-banner button:hover { opacity: 1; }

        .messages {
          flex: 1; overflow-y: auto;
          padding: 24px 20px;
          display: flex; flex-direction: column; gap: 20px;
          scrollbar-width: thin;
          scrollbar-color: rgba(56,189,248,0.15) transparent;
        }

        .messages::-webkit-scrollbar { width: 4px; }
        .messages::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.15); border-radius: 4px; }

        .message-row {
          display: flex; align-items: flex-end; gap: 10px;
          animation: fadeUp 0.3s ease;
        }

        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .message-row.user { flex-direction: row-reverse; }

        .avatar {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }

        .ai-avatar {
          background: linear-gradient(135deg, #0f2744, #1e3a5f);
          border: 1px solid rgba(56,189,248,0.25); color: #38bdf8;
        }

        .user-avatar {
          background: linear-gradient(135deg, #312e81, #4c1d95);
          border: 1px solid rgba(139,92,246,0.3); color: #a78bfa;
          font-family: 'Syne', sans-serif;
        }

        .bubble {
          max-width: 72%; padding: 13px 16px;
          border-radius: 16px; position: relative;
        }

        .ai-bubble {
          background: rgba(15,39,68,0.7);
          border: 1px solid rgba(56,189,248,0.1);
          border-bottom-left-radius: 4px;
        }

        .user-bubble {
          background: linear-gradient(135deg, rgba(49,46,129,0.8), rgba(76,29,149,0.6));
          border: 1px solid rgba(139,92,246,0.2);
          border-bottom-right-radius: 4px;
        }

        .bubble p {
          font-size: 13.5px; line-height: 1.65;
          color: #cbd5e1; font-weight: 400;
        }

        .timestamp {
          display: block; font-size: 10px;
          color: #334155; margin-top: 6px; text-align: right;
        }

        .typing-row { display: flex; align-items: flex-end; gap: 10px; animation: fadeUp 0.3s ease; }

        .typing-indicator {
          display: flex; align-items: center; gap: 4px;
          background: rgba(15,39,68,0.7);
          border: 1px solid rgba(56,189,248,0.1);
          border-radius: 16px; border-bottom-left-radius: 4px;
          padding: 14px 16px;
        }

        .typing-indicator span {
          width: 6px; height: 6px;
          background: #38bdf8; border-radius: 50%;
          animation: bounce 1.2s infinite; opacity: 0.7;
        }

        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-5px); } }

        .suggestions {
          padding: 0 20px 12px;
          display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0;
        }

        .suggestion-chip {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(56,189,248,0.15);
          border-radius: 20px; padding: 6px 13px;
          font-size: 11.5px; color: #7dd3fc;
          cursor: pointer; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }

        .suggestion-chip:hover {
          background: rgba(56,189,248,0.08);
          border-color: rgba(56,189,248,0.35); color: #38bdf8;
        }

        .suggestion-chip:disabled { opacity: 0.4; cursor: not-allowed; }

        .input-area { padding: 12px 20px 20px; flex-shrink: 0; }

        .input-bar {
          display: flex; align-items: center; gap: 10px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(56,189,248,0.15);
          border-radius: 14px; padding: 10px 14px;
          transition: border-color 0.2s;
        }

        .input-bar:focus-within {
          border-color: rgba(56,189,248,0.4);
          box-shadow: 0 0 20px rgba(56,189,248,0.06);
        }

        .input-bar input {
          flex: 1; background: transparent; border: none; outline: none;
          font-size: 13.5px; color: #e2e8f0;
          font-family: 'DM Sans', sans-serif;
        }

        .input-bar input::placeholder { color: #334155; }

        .send-btn {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: white; transition: all 0.2s; flex-shrink: 0;
          box-shadow: 0 0 12px rgba(56,189,248,0.2);
        }

        .send-btn:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(56,189,248,0.35); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

        .icon-btn {
          background: none; border: none; color: #334155;
          cursor: pointer; padding: 4px; border-radius: 6px;
          transition: color 0.2s; display: flex;
        }

        .icon-btn:hover { color: #38bdf8; }
      `}</style>

      <div className="shell">
        {/* HEADER */}
        <div className="header">
          <div className="header-left">
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="header-title">HoloCollab EduMeet AI</div>
              <div className="header-sub">Powered by Gemini 2.0 Flash</div>
            </div>
          </div>
          <div className="model-badge">
            <div className="status-dot" />
            gemini-2.0-flash
          </div>
        </div>

        {/* ERROR */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* MESSAGES */}
        <div className="messages">
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {isTyping && (
            <div className="typing-row">
              <div className="avatar ai-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <TypingIndicator />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* SUGGESTIONS */}
        <div className="suggestions">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className="suggestion-chip"
              disabled={isTyping}
              onClick={() => sendMessage(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* INPUT */}
        <div className="input-area">
          <div className="input-bar">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="icon-btn" title="Attach file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder="Ask about lectures, concepts, or your progress..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={isTyping}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

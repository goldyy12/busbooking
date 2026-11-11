import { useState, useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../Api.jsx";
import { AuthContext } from "../context/AuthContext";
import {
  BusIcon,
  CloseIcon,
  RefreshIcon,
  SendIcon,
} from "./ChatIcons.jsx";
import "../styles/chatbot.css";

const STORAGE_KEY = "chatbot-messages";
const MAX_INPUT = 500;

const SUGGESTIONS = [
  "Buses from Prishtina to Prizren tomorrow",
  "Find me the cheapest trip from Ferizaj to Prishtina",
  "How can I pay for a ticket?",
];

// Keep the conversation while the user browses (cleared when the tab closes).
const loadMessages = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const saveMessages = (messages) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Storage unavailable (private mode etc.) — the chat still works.
  }
};

const errorMessage = (err) => {
  const status = err.response?.status;
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 429)
    return "Too many requests right now. Please wait a moment and try again.";
  if (status === 502 || status === 503)
    return "The assistant is temporarily unavailable. Please try again shortly.";
  if (!err.response)
    return "Can't reach the server. Check your connection and try again.";
  return "Sorry, something went wrong. Please try again.";
};

export default function Chatbot({ onClose }) {
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => saveMessages(messages), [messages]);

  // Always show the latest message.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (user) inputRef.current?.focus();
  }, [user]);

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async (text) => {
    const content = text.trim();
    // The assistant needs a logged-in user (it can book tickets). Sending
    // while logged out would get a 401 and redirect away from the page.
    if (!user || !content || loading) return;

    // Only real conversation turns go to the server, not local error notes.
    const history = messages.filter((m) => !m.error);
    const updated = [...history, { role: "user", content }];

    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/agent/chat", { messages: updated });
      setMessages([
        ...updated,
        { role: "assistant", content: response.data.reply },
      ]);
    } catch (err) {
      console.error("Agent chat error:", err);
      setMessages([
        ...updated,
        { role: "assistant", content: errorMessage(err), error: true },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  return (
    <div
      className="chatbot-container"
      role="dialog"
      aria-label="Bus booking assistant"
    >
      <div className="chatbot-header">
        <div className="chatbot-title">
          <span className="chatbot-avatar" aria-hidden="true">
            <BusIcon />
          </span>
          <div>
            <div className="chatbot-name">Booking Assistant</div>
            <div className="chatbot-status">
              <span className="chatbot-dot" aria-hidden="true" />
              Kosovo routes · English &amp; Shqip
            </div>
          </div>
        </div>
        <div className="chatbot-actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="chatbot-icon-btn"
              onClick={clearChat}
              title="New conversation"
              aria-label="Start a new conversation"
            >
              <RefreshIcon />
            </button>
          )}
          <button
            type="button"
            className="chatbot-icon-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close assistant"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="chatbot-messages" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="chatbot-welcome">
            <p className="chatbot-welcome-title">
              Hi{user?.name ? ` ${user.name}` : ""}! Where are you headed?
            </p>
            <p className="chatbot-welcome-text">
              I can find bus trips, compare prices and book seats for you.
            </p>
            {user && (
              <div className="chatbot-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chatbot-chip"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chatbot-message ${msg.role}${msg.error ? " error" : ""}`}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div
            className="chatbot-message assistant chatbot-typing"
            aria-label="Assistant is typing"
          >
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {!user ? (
        <div className="chatbot-login">
          <span>Log in to chat with the assistant and book tickets.</span>
          <Link to="/login" className="chatbot-login-btn">
            Log in
          </Link>
        </div>
      ) : (
        <form
          className="chatbot-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            maxLength={MAX_INPUT}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about trips, prices or bookings…"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </form>
      )}
    </div>
  );
}

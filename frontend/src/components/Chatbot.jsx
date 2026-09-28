import { useState } from "react";
import api from "../Api.jsx";
import "../styles/chatbot.css";

export default function Chatbot(onClose) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages); // show the user's message immediately
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/agent/chat", {
        messages: updatedMessages,
      });
      const assistantMessage = {
        role: "assistant",
        content: response.data.reply,
      };
      setMessages([...updatedMessages, assistantMessage]); // add the reply
    } catch (err) {
      console.error("Agent chat error:", err);
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <span>Bus Booking Assistant</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chatbot-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="chatbot-message assistant">Thinking...</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything for help..."
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}

import { useState } from "react";
import Chatbot from "./Chatbot";
import "../styles/chatbot.css";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <Chatbot onClose={() => setOpen(false)} />}
      <button className="chatbot-toggle-btn" onClick={() => setOpen(!open)}>
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}

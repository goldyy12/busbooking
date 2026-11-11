import { useState } from "react";
import Chatbot from "./Chatbot";
import { ChatIcon, CloseIcon } from "./ChatIcons.jsx";
import "../styles/chatbot.css";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <Chatbot onClose={() => setOpen(false)} />}
      <button
        type="button"
        className={`chatbot-toggle-btn${open ? " open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close booking assistant" : "Open booking assistant"}
        aria-expanded={open}
      >
        {open ? <CloseIcon width={22} height={22} /> : <ChatIcon />}
      </button>
    </>
  );
}

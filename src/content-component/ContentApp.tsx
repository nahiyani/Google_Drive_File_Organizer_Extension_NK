import { useState, useRef } from "react";
import "../content-component/ContentApp.css";

const ContentApp = () => {
  const [visible, setVisible] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, `You: ${input}`]);
    setMessages((prev) => [
      ...prev,
      `AI: Searching Google Drive for "${input}"...`,
    ]);
    setInput("");
  };

  if (!visible) return null;

  return (
    <div className="gdfo-side-panel" ref={panelRef}>
      <button className="gdfo-close" onClick={() => setVisible(false)}>
        ×
      </button>

      <div className="gdfo-header">
        <h2>Google Drive AI Assistant</h2>
      </div>

      <div className="gdfo-chat">
        {messages.map((msg, i) => (
          <div key={i} className="gdfo-message">
            {msg}
          </div>
        ))}
      </div>

      <div className="gdfo-input-container">
        <input
          type="text"
          placeholder="Ask to find files..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default ContentApp;

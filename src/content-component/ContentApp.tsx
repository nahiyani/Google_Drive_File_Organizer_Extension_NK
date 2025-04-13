import { useState, useRef, useEffect } from "react";
import "../content-component/ContentApp.css";

const ContentApp = () => {
  const [visible, setVisible] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [width, setWidth] = useState(400);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth / 2;
      setWidth(Math.min(maxWidth, Math.max(300, newWidth)));
    };

    const stopDragging = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, []);

  const startDragging = () => {
    isDragging.current = true;
  };

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
    <div className="gdfo-side-panel" ref={panelRef} style={{ width }}>
      <div className="gdfo-resize-handle" onMouseDown={startDragging} />
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

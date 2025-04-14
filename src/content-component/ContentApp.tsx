import { useState, useRef, useEffect } from "react";
import "./ContentApp.css";

const ContentApp = () => {
  const [visible, setVisible] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [width, setWidth] = useState(400);
  const [connected, setConnected] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const isDragging = useRef(false);

  // Connect to background script on mount
  useEffect(() => {
    // First, send a one-time message to let the background script know we're ready
    chrome.runtime.sendMessage({ action: "content_ready" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error connecting:", chrome.runtime.lastError);
        setMessages((prev) => [
          ...prev,
          "Error: Could not connect to extension background service",
        ]);
      } else {
        console.log("Content script ready message acknowledged:", response);
        
        // Now establish a persistent connection
        try {
          const port = chrome.runtime.connect({ name: "content_channel" });
          portRef.current = port;
          
          port.onMessage.addListener((msg) => {
            console.log("Background message received:", msg);
            if (msg.type === "pong") {
              setConnected(true);
            }
          });
          
          port.onDisconnect.addListener(() => {
            console.log("Disconnected from background");
            setConnected(false);
            portRef.current = null;
          });
          
          // Send an initial ping
          port.postMessage({ type: "ping" });
          
          setMessages((prev) => [...prev, "Connected to Google Drive assistant"]);
        } catch (error) {
          console.error("Error establishing connection:", error);
          setMessages((prev) => [
            ...prev,
            "Error: Failed to establish connection to extension",
          ]);
        }
      }
    });
    
    return () => {
      // Clean up connection on unmount
      if (portRef.current) {
        portRef.current.disconnect();
        portRef.current = null;
      }
    };
  }, []);

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
    getDriveFiles();
    setInput("");
  };

  const getDriveFiles = () => {
    chrome.runtime.sendMessage({ action: "auth" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Auth error:", chrome.runtime.lastError);
        setMessages((prev) => [
          ...prev,
          "Error: Authentication failed. Please try again.",
        ]);
        return;
      }
      
      if (!response || !response.success) {
        setMessages((prev) => [
          ...prev,
          "Error: Could not retrieve authentication token",
        ]);
        return;
      }
      
      const token = response.token;
      fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name)",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.log("Drive Files:", data.files);
          
          if (data.files && data.files.length > 0) {
            const fileList = data.files
              .map((file: { name: string }) => file.name)
              .join(", ");
            setMessages((prev) => [
              ...prev,
              `Found files: ${fileList}`,
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              "No files found matching your query",
            ]);
          }
        })
        .catch((error) => {
          console.error("Error fetching Drive files:", error);
          setMessages((prev) => [
            ...prev,
            `Error: ${error.message}`,
          ]);
        });
    });
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
        <div className="gdfo-connection-status">
          {connected ? "✓ Connected" : "⚠ Disconnected"}
        </div>
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
        <button onClick={handleSend} disabled={!connected}>Send</button>
      </div>
    </div>
  );
};

export default ContentApp;
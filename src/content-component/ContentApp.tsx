import { useState, useRef, useEffect } from "react";
import "./ContentApp.css";
import { GoogleDriveFile } from "../drive";

const ContentApp = () => {
  // REFERENCES AND STATES
  const [visible, setVisible] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [highlightedFiles, setHighlightedFiles] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    return JSON.parse(localStorage.getItem("darkMode") || "false");
  });
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem("gdfo-panel-width");
    return saved ? parseInt(saved, 10) : 400;
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [recentFiles, setRecentFiles] = useState<GoogleDriveFile[]>([]);
  const [showRecent, setShowRecent] = useState(true);

  // UTILITY FUNCTIONS
  const getFileListContainer = () =>
    document.querySelector<HTMLDivElement>(".Ky2F");
  const getFileItems = () => document.querySelectorAll<HTMLElement>(".rGk6He");
  const getFileNameFromItem = (item: HTMLElement) =>
    item.querySelector<HTMLElement>("[title]")?.getAttribute("title") ?? null;

  const getDriveLink = (file: GoogleDriveFile) => {
    const base =
      file.mimeType === "application/vnd.google-apps.folder"
        ? "https://drive.google.com/drive/folders/"
        : "https://drive.google.com/file/d/";
    return `${base}${file.id}`;
  };

  const highlightFileInUI = (fileName: string) => {
    getFileItems().forEach((item) => {
      const name = getFileNameFromItem(item);
      item.classList.toggle("gdfo-highlighted", name === fileName);
    });
  };

  const clearFileHighlights = () => {
    getFileItems().forEach((item) => item.classList.remove("gdfo-highlighted"));
  };

  const highlightSearchResults = (results: GoogleDriveFile[]) => {
    clearFileHighlights();
    const names = results.map((r) => r.name);
    setHighlightedFiles(names);
    names.forEach(highlightFileInUI);
  };

  const formatMimeLabel = (mimeType?: string) => {
    if (!mimeType) return "Unknown";
    if (mimeType === "application/vnd.google-apps.folder") return "Folder";
    if (mimeType.includes("document")) return "Docs";
    if (mimeType.includes("spreadsheet")) return "Sheets";
    if (mimeType.includes("presentation")) return "Slides";
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.includes("image")) return "Image";
    if (mimeType.includes("video")) return "Video";
    return "File";
  };

  const getMimeIcon = (mimeType?: string) => {
    if (!mimeType) return defaultFileIcon();
    if (mimeType.includes("document")) return icon("document");
    if (mimeType.includes("spreadsheet")) return icon("spreadsheet");
    if (mimeType.includes("presentation")) return icon("presentation");
    if (mimeType.includes("pdf")) return icon("pdf");
    if (mimeType.includes("image")) return icon("image");
    if (mimeType.includes("video")) return icon("video");
    if (mimeType === "application/vnd.google-apps.folder") return `📂`;
    return defaultFileIcon();
  };

  const icon = (type: string) =>
    `<img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_${type}_list.png" alt="${type}" class="gdfo-icon" />`;

  const defaultFileIcon = () =>
    `<img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_generic_list.png" alt="File" class="gdfo-icon" />`;

  const formatTime = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderFileHTML = (file: GoogleDriveFile) => {
    const icon = getMimeIcon(file.mimeType);
    const typeLabel = formatMimeLabel(file.mimeType);
    const lastOpened = file.viewedByMeTime
      ? formatTime(file.viewedByMeTime)
      : "";
    return `
      <div class='gdfo-file'>
        <span class='gdfo-file-icon'>${icon}</span>
        <a href="${getDriveLink(file)}" target="_blank" class='gdfo-file-name'>
          ${file.name}
        </a>
       <span class='gdfo-file-type'>(${typeLabel}${
      lastOpened ? ` · Last Modified ${lastOpened}` : ""
    })</span>
      </div>
    `;
  };

  // HANDLERS
  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      `<div class='gdfo-user-message'>${input}</div>`,
      `<div class='gdfo-ai-message'>Searching Google Drive for "${input}"...</div>`,
    ]);
    searchDrive(input);
    setInput("");
  };

  const handleVoiceSearch = () => {
    setMessages((prev) => [
      ...prev,
      `<div class='gdfo-ai-neutral'>Voice search is not available at the moment.</div>`,
    ]);
  };

  const filterByType = (mimeType: string, typeName: string) => {
    searchDrive("", mimeType);
    setMessages((prev) => [
      ...prev,
      `<div class='gdfo-section-title'>🔍 ${typeName}</div>`,
    ]);
  };

  const searchDrive = (query: string = "", mimeType?: string) => {
    chrome.runtime.sendMessage(
      { action: "searchDrive", query, mimeType },
      (response) => {
        if (response?.results) {
          const results = response.results as GoogleDriveFile[];
          setMessages((prev) => [
            ...prev,
            `<div class='gdfo-ai-message'>Found ${
              results.length
            } file(s) matching "${query}"$${
              mimeType ? ` of type ${mimeType.split("/").pop()}` : ""
            }:</div>`,
            ...results.map(renderFileHTML),
          ]);
          highlightSearchResults(results);
        } else if (response?.error) {
          console.error("Search error:", response.error);
          setMessages((prev) => [
            ...prev,
            `<div class='gdfo-ai-error'>Error: ${response.error}</div>`,
          ]);
          clearFileHighlights();
        } else {
          setMessages((prev) => [
            ...prev,
            `<div class='gdfo-ai-neutral'>No files found matching "${query}".</div>`,
          ]);
          clearFileHighlights();
        }
      }
    );
  };

  // EFFECTS
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(
        window.innerWidth / 2,
        Math.max(300, window.innerWidth - e.clientX)
      );
      setWidth(newWidth);
      localStorage.setItem("gdfo-panel-width", newWidth.toString());
    };
    const stopDragging = () => (isDragging.current = false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, []);

  useEffect(() => {
    const container = getFileListContainer();
    if (!container) return;
    const observer = new MutationObserver(() => {
      if (highlightedFiles.length > 0) {
        highlightedFiles.forEach(highlightFileInUI);
      }
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [highlightedFiles]);

  useEffect(() => {
    chrome.runtime.sendMessage(
      { action: "searchDrive", query: "", recent: true },
      (response) => {
        if (response?.results?.length) {
          setRecentFiles(response.results);
        }
      }
    );
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "darkMode") {
        setDarkMode(JSON.parse(e.newValue ?? "false"));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.action === "updateDarkMode") {
        setDarkMode(msg.value);
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // JSX
  if (!visible) return null;

  return (
    <div
      className={`gdfo-side-panel ${darkMode ? "dark" : ""}`}
      ref={panelRef}
      style={{ width }}
    >
      <div
        className="gdfo-resize-handle"
        onMouseDown={() => (isDragging.current = true)}
      />

      <div className="gdfo-header">
        <h2 className="gdfo-header-title">Google Drive AI</h2>
        <div className="gdfo-header-actions">
          <button className="gdfo-close" onClick={() => setVisible(false)}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="gdfo-chat">
        <div
          className="gdfo-section-title"
          onClick={() => setShowRecent(!showRecent)}
        >
          <div className="gdfo-section-icon-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20"
              viewBox="0 0 24 24"
              width="20"
              fill="currentColor"
            >
              <path
                d="M12 8v5h5v-2h-3V8h-2zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 
      0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              />
            </svg>
            <span className="gdfo-section-label">Recent</span>
            <svg
              className={`gdfo-chevron ${showRecent ? "expanded" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              height="20"
              viewBox="0 0 24 24"
              width="20"
              fill="currentColor"
            >
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </div>
        </div>

        {showRecent &&
          recentFiles.map((f) => (
            <div
              key={f.id}
              className="gdfo-message"
              dangerouslySetInnerHTML={{ __html: renderFileHTML(f) }}
            />
          ))}

        {showRecent &&
          recentFiles.map((f) => (
            <div
              key={f.id}
              className="gdfo-message"
              dangerouslySetInnerHTML={{ __html: renderFileHTML(f) }}
            />
          ))}

        {messages.map((msg, i) => (
          <div
            key={i}
            className="gdfo-message"
            dangerouslySetInnerHTML={{ __html: msg }}
          />
        ))}
      </div>

      <div className="gdfo-input-container">
        <input
          type="text"
          placeholder="Search or ask AI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="gdfo-input"
        />
        <div className="gdfo-input-actions">
          <button
            className="gdfo-button gdfo-button-primary"
            onClick={handleSend}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
          <button
            className="gdfo-button gdfo-button-secondary"
            onClick={handleVoiceSearch}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="gdfo-filters">
        <div className="gdfo-filter-title">Filter by Type</div>
        <div className="gdfo-filter-buttons">
          {[
            ["application/vnd.google-apps.document", "Docs"],
            ["application/vnd.google-apps.spreadsheet", "Sheets"],
            ["application/vnd.google-apps.presentation", "Slides"],
            ["application/pdf", "PDFs"],
            ["image/", "Images"],
            ["video/", "Videos"],
          ].map(([mime, label]) => (
            <button
              key={label}
              className="gdfo-button gdfo-button-filter"
              onClick={() => filterByType(mime, label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentApp;

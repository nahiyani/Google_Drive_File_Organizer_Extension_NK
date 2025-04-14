import { useState, useEffect } from "react";

const PopupApp = () => {
  const [tab, setTab] = useState("content");
  const [semanticSearch, setSemanticSearch] = useState(false);
  const [fileLabeling, setFileLabeling] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "signed-in" | "error">("idle");
  const [connectionStatus, setConnectionStatus] = useState("Not connected");

  // Load settings from storage on component mount
  useEffect(() => {
    chrome.storage.local.get(
      ["semanticSearch", "fileLabeling", "darkMode"],
      (result) => {
        if (result.semanticSearch !== undefined) setSemanticSearch(result.semanticSearch);
        if (result.fileLabeling !== undefined) setFileLabeling(result.fileLabeling);
        if (result.darkMode !== undefined) setDarkMode(result.darkMode);
      }
    );
    
    // Check if we're already authenticated
    checkAuthStatus();
    
    // Attempt to connect to background script
    pingBackgroundScript();
  }, []);

  // Update storage when settings change
  useEffect(() => {
    chrome.storage.local.set({ semanticSearch });
  }, [semanticSearch]);

  useEffect(() => {
    chrome.storage.local.set({ fileLabeling });
  }, [fileLabeling]);

  useEffect(() => {
    chrome.storage.local.set({ darkMode });
  }, [darkMode]);
  
  const pingBackgroundScript = () => {
    chrome.runtime.sendMessage({ action: "popup_ready" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Connection error:", chrome.runtime.lastError);
        setConnectionStatus("Error connecting to extension");
      } else {
        setConnectionStatus("Connected to extension");
      }
    });
  };
  
  const checkAuthStatus = () => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        setAuthStatus("idle");
      } else {
        setAuthStatus("signed-in");
      }
    });
  };

  const getTabIndicatorClass = () => {
    return `tab-indicator tab-${tab}`;
  };

  const handleSignIn = () => {
    setAuthStatus("idle"); // Set to idle while waiting
    
    chrome.runtime.sendMessage({ action: "auth" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Auth error:", chrome.runtime.lastError);
        setAuthStatus("error");
        return;
      }
      
      if (response?.success) {
        setAuthStatus("signed-in");
      } else {
        setAuthStatus("error");
      }
    });
  };

  return (
    <div className={`popup-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="popup-header">
        <img src="logo.png" alt="logo" className="popup-logo" />
        <div className="popup-title">
          <h2>Google Drive File Organizer</h2>
          <p>Settings</p>
        </div>
      </div>

      <div className="popup-tabs">
        <button
          onClick={() => setTab("content")}
          className={tab === "content" ? "active" : ""}
        >
          Content
        </button>
        <button
          onClick={() => setTab("user")}
          className={tab === "user" ? "active" : ""}
        >
          User
        </button>
        <button
          onClick={() => setTab("appearance")}
          className={tab === "appearance" ? "active" : ""}
        >
          Appearance
        </button>
        <div className={getTabIndicatorClass()}></div>
      </div>

      <div className="popup-body">
        <div className={`content-section ${tab === "content" ? "active" : ""}`}>
          <div className="setting-item">
            <span className="setting-label">Enable Semantic File Search</span>
            <div className="toggle-switch">
              <label className="switch-wrapper">
                <input
                  type="checkbox"
                  checked={semanticSearch}
                  onChange={() => setSemanticSearch(!semanticSearch)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-item">
            <span className="setting-label">Enable AI File Labeling</span>
            <div className="toggle-switch">
              <label className="switch-wrapper">
                <input
                  type="checkbox"
                  checked={fileLabeling}
                  onChange={() => setFileLabeling(!fileLabeling)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-item select-container">
            <label htmlFor="folder-behavior" className="setting-label">
              Folder Behavior
            </label>
            <select id="folder-behavior" className="setting-select">
              <option value="all">Include folders</option>
              <option value="filesOnly">Skip folders</option>
            </select>
          </div>
          
          <div className="connection-status">
            {connectionStatus}
          </div>
        </div>

        <div className={`user-section ${tab === "user" ? "active" : ""}`}>
          <div className="setting-item">
            <span className="setting-label">
              {authStatus === "signed-in"
                ? "Signed in to Google Drive"
                : "Sign in to access Google Drive"}
            </span>
            {authStatus !== "signed-in" && (
              <button onClick={handleSignIn} className="sign-in-button">
                Sign In
              </button>
            )}
          </div>

          <div className="setting-item">
            <span className="setting-label">
              Enable Google Account Detection
            </span>
            <div className="toggle-switch">
              <label className="switch-wrapper">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-item">
            <span className="setting-label">
              Require Two-Factor Authentication
            </span>
            <div className="toggle-switch">
              <label className="switch-wrapper">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div
          className={`appearance-section ${
            tab === "appearance" ? "active" : ""
          }`}
        >
          <div className="setting-item">
            <span className="setting-label">Enable Dark Mode</span>
            <div className="toggle-switch">
              <label className="switch-wrapper">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-item select-container">
            <label htmlFor="interface-mode" className="setting-label">
              Interface Mode
            </label>
            <select id="interface-mode" className="setting-select">
              <option value="popup">Compact Popup</option>
              <option value="full">Full-Screen Panel</option>
            </select>
          </div>

          <div className="setting-item select-container">
            <label htmlFor="size-preset" className="setting-label">
              Size Preset
            </label>
            <select id="size-preset" className="setting-select">
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupApp;
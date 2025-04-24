import { useState, useEffect } from "react";
import Organize from './Organize';

const PopupApp = () => {
  const [tab, setTab] = useState("content");
  const [showOrganize, setShowOrganize] = useState(false);
  const [semanticSearch, setSemanticSearch] = useState(
    JSON.parse(localStorage.getItem("semanticSearch") || "true")
  );
  const [fileLabeling, setFileLabeling] = useState(
    JSON.parse(localStorage.getItem("fileLabeling") || "false")
  );
  const [darkMode, setDarkMode] = useState(
    JSON.parse(localStorage.getItem("darkMode") || "false")
  );

  const getTabIndicatorClass = () => {
    return `tab-indicator tab-${tab}`;
  };

  const [authStatus, setAuthStatus] = useState<"idle" | "signed-in" | "error">(
    "idle"
  );

  useEffect(() => {
    localStorage.setItem("semanticSearch", JSON.stringify(semanticSearch));
  }, [semanticSearch]);

  useEffect(() => {
    localStorage.setItem("fileLabeling", JSON.stringify(fileLabeling));
  }, [fileLabeling]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const handleSignIn = () => {
    chrome.runtime.sendMessage({ action: "auth" }, (response) => {
      if (response?.success) {
        setAuthStatus("signed-in");
      } else {
        setAuthStatus("error");
      }
    });
  };

  const handleOrganizeClick = () => {
    setShowOrganize(true);
  };

  const handleBackToSettings = () => {
    setShowOrganize(false);
  };

  if (showOrganize) {
    return (
      <div className={`popup-wrapper ${darkMode ? "dark" : ""}`}>
        <div className="popup-header">
          <img src="logo.png" alt="logo" className="popup-logo" />
          <div className="popup-title">
            <h2>Google Drive File Organizer</h2>
            <p>Organize Files</p>
          </div>
        </div>
        <div className="back-button-container">
          <button className="back-button" onClick={handleBackToSettings}>
            &larr; Back
          </button>
        </div>
        <Organize />
      </div>
    );
  }

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

          <div className="organize-button-container">
            <button className="organize-button" onClick={handleOrganizeClick}>
              Organize
            </button>
          </div>
        </div>

        <div className={`user-section ${tab === "user" ? "active" : ""}`}>
          <div className="warning">
            <span className="warning-icon">⚠️</span>
            Authentication logic not yet implemented
          </div>

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
          className={`appearance-section ${tab === "appearance" ? "active" : ""}`}
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
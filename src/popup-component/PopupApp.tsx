import { useState } from "react";
import "./PopupApp.css";

const PopupApp = () => {
  const [tab, setTab] = useState("content");
  const [semanticSearch, setSemanticSearch] = useState(true);
  const [fileLabeling, setFileLabeling] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`popup-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="popup-header">
        <img src="logo.png" alt="logo" className="popup-logo" />
        <div className="popup-title">
          <h2>Google Drive File Organizer</h2>
          <p>Settings</p>
        </div>
      </div>

      <hr className="divider" />

      <div className="popup-tabs">
        <button
          onClick={() => setTab("content")}
          className={tab === "content" ? "active" : ""}
        >
          Content Settings
        </button>
        <button
          onClick={() => setTab("user")}
          className={tab === "user" ? "active" : ""}
        >
          User Settings
        </button>
        <button
          onClick={() => setTab("appearance")}
          className={tab === "appearance" ? "active" : ""}
        >
          Appearance
        </button>
      </div>

      <div className="popup-body">
        {tab === "content" && (
          <div className="settings-section">
            <label>
              <input
                type="checkbox"
                checked={semanticSearch}
                onChange={() => setSemanticSearch(!semanticSearch)}
              />
              Enable Semantic File Search
            </label>

            <label>
              <input
                type="checkbox"
                checked={fileLabeling}
                onChange={() => setFileLabeling(!fileLabeling)}
              />
              Enable AI File Labeling
            </label>

            <label>
              Folder Behavior:
              <select>
                <option value="all">Include folders</option>
                <option value="filesOnly">Skip folders</option>
              </select>
            </label>
          </div>
        )}

        {tab === "user" && (
          <div className="settings-section">
            <div className="warning">
              ⚠️ Authentication logic not yet implemented
            </div>
            <label>
              <input type="checkbox" />
              Enable Google Account Detection
            </label>

            <label>
              <input type="checkbox" />
              Require Two-Factor Authentication
            </label>
          </div>
        )}

        {tab === "appearance" && (
          <div className="settings-section">
            <label>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
              />
              Enable Dark Mode
            </label>

            <label>
              Interface Mode:
              <select>
                <option value="popup">Compact Popup</option>
                <option value="full">Full-Screen Panel</option>
              </select>
            </label>

            <label>
              Size Preset:
              <select>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupApp;

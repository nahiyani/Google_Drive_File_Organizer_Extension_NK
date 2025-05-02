import { useState } from "react";
import "./PopupApp.css";

const presetOptions = [
  {
    key: "preset1",
    label: "By Projects",
    description: "Group files by projects",
  },
  {
    key: "preset2",
    label: "By File Types",
    description: "Group files by file types",
  },
  {
    key: "preset3",
    label: "By Date",
    description: "Match files with dates",
  },
  { key: "custom", label: "Custom", description: "Choose your own rules" },
];

const PresetsPage = ({
  onBackToSettings,
  onSearchDirectory,
  darkMode,
}: {
  onBackToSettings: () => void;
  onSearchDirectory: () => void;
  darkMode: boolean;
}) => {
  const [selectedPreset, setSelectedPreset] = useState("preset1");

  return (
    <div className={`popup-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="popup-header">
        <img src="logo.png" alt="logo" className="popup-logo" />
        <div className="popup-title">
          <h2>Google Drive File Organizer</h2>
          <p>Organize your files with AI</p>
        </div>
        <div className="settings-nav">
          <button className="settings-button" onClick={onBackToSettings}>
            <span className="settings-text">Settings</span>
          </button>
        </div>
      </div>

      <div className="header-divider"></div>

      <div className="popup-content no-scroll">
        <div className="presets-header">
          <h3 className="presets-title-google">
            Automatically group your files
          </h3>
          <button
            className="search-directory-button"
            onClick={onSearchDirectory}
            title="Search Google Drive"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="16"
              width="16"
              viewBox="0 0 24 24"
              fill="#5f6368"
            >
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <span>Search</span>
          </button>
        </div>

        <div className="presets-grid">
          {presetOptions.map((preset) => (
            <div
              key={preset.key}
              className={`preset-card-google ${
                selectedPreset === preset.key ? "selected" : ""
              }`}
              onClick={() => setSelectedPreset(preset.key)}
            >
              <div className="preset-content-google">
                <div className="preset-label-google">{preset.label}</div>
                <div className="preset-desc-google">{preset.description}</div>
              </div>
              <div className="preset-radio-google">
                <div
                  className={`radio-circle ${
                    selectedPreset === preset.key ? "selected" : ""
                  }`}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <button className="organize-ai-button-google">Organize with AI</button>
      </div>
    </div>
  );
};

export default PresetsPage;

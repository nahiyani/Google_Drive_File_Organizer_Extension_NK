import { useState } from "react";
import "./PopupApp.css";

const presetOptions = [
  {
    key: "preset1",
    label: "By domain",
    description: "Group files by their source",
  },
  {
    key: "preset2",
    label: "By topic (AI)",
    description: "Use AI to group by theme",
  },
  {
    key: "preset3",
    label: "By similar names",
    description: "Match files with similar titles",
  },
  { key: "custom", label: "Custom", description: "Choose your own rules" },
];

const PresetsPage = ({
  onBackToSettings,
}: {
  onBackToSettings: () => void;
}) => {
  const [selectedPreset, setSelectedPreset] = useState("preset1");

  return (
    <div className="popup-wrapper">
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

      <div className="popup-content">
        <h3 className="presets-title-google">Automatically group your files</h3>

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

import { useState, useEffect } from "react";
import Organize from "./Organize";
import PresetsPage from "./PresetsPage";

const PopupApp = () => {
  // REFERENCES AND STATES
  const [tab, setTab] = useState("content");
  const [showOrganize, setShowOrganize] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleConfirmSignOut = () => {
    handleSignOut();
    setShowSignOutConfirm(false);
  };

  const handleSignIn = () => {
    chrome.runtime.sendMessage({ action: "auth" }, (response) => {
      if (response?.success) {
        setAuthStatus("signed-in");
        setUserEmail(response.email);
        setProfilePicture(response.profilePicture);
        localStorage.setItem("authStatus", "signed-in");
        localStorage.setItem("userEmail", response.email);
        localStorage.setItem("profilePicture", response.profilePicture || "");
      } else {
        setAuthStatus("error");
        console.error("Auth error:", response?.error);
      }
    });
  };

  const handleSignOut = () => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (typeof token === "string") {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        });
      }
      setAuthStatus("idle");
      setUserEmail(null);
      setProfilePicture(null);
      localStorage.removeItem("authStatus");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("profilePicture");
    });
  };

  // Nahiyan's organize button logic
  const handleOrganizeClick = () => {
    setShowOrganize(true);
  };
  const handleBackToSettings = () => {
    setShowOrganize(false);
  };

  // UTILITY FUNCTIONS
  useEffect(() => {
    const savedAuth = localStorage.getItem("authStatus");
    const savedEmail = localStorage.getItem("userEmail");
    const savedPic = localStorage.getItem("profilePicture");
    if (savedAuth === "signed-in" && savedEmail) {
      setAuthStatus("signed-in");
      setUserEmail(savedEmail);
      if (savedPic) setProfilePicture(savedPic);
    }
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "checkAuth" }, (response) => {
      if (response?.email) {
        setAuthStatus("signed-in");
        setUserEmail(response.email);
        setProfilePicture(response.profilePicture || null);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("semanticSearch", JSON.stringify(semanticSearch));
  }, [semanticSearch]);

  useEffect(() => {
    localStorage.setItem("fileLabeling", JSON.stringify(fileLabeling));
  }, [fileLabeling]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const handleAuthUpdated = (message: any) => {
      if (message.action === "authUpdated") {
        setAuthStatus("signed-in");
        setUserEmail(message.email);
        setProfilePicture(message.profilePicture || null);
        localStorage.setItem("authStatus", "signed-in");
        localStorage.setItem("userEmail", message.email);
        localStorage.setItem("profilePicture", message.profilePicture || "");
      }
    };
    chrome.runtime.onMessage.addListener(handleAuthUpdated);
    return () => chrome.runtime.onMessage.removeListener(handleAuthUpdated);
  }, []);

  useEffect(() => {
    const savedAuth = localStorage.getItem("authStatus");
    const savedEmail = localStorage.getItem("userEmail");
    const savedPic = localStorage.getItem("profilePicture");
    if (savedAuth === "signed-in" && savedEmail) {
      setAuthStatus("signed-in");
      setUserEmail(savedEmail);
      if (savedPic) setProfilePicture(savedPic);
    } else {
      handleSignIn();
    }
  }, []);

  // Organize view logic
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
        <div className="header-divider"></div>
        <div className="popup-content">
          <div className="back-button-container">
            <button
              className="back-button-small"
              onClick={handleBackToSettings}
            >
              <span className="back-text">Back</span>
            </button>
          </div>
          <Organize />
        </div>
      </div>
    );
  }

  // PresetsPage logic
  if (showPresets) {
    return (
      <PresetsPage
        onBackToSettings={() => {
          setShowPresets(false);
          setShowSettings(true);
        }}
      />
    );
  }

  // Settings page logic
  if (showSettings) {
    return (
      <div className={`popup-wrapper ${darkMode ? "dark" : ""}`}>
        <div className="popup-header">
          <img src="logo.png" alt="logo" className="popup-logo" />
          <div className="popup-title">
            <h2>Google Drive File Organizer</h2>
            <p>Settings</p>
          </div>
          <button
            className="back-button-small"
            onClick={() => {
              setShowSettings(false);
              setShowPresets(true);
            }}
          >
            <span className="back-text">Back</span>
          </button>
        </div>

        <div className="header-divider"></div>

        <div className="popup-content">
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
            <div
              className={`content-section ${tab === "content" ? "active" : ""}`}
            >
              <div className="setting-item">
                <span className="setting-label">
                  Enable Semantic File Search
                </span>
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
                <button
                  className="organize-button"
                  onClick={handleOrganizeClick}
                >
                  Organize
                </button>
              </div>
            </div>

            <div className={`user-section ${tab === "user" ? "active" : ""}`}>
              {authStatus !== "signed-in" && (
                <div className="warning">
                  <span className="warning-icon">⚠️</span>
                  User authentication is required
                </div>
              )}
              {authStatus === "signed-in" ? (
                <div className="signed-in-info">
                  <span className="setting-label">Signed in as</span>
                  <div className="user-profile">
                    <div className="user-info">
                      {profilePicture && (
                        <img src={profilePicture} className="user-avatar" />
                      )}
                      <span className="user-email">{userEmail}</span>
                    </div>
                    <button
                      className="sign-out-button"
                      onClick={() => setShowSignOutConfirm(true)}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="setting-label">
                    Sign in to access Google Drive
                  </span>
                  <button onClick={handleSignIn} className="sign-in-button">
                    Sign In
                  </button>
                </>
              )}
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
                      onChange={() => {
                        const newDarkMode = !darkMode;
                        setDarkMode(newDarkMode);
                        localStorage.setItem(
                          "darkMode",
                          JSON.stringify(newDarkMode)
                        );
                        chrome.runtime.sendMessage({
                          action: "darkModeChanged",
                          value: newDarkMode,
                        });
                      }}
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

          {showSignOutConfirm && (
            <div className="signout-modal">
              <div className="modal-content">
                <h3>Sign out of Google Account?</h3>
                <p>
                  You will be disconnected and unable to access your files until
                  you sign in again.
                </p>
                <div className="modal-buttons">
                  <button
                    className="cancel-button"
                    onClick={() => setShowSignOutConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-button"
                    onClick={handleConfirmSignOut}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Settings button
  return (
    <div className={`popup-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="popup-header">
        <img src="logo.png" alt="logo" className="popup-logo" />
        <div className="popup-title">
          <h2>Google Drive File Organizer</h2>
        </div>
      </div>

      <div className="header-divider"></div>

      <div className="popup-content center-content">
        <button
          className="settings-main-button"
          onClick={() => {
            setShowPresets(false);
            setShowSettings(true);
          }}
        >
          Open Settings
        </button>
      </div>
    </div>
  );
};
export default PopupApp;

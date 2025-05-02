import { useState, useEffect } from "react";
import "./PopupApp.css";

// File type filters
const fileTypeFilters = [
  {
    id: "docs",
    label: "Docs",
    mimeType: "application/vnd.google-apps.document",
  },
  {
    id: "sheets",
    label: "Sheets",
    mimeType: "application/vnd.google-apps.spreadsheet",
  },
  {
    id: "slides",
    label: "Slides",
    mimeType: "application/vnd.google-apps.presentation",
  },
  { id: "pdf", label: "PDF", mimeType: "application/pdf" },
  { id: "images", label: "Images", mimeType: "image/" },
  { id: "videos", label: "Videos", mimeType: "video/" },
  {
    id: "folders",
    label: "Folders",
    mimeType: "application/vnd.google-apps.folder",
  },
];

// Time period filters
const timePeriodFilters = [
  { id: "today", label: "Today", days: 1 },
  { id: "yesterday", label: "Yesterday", days: 2, startDays: 1 },
  { id: "last7days", label: "Last 7 days", days: 7 },
  { id: "last30days", label: "Last 30 days", days: 30 },
  { id: "last90days", label: "Last 3 months", days: 90 },
];

// Ownership filters
const ownershipFilters = [
  { id: "owned", label: "Owned by me" },
  { id: "shared_with_me", label: "Shared with me" },
  { id: "starred", label: "Starred" },
];

// File icons mapping
const getFileIcon = (mimeType: string) => {
  if (mimeType.includes("document")) {
    return "https://ssl.gstatic.com/docs/doclist/images/icon_11_document_list.png";
  } else if (mimeType.includes("spreadsheet")) {
    return "https://ssl.gstatic.com/docs/doclist/images/icon_11_spreadsheet_list.png";
  } else if (mimeType.includes("presentation")) {
    return "https://ssl.gstatic.com/docs/doclist/images/icon_11_presentation_list.png";
  } else if (mimeType.includes("pdf")) {
    return "https://ssl.gstatic.com/docs/doclist/images/icon_11_pdf_list.png";
  } else if (mimeType.includes("image")) {
    return "https://ssl.gstatic.com/docs/doclist/images/icon_11_image_list.png";
  } else if (mimeType.includes("video")) {
    return "https://ssl.gstatic.com/docs/doclist/images/icon_11_video_list.png";
  } else if (mimeType === "application/vnd.google-apps.folder") {
    return "https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.google-apps.folder";
  }
  return "https://ssl.gstatic.com/docs/doclist/images/icon_11_generic_list.png";
};

// Format file type label
const formatFileType = (mimeType: string) => {
  if (mimeType === "application/vnd.google-apps.folder") return "Folder";
  if (mimeType.includes("document")) return "Google Docs";
  if (mimeType.includes("spreadsheet")) return "Google Sheets";
  if (mimeType.includes("presentation")) return "Google Slides";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("image")) return "Image";
  if (mimeType.includes("video")) return "Video";
  return "File";
};

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Filter section component
interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="filter-section">
      <div
        className="filter-section-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="filter-section-title">{title}</div>
        <div className={`filter-section-icon ${expanded ? "expanded" : ""}`}>
          ▿
        </div>
      </div>
      <div className={`filter-section-content ${expanded ? "expanded" : ""}`}>
        {children}
      </div>
    </div>
  );
};

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  viewedByMeTime?: string;
  thumbnailLink?: string;
}

// Component for searching and filtering Google Drive files
const SearchDirectory = ({
  onBackToPresets,
}: {
  onBackToPresets: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState("");
  const [activeTypeFilters, setActiveTypeFilters] = useState<string[]>([]);
  const [activeTimeFilters, setActiveTimeFilters] = useState<string[]>([]);
  const [activeOwnershipFilters, setActiveOwnershipFilters] = useState<
    string[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    return JSON.parse(localStorage.getItem("darkMode") || "false");
  });
  const [initialSearchDone, setInitialSearchDone] = useState(false);

  // Listen for search progress updates from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === "searchProgress") {
        setResultCount(message.count);
        setSearchStatus(`Searching... ${message.count} files found so far`);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Listen for changes in storage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "darkMode") {
        setDarkMode(JSON.parse(e.newValue || "false"));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Initial search when component mounts
  useEffect(() => {
    if (!initialSearchDone) {
      handleSearch();
      setInitialSearchDone(true);
    }
  }, [initialSearchDone]);

  // Function to handle search with filters
  const handleSearch = () => {
    setLoading(true);
    setError(null);
    setSearchStatus("Searching...");
    setIsSearching(true);
    setResultCount(0);

    // Build query parameters
    const queryParams: Record<string, any> = {
      action: "searchDrive",
      query: query,
    };

    // Add type filters
    if (activeTypeFilters.length > 0) {
      const mimeTypeQuery = activeTypeFilters
        .map(
          (filterId) =>
            fileTypeFilters.find((f) => f.id === filterId)?.mimeType || ""
        )
        .filter(Boolean)
        .join(",");

      if (mimeTypeQuery) {
        queryParams.mimeType = mimeTypeQuery;
      }
    }

    // Add time filters
    if (activeTimeFilters.length > 0) {
      const timeQueries = activeTimeFilters
        .map(getDateRangeQuery)
        .filter(Boolean);
      if (timeQueries.length > 0) {
        queryParams.timeQuery = timeQueries.join(" or ");
      }
    }

    // Add ownership filters
    if (activeOwnershipFilters.length > 0) {
      const ownershipQueries = activeOwnershipFilters
        .map(getOwnershipQuery)
        .filter(Boolean);
      if (ownershipQueries.length > 0) {
        queryParams.ownershipQuery = ownershipQueries.join(" or ");
      }
    }

    chrome.runtime.sendMessage(queryParams, (response) => {
      setLoading(false);
      setIsSearching(false);
      if (response?.results) {
        setResults(response.results);
        setSearchStatus(
          `${response.results.length} file${
            response.results.length !== 1 ? "s" : ""
          } found`
        );
      } else if (response?.error) {
        setError(response.error);
        setSearchStatus("");
      } else {
        setResults([]);
        setSearchStatus("No files found");
      }
    });
  };

  // Function to get the file URL
  const getFileUrl = (file: GoogleDriveFile) => {
    // Get the base URL for the file
    const baseUrl =
      file.mimeType === "application/vnd.google-apps.folder"
        ? "https://drive.google.com/drive/folders/"
        : "https://drive.google.com/file/d/";
    return `${baseUrl}${file.id}`;
  };

  // Function to handle storage changes
  const handleStorageChange = (e: StorageEvent) => {
    // Update dark mode if storage changes
    if (e.key === "darkMode") {
      setDarkMode(JSON.parse(e.newValue || "false"));
    }
  };

  // Function to build date range for time filters
  const getDateRangeQuery = (timeFilterId: string) => {
    // Find the time filter
    const filter = timePeriodFilters.find((f) => f.id === timeFilterId);
    if (!filter) return "";

    // Get the current date
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    // Calculate the start and end dates
    if (filter.startDays) {
      // For filters like "yesterday" that have a specific start and end
      startDate.setDate(now.getDate() - filter.startDays);
      endDate.setDate(now.getDate() - (filter.startDays - 1));
      return `modifiedTime > '${startDate.toISOString()}' and modifiedTime < '${endDate.toISOString()}'`;
    } else {
      // For filters like "last 7 days"
      startDate.setDate(now.getDate() - filter.days);
      return `modifiedTime > '${startDate.toISOString()}'`;
    }
  };

  // Function to build ownership query
  const getOwnershipQuery = (ownershipFilterId: string) => {
    // Return the ownership query
    switch (ownershipFilterId) {
      case "owned":
        return "('me' in owners)";
      case "shared_with_me":
        return "sharedWithMe=true";
      case "starred":
        return "starred=true";
      default:
        return "";
    }
  };

  // Function to handle file type filter click
  const handleTypeFilterClick = (filterId: string) => {
    // Update the active type filters
    setActiveTypeFilters((prev) => {
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  };

  // Function to handle time filter click
  const handleTimeFilterClick = (filterId: string) => {
    // Update the active time filters
    setActiveTimeFilters((prev) => {
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  };

  // Function to handle ownership filter click
  const handleOwnershipFilterClick = (filterId: string) => {
    // Update the active ownership filters
    setActiveOwnershipFilters((prev) => {
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  };

  // Effect to perform search when filters change
  useEffect(() => {
    if (initialSearchDone) {
      handleSearch();
    }
  }, [activeTypeFilters, activeTimeFilters, activeOwnershipFilters]);

  return (
    <div className={`popup-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="popup-header">
        <img
          src="/logo.png"
          alt="Google Drive File Organizer"
          className="popup-logo"
        />
        <div className="popup-title">
          <h2>Search Directory</h2>
          <p>Find files in your Google Drive</p>
        </div>
        <div className="settings-nav">
          <button className="back-button-small" onClick={onBackToPresets}>
            <span className="back-text">Back</span>
          </button>
        </div>
      </div>

      <div className="header-divider"></div>

      <div className="popup-content">
        <div className="search-directory-container">
          {/* Search input and button */}
          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search Google Drive workspace"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              className="search-button"
              onClick={() => handleSearch()}
              disabled={loading}
            >
              {loading ? "..." : "Search"}
            </button>
          </div>

          {/* Search status indicator */}
          <div className="search-status">{searchStatus}</div>

          {/* Filter sections */}
          <div style={{ marginTop: 8 }}>
            <FilterSection title="File Type" defaultExpanded={false}>
              <div className="search-filters">
                {fileTypeFilters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-chip ${
                      activeTypeFilters.includes(filter.id) ? "active" : ""
                    }`}
                    onClick={() => handleTypeFilterClick(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Time Period">
              <div className="search-filters">
                {timePeriodFilters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-chip ${
                      activeTimeFilters.includes(filter.id) ? "active" : ""
                    }`}
                    onClick={() => handleTimeFilterClick(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Ownership & Status">
              <div className="search-filters">
                {ownershipFilters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-chip ${
                      activeOwnershipFilters.includes(filter.id) ? "active" : ""
                    }`}
                    onClick={() => handleOwnershipFilterClick(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </FilterSection>
          </div>

          {/* Divider between filters and results */}
          <div className="search-results-divider"></div>

          {/* Error message */}
          {error && (
            <div className="warning">
              <span className="warning-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              {isSearching && resultCount > 0 && (
                <div className="search-progress">
                  Found {resultCount} files so far...
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {!loading && (
            <div className="search-results">
              {results.length > 0
                ? results.map((file) => (
                    <div key={file.id} className="search-result-item">
                      <img
                        src={getFileIcon(file.mimeType)}
                        alt={formatFileType(file.mimeType)}
                        className="file-icon"
                      />
                      <div className="file-details">
                        <a
                          href={getFileUrl(file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-name"
                          title={file.name}
                        >
                          {file.name}
                        </a>
                        <div className="file-meta">
                          {formatFileType(file.mimeType)}
                          {file.viewedByMeTime &&
                            ` • Last viewed ${formatDate(file.viewedByMeTime)}`}
                        </div>
                      </div>
                    </div>
                  ))
                : query.trim() &&
                  !loading && (
                    <div className="no-results">
                      No files found matching your search.
                    </div>
                  )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDirectory;

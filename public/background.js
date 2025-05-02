// Listener for all extension background messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Function to fetch google account authentication
  if (request.action === "auth") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (!token) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError?.message || "Auth failed",
        });
        return;
      }
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((userInfo) => {
          chrome.runtime.sendMessage({
            action: "authUpdated",
            email: userInfo.email,
            profilePicture: userInfo.picture,
          });
          sendResponse({
            success: true,
            email: userInfo.email,
            profilePicture: userInfo.picture,
            name: userInfo.name,
          });
        })
        .catch((err) => {
          sendResponse({
            success: false,
            error: "Failed to fetch user info",
          });
        });
    });
    return true;
  }

  // Function to search the user's Google Drive (with pagination)
  if (request.action === "searchDrive") {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (!token) {
        sendResponse({
          error: chrome.runtime.lastError?.message || "Auth token not found",
        });
        return;
      }

      // Store all results here
      let allFiles = [];

      // Function to fetch a page of results
      const fetchPage = (pageToken = null) => {
        const params = {
          fields:
            "nextPageToken, files(id,name,mimeType,viewedByMeTime,thumbnailLink,owners,shared,starred)",
          orderBy: "viewedByMeTime desc",
          pageSize: "1000",
          spaces: "drive",
          corpora: "user",
        };

        // Add page token if we have one
        if (pageToken) {
          params.pageToken = pageToken;
        }

        // Build the query string
        let queryParts = [];

        // Add text search
        if (request.query) {
          queryParts.push(`name contains '${request.query}'`);
        }

        // Handle multiple mime types (comma-separated)
        if (request.mimeType) {
          const mimeTypes = request.mimeType.split(",");
          if (mimeTypes.length > 0) {
            const mimeTypeQueries = mimeTypes.map(
              (type) => `mimeType contains '${type}'`
            );
            queryParts.push(`(${mimeTypeQueries.join(" or ")})`);
          }
        }

        // Handle time period filters
        if (request.timeQuery) {
          queryParts.push(`(${request.timeQuery})`);
        }

        // Handle ownership filters
        if (request.ownershipQuery) {
          queryParts.push(`(${request.ownershipQuery})`);
        }

        // Combine all query parts with AND
        if (queryParts.length > 0) {
          params.q = queryParts.join(" and ");
        }

        const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams(
          params
        ).toString()}`;

        fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              sendResponse({ error: data.error.message });
            } else {
              allFiles = [...allFiles, ...data.files];

              if (data.nextPageToken) {
                chrome.runtime.sendMessage({
                  action: "searchProgress",
                  count: allFiles.length,
                  hasMoreResults: true,
                });

                fetchPage(data.nextPageToken);
              } else {
                sendResponse({ results: allFiles });
              }
            }
          })
          .catch((err) => {
            sendResponse({ error: err.message });
          });
      };

      fetchPage();
      return true;
    });
    return true;
  }

  // Function to update dark mode on all tabs
  if (request.action === "darkModeChanged") {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateDarkMode",
            value: request.value,
          });
        }
      }
    });
    return true;
  }

  // Function to handle unknown actions
  sendResponse({ error: "Unknown action" });
});

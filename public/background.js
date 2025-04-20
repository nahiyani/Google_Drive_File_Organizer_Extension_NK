chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "auth") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (token) {
        sendResponse({ token });
      } else {
        sendResponse({
          error: chrome.runtime.lastError?.message || "Auth failed",
        });
      }
    });
    return true;
  }

  if (request.action === "searchDrive") {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (!token) {
        sendResponse({
          error: chrome.runtime.lastError?.message || "Auth token not found",
        });
        return;
      }

      const params = {
        fields: "files(id,name,mimeType,modifiedTime)",
        orderBy: "modifiedTime desc",
        pageSize: "1000",
      };

      let query = "";

      if (request.query) {
        query += `name contains '${request.query}'`;
      }

      if (request.recent) {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        const iso = date.toISOString();
        query += query
          ? ` and modifiedTime > '${iso}'`
          : `modifiedTime > '${iso}'`;
      }

      if (request.mimeType) {
        query += query
          ? ` and mimeType contains '${request.mimeType}'`
          : `mimeType contains '${request.mimeType}'`;
      }

      if (query) {
        params.q = query;
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
            sendResponse({ results: data.files });
          }
        })
        .catch((err) => {
          sendResponse({ error: err.message });
        });

      return true;
    });

    return true;
  }

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

  sendResponse({ error: "Unknown action" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "auth") {
    // Check if the user is already authenticated (OAuth token exists)
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (!token) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError?.message || "Auth failed",
        });
        return;
      }

      // Fetch user information from Google's UserInfo API
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
            email: data.email,
            profilePicture: data.picture,
            name: data.name,
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
});

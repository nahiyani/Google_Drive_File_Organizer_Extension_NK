chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "auth") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("Auth error:", chrome.runtime.lastError);
        sendResponse({ success: false });
      } else {
        console.log("Token:", token);
        sendResponse({ success: true, token });
      }
    });
    return true;
  }
});

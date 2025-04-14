let contentPort = null;

// Listen for connection attempts from content scripts
chrome.runtime.onConnect.addListener((port) => {
  console.log("Connected to port:", port);

  if (port.name === "content_channel") {
    contentPort = port;

    port.onMessage.addListener((msg) => {
      console.log("Message from content script:", msg);

      if (msg.type === "ping") {
        port.postMessage({ type: "pong" });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log("Content port disconnected");
      contentPort = null;
    });
  }
});

// Listen for one-time messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Received message:", msg, "from:", sender);
  
  if (msg.action === "content_ready") {
    console.log("Content script is ready");
    sendResponse({ status: "acknowledged" });
    return true; // Keep the messaging channel open for async response
  }

  if (msg.action === "auth") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("Auth error:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("Token obtained successfully");
        sendResponse({ success: true, token });
      }
    });
    return true; // Keep the messaging channel open for async response
  }
  
  // Always send a response, even if just acknowledging the message
  sendResponse({ status: "message_received", action: msg.action });
  return true;
});

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated");
});
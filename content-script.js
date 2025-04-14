// This is a simple content script that initializes the connection
// with the background script and renders our React component

console.log("Google Drive File Organizer content script loaded");

// Let the background script know we're ready
chrome.runtime.sendMessage({ action: "content_ready" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error("Error connecting to background script:", chrome.runtime.lastError);
    return;
  }
  
  console.log("Background script acknowledged content script:", response);
  
  // Create our container for the React app
  const container = document.createElement('div');
  container.id = 'gdfo-container';
  document.body.appendChild(container);
  
  // The actual React component will be mounted via your build process
  // Here we're just creating the container for it
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  sendResponse({ status: "received" });
  return true;
});

// Try establishing a port connection
try {
  const port = chrome.runtime.connect({ name: "content_channel" });
  
  port.onMessage.addListener((msg) => {
    console.log("Received from background via port:", msg);
  });
  
  port.onDisconnect.addListener(() => {
    console.log("Port disconnected");
  });
  
  // Send an initial ping
  port.postMessage({ type: "ping" });
} catch (error) {
  console.error("Failed to establish port connection:", error);
}
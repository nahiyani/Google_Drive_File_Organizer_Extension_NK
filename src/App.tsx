import "./App.css";

function App() {
  return (
    <>
      <img
        src={chrome.runtime.getURL("icons/logo.png")}
        className="App-logo"
        alt="logo"
      />
      <h1>Google Drive File Organizer</h1>
    </>
  );
}

export default App;

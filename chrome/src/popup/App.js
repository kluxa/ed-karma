import React from 'react'
import './App.css'

function App() {
  const handleAnalyticsClick = () => {
    browser.tabs.create({
      url: "analytics.html",
    });
  };

  const handleSettingsClick = () => {
    browser.tabs.create({
      url: "settings.html",
    });
  };

  return (
    <div id="popup-content">
      <img
        src="/icons/ed-karma.png" alt="logo"
        className="logo"
      />

      <h2 className="title">Ed Karma</h2>

      <button onClick={handleAnalyticsClick}>
        Analytics
      </button>

      <button onClick={handleSettingsClick}>
        Settings
      </button>
    </div>
  );
}

export default App

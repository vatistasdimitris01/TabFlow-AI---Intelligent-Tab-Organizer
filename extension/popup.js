document.addEventListener('DOMContentLoaded', () => {
  const launchBtn = document.getElementById('launch-dashboard');

  // Replace this with your actual Vercel deployment URL
  const DASHBOARD_URL = "https://your-app-name.vercel.app";

  launchBtn.addEventListener('click', () => {
    // Check if dashboard is already open
    chrome.tabs.query({ url: DASHBOARD_URL + "/*" }, (tabs) => {
      if (tabs.length > 0) {
        // Focus existing tab
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // Open new tab
        chrome.tabs.create({ url: DASHBOARD_URL });
      }
    });
  });
});
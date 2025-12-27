
document.addEventListener('DOMContentLoaded', () => {
  const tabCountEl = document.getElementById('tab-count');
  const openBtn = document.getElementById('open-dashboard');

  // Fetch tab count on open
  chrome.tabs.query({}, (tabs) => {
    tabCountEl.textContent = tabs.length;
  });

  // Open the dashboard web app
  openBtn.addEventListener('click', () => {
    // In a real production scenario, this would be your hosted URL
    // For local development, we'll try to find the existing tab or open a new one
    const dashboardUrl = "http://localhost:3000"; // Placeholder for your dev environment
    
    chrome.tabs.query({ url: dashboardUrl + "/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: dashboardUrl });
      }
    });
  });
});

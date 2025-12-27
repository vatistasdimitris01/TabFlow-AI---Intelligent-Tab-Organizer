
// Listen for messages from the Web Page
window.addEventListener('message', (event) => {
  if (event.data?.source !== 'tabflow-page') return;

  const { action, data } = event.data;

  if (action === 'PING') {
    window.postMessage({ source: 'tabflow-extension', action: 'PONG' }, '*');
    return;
  }

  // Forward to Background Service Worker
  chrome.runtime.sendMessage({ action, data }, (response) => {
    if (response?.tabs) {
      window.postMessage({ 
        source: 'tabflow-extension', 
        action: 'TABS_UPDATE', 
        data: response.tabs 
      }, '*');
    }
  });
});

// Listen for messages from Background and push to Web Page
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'TABS_UPDATE') {
    window.postMessage({ 
      source: 'tabflow-extension', 
      action: 'TABS_UPDATE', 
      data: message.data 
    }, '*');
  }
});

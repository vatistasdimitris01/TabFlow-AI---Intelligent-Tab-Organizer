
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_TABS') {
    chrome.tabs.query({}, (tabs) => {
      sendResponse({ 
        tabs: tabs.map(t => ({
          id: t.id.toString(),
          url: t.url,
          title: t.title,
          favIconUrl: t.favIconUrl,
          groupId: t.groupId
        })) 
      });
    });
    return true; // Keep channel open
  }

  if (request.action === 'TAB_ACTION') {
    const { action, tabId } = request.data;
    if (action === 'CLOSE') {
      chrome.tabs.remove(tabId);
    } else if (action === 'FOCUS') {
      chrome.tabs.update(tabId, { active: true });
      chrome.tabs.get(tabId, (tab) => {
        chrome.windows.update(tab.windowId, { focused: true });
      });
    }
  }

  if (request.action === 'APPLY_GROUPS') {
    const groups = request.data;
    groups.forEach(async (group) => {
      const tabIds = group.tabIds.map(id => parseInt(id));
      const groupId = await chrome.tabs.group({ tabIds });
      chrome.tabGroups.update(groupId, { 
        title: group.name, 
        color: mapToChromeColor(group.color) 
      });
    });
  }
});

// Chrome only supports specific colors for tab groups
function mapToChromeColor(hex) {
  const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Push updates when tabs change
chrome.tabs.onUpdated.addListener(() => broadcastTabs());
chrome.tabs.onRemoved.addListener(() => broadcastTabs());

async function broadcastTabs() {
  const tabs = await chrome.tabs.query({});
  const tabData = tabs.map(t => ({
    id: t.id.toString(),
    url: t.url,
    title: t.title,
    favIconUrl: t.favIconUrl,
    groupId: t.groupId
  }));
  
  chrome.tabs.query({ active: true }, (activeTabs) => {
    activeTabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'TABS_UPDATE', 
        data: tabData 
      }).catch(() => {});
    });
  });
}

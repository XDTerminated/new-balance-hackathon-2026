// Open the side panel and close the popup
chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
window.close();

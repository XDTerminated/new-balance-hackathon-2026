// Enable side panel on newbalance.com
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRODUCTS_SCRAPED') {
    // Store scraped products from content script
    chrome.storage.local.set({ products: message.products });
    sendResponse({ success: true });
  }

  if (message.type === 'GET_PRODUCTS') {
    // Side panel requesting products
    chrome.storage.local.get('products', (data) => {
      sendResponse({ products: data.products || [] });
    });
    return true; // keep channel open for async response
  }
});

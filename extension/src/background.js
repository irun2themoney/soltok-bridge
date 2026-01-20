// SolTok Bridge - Background Service Worker

// Store current product data
let currentProduct = null;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SolTok Background] Message received:', message.type);

  if (message.type === 'OPEN_CHECKOUT') {
    currentProduct = message.product;
    
    // Store product data
    chrome.storage.local.set({ currentProduct: message.product }, () => {
      console.log('[SolTok Background] Product stored:', message.product);
    });

    // Open the popup programmatically
    // Note: In MV3, we can't open popup directly, but we can use action.openPopup() in some contexts
    // For now, we'll notify the popup when it opens
    
    sendResponse({ success: true });
  }

  if (message.type === 'GET_PRODUCT') {
    chrome.storage.local.get(['currentProduct'], (result) => {
      sendResponse({ product: result.currentProduct || null });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'CLEAR_PRODUCT') {
    currentProduct = null;
    chrome.storage.local.remove(['currentProduct']);
    sendResponse({ success: true });
  }

  if (message.type === 'SAVE_ORDER') {
    // Save order to storage for history
    chrome.storage.local.get(['orders'], (result) => {
      const orders = result.orders || [];
      orders.unshift(message.order);
      // Keep only last 50 orders
      if (orders.length > 50) orders.pop();
      chrome.storage.local.set({ orders }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.type === 'GET_ORDERS') {
    chrome.storage.local.get(['orders'], (result) => {
      sendResponse({ orders: result.orders || [] });
    });
    return true;
  }

  return true;
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This only fires if there's no popup defined
  // Since we have a popup, this won't fire
});

// On install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[SolTok] Extension installed');
    // Could open onboarding page here
  } else if (details.reason === 'update') {
    console.log('[SolTok] Extension updated');
  }
});

console.log('[SolTok Background] Service worker started');

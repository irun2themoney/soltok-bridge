// SolTok Bridge - Content Script
// Runs on TikTok Shop product pages to extract data and inject buy button

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    buttonId: 'soltok-bridge-button',
    checkInterval: 1000,
    maxRetries: 30,
  };

  // State
  let currentProduct = null;
  let buttonInjected = false;
  let retryCount = 0;

  // Check if we're on a TikTok Shop product page
  function isProductPage() {
    const url = window.location.href;
    return url.includes('/product/') || url.includes('product_id=');
  }

  // Extract product ID from URL
  function getProductId() {
    const url = window.location.href;
    const match = url.match(/\/product\/(\d+)/);
    if (match) return match[1];
    
    const params = new URLSearchParams(window.location.search);
    return params.get('product_id');
  }

  // Extract seller handle from URL
  function getSellerHandle() {
    const url = window.location.href;
    const match = url.match(/@([^/]+)/);
    return match ? match[1] : null;
  }

  // Extract product data from the page DOM
  function extractProductData() {
    const data = {
      id: getProductId(),
      seller: getSellerHandle(),
      title: null,
      price: null,
      originalPrice: null,
      imageUrl: null,
      currency: 'USD',
      url: window.location.href,
    };

    // Strategy 1: Look for common product title selectors
    const titleSelectors = [
      'h1',
      '[data-e2e="product-title"]',
      '[class*="ProductTitle"]',
      '[class*="product-title"]',
      '[class*="pdp-title"]',
    ];
    
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 3) {
        data.title = el.textContent.trim();
        break;
      }
    }

    // Strategy 2: Look for price - TikTok uses various formats
    const priceSelectors = [
      '[data-e2e="product-price"]',
      '[class*="ProductPrice"]',
      '[class*="product-price"]',
      '[class*="pdp-price"]',
      '[class*="Price"] span',
      '[class*="price"]',
    ];

    for (const selector of priceSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent || '';
        // Match various price formats: $19.99, US$19.99, 19.99 USD
        const priceMatch = text.match(/(?:US?\$|USD\s*)(\d+(?:\.\d{2})?)/i);
        if (priceMatch) {
          data.price = parseFloat(priceMatch[1]);
          break;
        }
        // Try just number with nearby $ sign
        const numMatch = text.match(/(\d+(?:\.\d{2})?)/);
        if (numMatch && text.includes('$')) {
          data.price = parseFloat(numMatch[1]);
          break;
        }
      }
      if (data.price) break;
    }

    // Also look for price in any element containing $ followed by numbers
    if (!data.price) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.children.length === 0) { // Leaf nodes only
          const text = el.textContent || '';
          if (text.length < 20) { // Likely a price, not a description
            const match = text.match(/\$(\d+(?:\.\d{2})?)/);
            if (match) {
              const price = parseFloat(match[1]);
              if (price > 0 && price < 10000) { // Reasonable price range
                data.price = price;
                break;
              }
            }
          }
        }
      }
    }

    // Strategy 3: Look for product image
    const imageSelectors = [
      '[data-e2e="product-image"] img',
      '[class*="ProductImage"] img',
      '[class*="product-image"] img',
      '[class*="pdp-image"] img',
      '[class*="gallery"] img',
      'img[src*="tiktokcdn"]',
    ];

    for (const selector of imageSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const src = el.src || el.getAttribute('data-src');
        if (src && !src.includes('placeholder') && !src.includes('avatar')) {
          data.imageUrl = src;
          break;
        }
      }
    }

    // Fallback: Find the largest image on the page (likely the product)
    if (!data.imageUrl) {
      const images = Array.from(document.querySelectorAll('img'))
        .filter(img => {
          const src = img.src || '';
          return src.includes('tiktokcdn') && 
                 !src.includes('avatar') && 
                 !src.includes('profile') &&
                 img.width > 100;
        })
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      
      if (images.length > 0) {
        data.imageUrl = images[0].src;
      }
    }

    // Validate we have minimum required data
    if (data.price && data.price > 0) {
      return data;
    }

    return null;
  }

  // Create the "Pay with USDC" button
  function createButton() {
    const button = document.createElement('button');
    button.id = CONFIG.buttonId;
    button.className = 'soltok-bridge-btn';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="soltok-icon">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v12M6 12h12"/>
      </svg>
      <span class="soltok-text">Pay with USDC</span>
      <span class="soltok-price"></span>
    `;
    
    button.addEventListener('click', handleButtonClick);
    return button;
  }

  // Find the best place to inject our button
  function findButtonContainer() {
    // Look for TikTok's buy/add to cart button to place ours nearby
    const buyButtonSelectors = [
      '[data-e2e="product-buy-button"]',
      '[data-e2e="add-to-cart-button"]',
      '[class*="BuyButton"]',
      '[class*="buy-button"]',
      '[class*="AddToCart"]',
      'button[class*="checkout"]',
    ];

    for (const selector of buyButtonSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.parentElement;
      }
    }

    // Fallback: Look for any prominent button container
    const containers = document.querySelectorAll('[class*="action"], [class*="Action"], [class*="button-container"]');
    if (containers.length > 0) {
      return containers[0];
    }

    return null;
  }

  // Inject the button into the page
  function injectButton() {
    // Don't inject if already exists
    if (document.getElementById(CONFIG.buttonId)) {
      return true;
    }

    const container = findButtonContainer();
    if (!container) {
      console.log('[SolTok] Could not find button container');
      return false;
    }

    const button = createButton();
    container.appendChild(button);
    
    // Update button with price if we have product data
    if (currentProduct && currentProduct.price) {
      updateButtonPrice(currentProduct.price);
    }

    console.log('[SolTok] Button injected successfully');
    return true;
  }

  // Update the button to show the price
  function updateButtonPrice(price) {
    const priceEl = document.querySelector(`#${CONFIG.buttonId} .soltok-price`);
    if (priceEl && price) {
      const totalWithFee = (price * 1.05).toFixed(2);
      priceEl.textContent = `$${totalWithFee} USDC`;
    }
  }

  // Handle button click - send product data to extension popup
  function handleButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!currentProduct) {
      currentProduct = extractProductData();
    }

    if (!currentProduct || !currentProduct.price) {
      alert('Could not detect product price. Please refresh the page and try again.');
      return;
    }

    console.log('[SolTok] Product data:', currentProduct);

    // Send message to background script to open checkout
    chrome.runtime.sendMessage({
      type: 'OPEN_CHECKOUT',
      product: currentProduct,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SolTok] Error:', chrome.runtime.lastError);
      }
    });
  }

  // Main initialization
  function init() {
    if (!isProductPage()) {
      console.log('[SolTok] Not a product page, skipping');
      return;
    }

    console.log('[SolTok] Product page detected, initializing...');

    // Try to extract product data and inject button
    function tryInit() {
      currentProduct = extractProductData();
      
      if (currentProduct) {
        console.log('[SolTok] Product found:', currentProduct);
        
        if (!buttonInjected) {
          buttonInjected = injectButton();
        }
        
        if (buttonInjected && currentProduct.price) {
          updateButtonPrice(currentProduct.price);
        }
      } else {
        retryCount++;
        if (retryCount < CONFIG.maxRetries) {
          console.log(`[SolTok] Product not found yet, retry ${retryCount}/${CONFIG.maxRetries}`);
          setTimeout(tryInit, CONFIG.checkInterval);
        } else {
          console.log('[SolTok] Could not find product data after max retries');
        }
      }
    }

    // Start trying after a short delay to let page load
    setTimeout(tryInit, 500);
  }

  // Watch for URL changes (TikTok is a SPA)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[SolTok] URL changed, reinitializing...');
      buttonInjected = false;
      retryCount = 0;
      currentProduct = null;
      
      // Remove old button if exists
      const oldButton = document.getElementById(CONFIG.buttonId);
      if (oldButton) oldButton.remove();
      
      // Reinitialize
      setTimeout(init, 500);
    }
  });

  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

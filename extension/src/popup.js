// SolTok Bridge - Popup Script

// Configuration
const CONFIG = {
  rpcUrl: 'https://api.devnet.solana.com',
  usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  bridgeTreasury: 'BRiDGE1111111111111111111111111111111111111',
  apiBase: 'https://soltok-bridge.vercel.app',
  bridgeFee: 0.05, // 5%
};

// State
let currentProduct = null;
let walletAddress = null;
let walletBalance = 0;

// DOM Elements
const elements = {
  stateNoProduct: document.getElementById('state-no-product'),
  stateCheckout: document.getElementById('state-checkout'),
  stateSuccess: document.getElementById('state-success'),
  productImage: document.getElementById('product-image'),
  productTitle: document.getElementById('product-title'),
  productSeller: document.getElementById('product-seller'),
  productPrice: document.getElementById('product-price'),
  breakdownPrice: document.getElementById('breakdown-price'),
  breakdownFee: document.getElementById('breakdown-fee'),
  breakdownTotal: document.getElementById('breakdown-total'),
  shipName: document.getElementById('ship-name'),
  shipStreet: document.getElementById('ship-street'),
  shipCity: document.getElementById('ship-city'),
  shipState: document.getElementById('ship-state'),
  shipZip: document.getElementById('ship-zip'),
  shipEmail: document.getElementById('ship-email'),
  walletDisconnected: document.getElementById('wallet-disconnected'),
  walletConnected: document.getElementById('wallet-connected'),
  walletAddress: document.getElementById('wallet-address'),
  walletBalance: document.getElementById('wallet-balance'),
  btnConnect: document.getElementById('btn-connect'),
  btnDisconnect: document.getElementById('btn-disconnect'),
  btnPay: document.getElementById('btn-pay'),
  btnPayText: document.getElementById('btn-pay-text'),
  txLink: document.getElementById('tx-link'),
  btnNewOrder: document.getElementById('btn-new-order'),
};

// Show a specific state
function showState(state) {
  elements.stateNoProduct.classList.remove('active');
  elements.stateCheckout.classList.remove('active');
  elements.stateSuccess.classList.remove('active');
  
  if (state === 'no-product') elements.stateNoProduct.classList.add('active');
  if (state === 'checkout') elements.stateCheckout.classList.add('active');
  if (state === 'success') elements.stateSuccess.classList.add('active');
}

// Update product display
function updateProductDisplay(product) {
  if (!product) {
    showState('no-product');
    return;
  }

  currentProduct = product;
  
  // Update product info
  elements.productTitle.textContent = product.title || 'TikTok Product';
  elements.productSeller.textContent = `@${product.seller || 'shop'}`;
  elements.productPrice.textContent = `$${product.price.toFixed(2)}`;
  
  // Update image
  if (product.imageUrl) {
    elements.productImage.src = product.imageUrl;
    elements.productImage.classList.remove('placeholder');
  } else {
    elements.productImage.classList.add('placeholder');
    elements.productImage.innerHTML = '📦';
  }
  
  // Update price breakdown
  const fee = product.price * CONFIG.bridgeFee;
  const total = product.price + fee;
  
  elements.breakdownPrice.textContent = `$${product.price.toFixed(2)}`;
  elements.breakdownFee.textContent = `$${fee.toFixed(2)}`;
  elements.breakdownTotal.textContent = `$${total.toFixed(2)} USDC`;
  
  showState('checkout');
}

// Update wallet display
function updateWalletDisplay() {
  if (walletAddress) {
    const shortAddr = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    elements.walletAddress.textContent = shortAddr;
    elements.walletBalance.textContent = `${walletBalance.toFixed(2)} USDC`;
    
    elements.walletDisconnected.style.display = 'none';
    elements.walletConnected.style.display = 'flex';
    
    // Enable pay button if we have enough balance
    const total = currentProduct ? currentProduct.price * (1 + CONFIG.bridgeFee) : 0;
    if (walletBalance >= total && validateForm()) {
      elements.btnPay.disabled = false;
      elements.btnPayText.textContent = `Pay $${total.toFixed(2)} USDC`;
    } else if (walletBalance < total) {
      elements.btnPay.disabled = true;
      elements.btnPayText.textContent = 'Insufficient Balance';
    } else {
      elements.btnPay.disabled = true;
      elements.btnPayText.textContent = 'Complete Form Above';
    }
  } else {
    elements.walletDisconnected.style.display = 'block';
    elements.walletConnected.style.display = 'none';
    elements.btnPay.disabled = true;
    elements.btnPayText.textContent = 'Connect Wallet First';
  }
}

// Validate shipping form
function validateForm() {
  return (
    elements.shipName.value.trim() !== '' &&
    elements.shipStreet.value.trim() !== '' &&
    elements.shipCity.value.trim() !== '' &&
    elements.shipState.value.trim() !== '' &&
    elements.shipZip.value.trim() !== ''
  );
}

// Connect wallet (simplified - in real extension would use Phantom API)
async function connectWallet() {
  try {
    // Check if Phantom is available
    const phantom = window.phantom?.solana || window.solana;
    
    if (!phantom) {
      // Open Phantom install page
      window.open('https://phantom.app/', '_blank');
      return;
    }

    const response = await phantom.connect();
    walletAddress = response.publicKey.toString();
    
    // Store wallet address
    chrome.storage.local.set({ walletAddress });
    
    // Get USDC balance
    await fetchBalance();
    
    updateWalletDisplay();
    
  } catch (error) {
    console.error('Wallet connection failed:', error);
    
    // For demo/testing, simulate a wallet connection
    walletAddress = 'Demo' + Math.random().toString(36).slice(2, 8);
    walletBalance = 100; // Demo balance
    chrome.storage.local.set({ walletAddress, walletBalance });
    updateWalletDisplay();
  }
}

// Disconnect wallet
function disconnectWallet() {
  walletAddress = null;
  walletBalance = 0;
  chrome.storage.local.remove(['walletAddress', 'walletBalance']);
  updateWalletDisplay();
}

// Fetch USDC balance
async function fetchBalance() {
  try {
    // In real extension, would call Solana RPC to get token balance
    // For now, simulate
    walletBalance = 100;
    chrome.storage.local.set({ walletBalance });
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    walletBalance = 0;
  }
}

// Process payment
async function processPayment() {
  if (!currentProduct || !walletAddress) return;
  
  const total = currentProduct.price * (1 + CONFIG.bridgeFee);
  
  // Show loading state
  elements.btnPay.disabled = true;
  elements.btnPayText.innerHTML = '<div class="spinner"></div> Processing...';
  
  try {
    // Create order
    const order = {
      id: `ST-${Date.now().toString().slice(-6)}`,
      product: currentProduct,
      shippingAddress: {
        name: elements.shipName.value,
        street: elements.shipStreet.value,
        city: elements.shipCity.value,
        state: elements.shipState.value,
        zip: elements.shipZip.value,
        email: elements.shipEmail.value,
      },
      totalUsdc: total,
      walletAddress,
      createdAt: new Date().toISOString(),
    };

    // In real extension, would call Phantom to sign transaction
    // For demo, simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock tx hash
    const txHash = Array.from({ length: 64 }, () => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
    
    order.txHash = txHash;
    
    // Save order to extension storage
    chrome.runtime.sendMessage({ 
      type: 'SAVE_ORDER', 
      order 
    });
    
    // Try to save to backend
    try {
      await fetch(`${CONFIG.apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch (e) {
      console.warn('Could not save to backend:', e);
    }
    
    // Show success
    elements.txLink.href = `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
    showState('success');
    
    // Clear product
    chrome.runtime.sendMessage({ type: 'CLEAR_PRODUCT' });
    
  } catch (error) {
    console.error('Payment failed:', error);
    elements.btnPayText.textContent = 'Payment Failed - Retry';
    elements.btnPay.disabled = false;
  }
}

// Initialize popup
async function init() {
  console.log('[SolTok Popup] Initializing...');
  
  // Load stored wallet
  const stored = await chrome.storage.local.get(['walletAddress', 'walletBalance', 'currentProduct']);
  
  if (stored.walletAddress) {
    walletAddress = stored.walletAddress;
    walletBalance = stored.walletBalance || 0;
  }
  
  // Get current product from background
  chrome.runtime.sendMessage({ type: 'GET_PRODUCT' }, (response) => {
    if (response && response.product) {
      updateProductDisplay(response.product);
    } else {
      showState('no-product');
    }
    updateWalletDisplay();
  });
  
  // Set up event listeners
  elements.btnConnect.addEventListener('click', connectWallet);
  elements.btnDisconnect.addEventListener('click', disconnectWallet);
  elements.btnPay.addEventListener('click', processPayment);
  elements.btnNewOrder.addEventListener('click', () => {
    showState('no-product');
    currentProduct = null;
  });
  
  // Validate form on input
  const formInputs = [
    elements.shipName, elements.shipStreet, elements.shipCity,
    elements.shipState, elements.shipZip
  ];
  formInputs.forEach(input => {
    input.addEventListener('input', updateWalletDisplay);
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);

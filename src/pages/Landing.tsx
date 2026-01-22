/**
 * Landing Page - TikTok Link to Purchase
 * 
 * Users paste a TikTok Shop link, verify the product, and checkout with USDC/SOL
 */

import React, { useState } from 'react';
import { ArrowRightLeft, Link2, CheckCircle2, Loader2, Wallet, X, ExternalLink } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { getProductFromUrl } from '@/services/geminiService';
import { CheckoutModal, ManualProductEntry, TikTokProductViewer } from '@/components';
import { TikTokProduct } from '@/types';
import { NETWORK_CONFIG, calculateTotalWithFee } from '@/config';
import { useToast } from '@/components/Toast';

const Landing: React.FC = () => {
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [product, setProduct] = useState<TikTokProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showProductViewer, setShowProductViewer] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { success: showSuccess, error: showError } = useToast();

  const handleVerifyProduct = async () => {
    if (!tiktokUrl.trim()) {
      showError('Please enter a TikTok Shop link');
      return;
    }

    // Enhanced URL validation
    const urlPattern = /^https?:\/\/(www\.)?(tiktok\.com|shop\.tiktok\.com)/i;
    if (!urlPattern.test(tiktokUrl)) {
      showError('Please enter a valid TikTok Shop URL (e.g., https://www.tiktok.com/@shop/product/...)');
      return;
    }

    setLoading(true);
    setVerificationError(null);
    try {
      // Show loading message - scraper can take 10-30 seconds
      const verifiedProduct = await getProductFromUrl(tiktokUrl);
      
      // Validate product data
      if (!verifiedProduct || !verifiedProduct.title || !verifiedProduct.price) {
        // If product needs manual entry, show manual entry form
        if ((verifiedProduct as any)?._needsManualEntry) {
          setShowManualEntry(true);
          return;
        }
        throw new Error('Product data incomplete. The link may not be a valid product page.');
      }
      
      setProduct(verifiedProduct);
      showSuccess('Product verified! Ready to checkout.');
    } catch (error: any) {
      console.error('Product verification failed:', error);
      
      // User-friendly error messages with scraper-specific handling
      let errorMessage = 'Failed to verify product. Please check the link and try again.';
      if (error.message) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes('timeout') || errMsg.includes('abort')) {
          errorMessage = 'Verification is taking longer than expected. The system is trying an alternative method. Please wait or try again.';
        } else if (errMsg.includes('scraper') && errMsg.includes('failed')) {
          errorMessage = 'Advanced verification method failed. Trying alternative method...';
        } else if (errMsg.includes('both scraper and gemini') || errMsg.includes('fallback failed')) {
          errorMessage = 'Unable to verify product automatically. You can enter the product details manually.';
          // Show manual entry option
          setTimeout(() => setShowManualEntry(true), 2000);
        } else if (errMsg.includes('network') || errMsg.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errMsg.includes('not found') || errMsg.includes('404')) {
          errorMessage = 'Product not found. Please check the link is correct.';
        } else if (errMsg.includes('api') || errMsg.includes('key')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (errMsg.includes('invalid') || errMsg.includes('format')) {
          errorMessage = 'Invalid product link format. Please use a TikTok Shop product URL.';
        } else if (errMsg.includes('incomplete')) {
          errorMessage = 'Product data incomplete. The link may not be a valid product page.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(errorMessage);
      setVerificationError(errorMessage);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryVerification = () => {
    setVerificationError(null);
    handleVerifyProduct();
  };

  const handleClearProduct = () => {
    setProduct(null);
    setTiktokUrl('');
    setVerificationError(null);
  };

  const handleCheckout = () => {
    if (!product) return;
    
    if (!connected) {
      showError('Please connect your wallet first');
      return;
    }

    setShowCheckout(true);
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
  };

  const handleCheckoutComplete = () => {
    setShowCheckout(false);
    setProduct(null);
    setTiktokUrl('');
    showSuccess('Order placed successfully!');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <ArrowRightLeft className="w-5 h-5 text-black" />
            </div>
            <span className="font-heading text-xl font-bold">SolTok<span className="text-emerald-500">Bridge</span></span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-16">
          <div className="text-center space-y-6 relative z-10">
            <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight leading-[1.1]">
              Pay for TikTok Shop<br/>with <span className="text-emerald-400">Solana</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Paste any TikTok Shop product link and checkout with USDC or SOL. No extension needed.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-2xl mx-auto px-4 md:px-8 pb-16">
        {/* TikTok Link Input */}
        <div className="glass rounded-2xl p-6 md:p-8 border-emerald-500/20 mb-8">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              TikTok Shop Product Link
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerifyProduct()}
                  placeholder="https://www.tiktok.com/@shop/product/..."
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    if (tiktokUrl.trim()) {
                      setShowProductViewer(true);
                    }
                  }}
                  disabled={!tiktokUrl.trim()}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 text-sm sm:text-base"
                >
                  <ExternalLink className="w-5 h-5" />
                  View Product
                </button>
                <button
                  onClick={handleVerifyProduct}
                  disabled={loading || !tiktokUrl.trim()}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 text-sm sm:text-base border border-white/10"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Verifying...</span>
                      <span className="sm:hidden">Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Auto-Fill
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Enter Manually
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Paste the TikTok Shop link and click "View Product" to see it in-app, or use "Auto-Fill" to extract details automatically.
            </p>
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-400/80">
                <strong>Legal Notice:</strong> By using this service, you consent to automated data extraction from TikTok Shop. 
                This service operates in compliance with applicable terms. 
                <a href="/LEGAL_COMPLIANCE.md" target="_blank" className="underline ml-1">Learn more</a>
              </p>
            </div>
            {verificationError && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400 mb-2">{verificationError}</p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={handleRetryVerification}
                    className="text-sm text-red-400 hover:text-red-300 underline"
                  >
                    Try again
                  </button>
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Enter manually
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Display */}
        {product && (
          <div className="glass rounded-2xl p-4 sm:p-6 md:p-8 border-emerald-500/20 mb-8 relative">
            <button
              onClick={handleClearProduct}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white z-10"
              title="Clear product"
              aria-label="Clear product"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Product Image */}
              <div className="w-full sm:w-48 h-48 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative mx-auto sm:mx-0">
                {product.imageUrl ? (
                  <>
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full flex items-center justify-center text-gray-500 hidden">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📦</div>
                        <div className="text-xs">Image unavailable</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📦</div>
                      <div className="text-xs">No image</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 line-clamp-2 break-words">{product.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm truncate">@{product.seller}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Service Fee ({NETWORK_CONFIG.bridgeFee * 100}%)</span>
                    <span className="text-gray-300">${(product.price * NETWORK_CONFIG.bridgeFee).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-emerald-400">
                      ${calculateTotalWithFee(product.price).toFixed(2)} USDC
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={() => {
                    if (!connected) {
                      setVisible(true);
                    } else {
                      handleCheckout();
                    }
                  }}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {connected ? (
                    <>
                      <Wallet className="w-5 h-5" />
                      Checkout with {publicKey?.toString().slice(0, 4)}...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      Connect Wallet to Checkout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="glass rounded-2xl p-6 md:p-8 border-white/5">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="space-y-4">
            {[
              { num: 1, title: "Paste TikTok Link", desc: "Copy any product link from TikTok Shop" },
              { num: 2, title: "Verify Product", desc: "We'll fetch the product details automatically" },
              { num: 3, title: "Connect Wallet", desc: "Connect your Solana wallet (Phantom, Backpack, etc.)" },
              { num: 4, title: "Pay & Checkout", desc: "Complete payment with USDC or SOL" },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-bold text-sm shrink-0">
                  {step.num}
                </span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 md:px-8 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <ArrowRightLeft className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-white">SolTok<span className="text-emerald-500">Bridge</span></span>
          </div>
          <span>Built on Solana</span>
        </div>
      </footer>

      {/* Checkout Modal */}
      {showCheckout && product && (
        <CheckoutModal
          product={product}
          onClose={handleCheckoutClose}
          onComplete={handleCheckoutComplete}
        />
      )}

      {/* TikTok Product Viewer Modal */}
      {showProductViewer && tiktokUrl && (
        <TikTokProductViewer
          url={tiktokUrl}
          onClose={() => setShowProductViewer(false)}
          onProductExtracted={(extracted) => {
            // When user clicks "Use This Product", show manual entry with pre-filled data
            setShowProductViewer(false);
            setShowManualEntry(true);
          }}
        />
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualProductEntry
          onProductEntered={(product) => {
            setProduct(product);
            setShowManualEntry(false);
            showSuccess('Product details entered! Ready to checkout.');
          }}
          onCancel={() => setShowManualEntry(false)}
          initialUrl={tiktokUrl}
        />
      )}
    </div>
  );
};

export default Landing;

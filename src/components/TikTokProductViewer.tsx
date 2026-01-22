import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Maximize2, Minimize2, Copy, Check, Eye } from 'lucide-react';

interface TikTokProductViewerProps {
  url: string;
  onClose: () => void;
  onProductExtracted?: (product: {
    title?: string;
    price?: number;
    imageUrl?: string;
    seller?: string;
  }) => void;
}

/**
 * TikTok Product Viewer - Opens TikTok Shop product page in a popup
 * without leaving the SolTok app. Since TikTok blocks iframes, we use
 * a popup window approach that stays within the app context.
 */
export const TikTokProductViewer: React.FC<TikTokProductViewerProps> = ({
  url,
  onClose,
  onProductExtracted,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const popupRef = useRef<Window | null>(null);

  // Extract basic info from URL
  useEffect(() => {
    const extractFromUrl = () => {
      try {
        const productId = url.match(/\/product\/(\d+)/)?.[1];
        const seller = url.match(/@([^/?]+)/)?.[1];
        
        const data: any = {
          url,
          productId,
          seller: seller ? `@${seller}` : undefined,
        };

        setExtractedData(data);
      } catch (e) {
        console.error('Error extracting from URL:', e);
      }
    };

    extractFromUrl();
  }, [url]);

  // Cleanup popup on unmount
  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  // Open in popup window (stays in app context)
  const handleOpenPopup = () => {
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      url,
      'TikTokProduct',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no`
    );

    if (popup) {
      setPopupWindow(popup);
      popupRef.current = popup;

      // Monitor popup
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setPopupWindow(null);
          popupRef.current = null;
        }
      }, 500);

      // Cleanup interval on unmount
      return () => clearInterval(checkPopup);
    }
  };

  // Open in new tab
  const handleOpenExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Use this product - trigger manual entry with pre-filled data
  const handleUseProduct = () => {
    if (onProductExtracted) {
      onProductExtracted({
        seller: extractedData?.seller,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative bg-[#050505] border border-emerald-500/20 rounded-2xl shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-[85vh] max-h-[700px]'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-white">TikTok Shop Product</span>
            {extractedData?.seller && (
              <span className="text-xs text-gray-400">• {extractedData.seller}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* URL Display */}
          <div className="p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">Product Link</p>
                <p className="text-sm text-white truncate font-mono break-all">{url}</p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 relative bg-gradient-to-br from-[#050505] to-[#0a0a0a] overflow-auto">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center max-w-lg w-full">
                {/* Icon */}
                <div className="text-7xl mb-6 animate-bounce">🛍️</div>
                
                {/* Title */}
                <h3 className="text-3xl font-bold mb-3">View TikTok Product</h3>
                <p className="text-gray-400 mb-8 text-lg">
                  The product page will open in a popup window so you can view it without leaving SolTok.
                </p>
                
                {/* Extracted Info */}
                {extractedData?.seller && (
                  <div className="mb-8 p-5 bg-white/5 rounded-xl border border-emerald-500/20">
                    <p className="text-sm text-gray-400 mb-2">Detected from URL</p>
                    <p className="text-xl font-semibold text-emerald-400">{extractedData.seller}</p>
                    {extractedData.productId && (
                      <p className="text-xs text-gray-500 mt-2">Product ID: {extractedData.productId}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleOpenPopup}
                    className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-3 text-lg"
                  >
                    <Eye className="w-5 h-5" />
                    Open Product Page (Popup)
                  </button>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleOpenExternal}
                      className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      New Tab
                    </button>
                    <button
                      onClick={handleUseProduct}
                      className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/10"
                    >
                      Enter Details
                    </button>
                  </div>
                </div>

                {/* Status */}
                {popupWindow && !popupWindow.closed && (
                  <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-sm text-emerald-400">
                      ✓ Product page opened in popup window
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      View the product, then come back here to complete your purchase
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-white/5">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUseProduct}
                className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Use This Product
              </button>
              <button
                onClick={handleOpenExternal}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 Tip: Open the product page to see details, then return here to complete your purchase with Solana
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

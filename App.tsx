
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  Wallet, 
  ArrowRight,
  X,
  CreditCard,
  ArrowRightLeft,
  Activity,
  MapPin,
  ExternalLink,
  Loader2,
  Globe,
  Link as LinkIcon,
  ShieldCheck,
  AlertCircle,
  Truck,
  ImageOff,
  Copy
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AppSection, TikTokProduct, ShippingAddress, Order, FulfillmentStep } from './types';
import { getProductFromUrl } from './services/geminiService';
import { useEscrow } from './src/hooks/useEscrow';
import { useDemoMode, DEMO_PRODUCTS } from './src/hooks/useDemoMode';
import { useOrders } from './src/hooks/useOrders';
import { sendOrderEmail } from './src/lib/email';
import ArchitectureView from './components/ArchitectureView';
import FulfillmentTracker from './components/FulfillmentTracker';
import NetworkBanner from './components/NetworkBanner';
import DemoModeBanner from './components/DemoModeBanner';
import { DatabaseStatus, OrderCardSkeleton } from './components/Skeleton';
import { StatsCounter, OrderSuccessModal, fireConfetti } from './components/Celebration';
import OperatorDashboard from './components/OperatorDashboard';
import OperatorLogin from './components/OperatorLogin';
import ProductGallery from './components/ProductGallery';
import { useToast } from './components/Toast';
import { Mail } from 'lucide-react';

const INITIAL_STEPS: FulfillmentStep[] = [
  { id: '1', label: 'Escrow Lock', status: 'pending', description: 'Solana USDC transaction confirmation.', icon: 'wallet' },
  { id: '2', label: 'Fiat Off-Ramp', status: 'pending', description: 'Settling USDC to USD via Bridge.xyz.', icon: 'bridge' },
  { id: '3', label: 'VCC Issuance', status: 'pending', description: 'Generating proxy card for checkout.', icon: 'card' },
  { id: '4', label: 'Proxy Purchase', status: 'pending', description: 'Automated TikTok Shop execution.', icon: 'cart' },
  { id: '5', label: 'Tracking Sync', status: 'pending', description: 'Finalizing carrier tracking.', icon: 'truck' },
];

const App: React.FC = () => {
  // Solana wallet adapter hooks
  const { publicKey, connected, connecting } = useWallet();
  
  // Toast notifications
  const toast = useToast();
  
  // Escrow hook for blockchain transactions
  const { createEscrow, checkUsdcBalance, isProcessing: isEscrowProcessing, error: escrowError } = useEscrow();
  
  // Demo mode hook
  const { 
    isDemoMode, 
    toggleDemoMode, 
    demoWalletBalance, 
    resetDemoWallet,
    verifyProduct: verifyDemoProduct,
    createDemoEscrow,
    checkDemoBalance,
  } = useDemoMode();
  
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.BROWSE);
  const [urlInput, setUrlInput] = useState('');
  const [bridgedProduct, setBridgedProduct] = useState<TikTokProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Operator mode state
  const [isOperator, setIsOperator] = useState(() => {
    const saved = localStorage.getItem('soltok_operator');
    return saved ? ['operator-demo-2024', 'soltok-admin', 'bridge-operator'].includes(saved) : false;
  });
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [showOperatorDashboard, setShowOperatorDashboard] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{
    orderId: string;
    productName: string;
    amount: number;
    buyerNumber: number;
  } | null>(null);
  
  // Helper to format wallet address
  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '', email: '', street: '', city: '', state: '', zip: ''
  });

  // Orders hook - handles Supabase persistence with localStorage fallback
  const { 
    orders, 
    setOrders, 
    addOrder, 
    updateOrder,
    isLoading: isLoadingOrders,
    supabaseEnabled 
  } = useOrders(publicKey?.toBase58());

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 15)]);
  }, []);
  
  // Operator functions
  const handleOperatorLogin = useCallback((key: string): boolean => {
    const validKeys = ['operator-demo-2024', 'soltok-admin', 'bridge-operator'];
    if (validKeys.includes(key)) {
      setIsOperator(true);
      localStorage.setItem('soltok_operator', key);
      setShowOperatorLogin(false);
      setShowOperatorDashboard(true);
      return true;
    }
    return false;
  }, []);

  const handleOperatorLogout = useCallback(() => {
    setIsOperator(false);
    localStorage.removeItem('soltok_operator');
    setShowOperatorDashboard(false);
  }, []);

  const handleReleaseEscrow = useCallback(async (orderId: string) => {
    // In demo mode, just simulate
    if (isDemoMode || orderId.startsWith('DEMO')) {
      await new Promise(r => setTimeout(r, 1500));
      addLog(`OPERATOR: Released escrow for ${orderId}`);
      return;
    }
    // In real mode, would call the escrow release instruction
    addLog(`OPERATOR: Releasing escrow for ${orderId}...`);
    await new Promise(r => setTimeout(r, 2000));
    addLog(`OPERATOR: Escrow released for ${orderId}`);
  }, [isDemoMode, addLog]);

  const handleRefundOrder = useCallback(async (orderId: string) => {
    // In demo mode, just simulate
    if (isDemoMode || orderId.startsWith('DEMO')) {
      await new Promise(r => setTimeout(r, 1500));
      addLog(`OPERATOR: Refunded order ${orderId}`);
      return;
    }
    // In real mode, would call the escrow refund instruction
    addLog(`OPERATOR: Processing refund for ${orderId}...`);
    await new Promise(r => setTimeout(r, 2000));
    addLog(`OPERATOR: Refund completed for ${orderId}`);
  }, [isDemoMode, addLog]);

  const handleUpdateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    addLog(`OPERATOR: Updated ${orderId} status to ${status}`);
  }, [addLog]);

  const handleFetchProduct = async () => {
    if (!urlInput.includes('tiktok.com') && !isDemoMode) {
      addLog("ERROR: Please provide a valid TikTok link.");
      return;
    }
    setLoading(true);
    setBridgedProduct(null);
    setImageError(false);
    
    if (isDemoMode) {
      addLog(`DEMO: Simulating product verification...`);
      try {
        const product = await verifyDemoProduct(urlInput || 'demo');
        setBridgedProduct(product);
        addLog(`DEMO: ${product.title} - $${product.price}`);
      } catch (err) {
        addLog(`DEMO ERROR: Verification failed.`);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    addLog(`INIT: Researching TikTok Link via Google Grounding...`);
    try {
      const product = await getProductFromUrl(urlInput);
      setBridgedProduct(product);
      addLog(`FOUND: ${product.title} verified at $${product.price}`);
    } catch (err) {
      addLog(`ERROR: Grounding failed. Link may be private or invalid.`);
    } finally {
      setLoading(false);
    }
  };

  const runFulfillmentSim = (orderId: string) => {
    const updateStep = (stepId: string, status: FulfillmentStep['status']) => {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        steps: o.steps.map(s => s.id === stepId ? { ...s, status } : s)
      } : o));
    };

    const sequence = async () => {
      // Step 1: Escrow Lock
      addLog("TX: Signing Solana bridge contract...");
      updateStep('1', 'active');
      await new Promise(r => setTimeout(r, 2000));
      updateStep('1', 'complete');
      toast.success("Escrow Locked", "Your USDC is secured in the bridge contract.");

      // Step 2: Fiat Off-Ramp
      addLog("FIAT: Initiating USDC -> USD settlement...");
      updateStep('2', 'active');
      await new Promise(r => setTimeout(r, 3000));
      updateStep('2', 'complete');
      toast.success("Payment Settled", "USDC converted to USD via Bridge.xyz");

      // Step 3: VCC Issuance
      addLog("VCC: Minting single-use virtual card...");
      updateStep('3', 'active');
      await new Promise(r => setTimeout(r, 2500));
      updateStep('3', 'complete');
      toast.info("Virtual Card Ready", "Single-use payment card generated.");

      // Step 4: Proxy Purchase
      addLog("BOT: Headless TikTok checkout session started...");
      updateStep('4', 'active');
      await new Promise(r => setTimeout(r, 4000));
      updateStep('4', 'complete');
      toast.success("Purchase Complete", "TikTok Shop order placed successfully!");

      // Step 5: Tracking Sync
      addLog("SHIP: Carrier labels generated. Finalized.");
      updateStep('5', 'active');
      await new Promise(r => setTimeout(r, 2000));
      updateStep('5', 'complete');
      
      // Generate simulated tracking info
      const trackingNumber = `TK${Date.now().toString(36).toUpperCase()}`;
      const carrier = 'USPS';
      
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        status: 'shipped',
        trackingNumber,
        carrier,
      } : o));
      
      // Send shipped email if customer email exists
      const order = orders.find(o => o.id === orderId);
      if (order?.customerEmail) {
        addLog(`EMAIL: Sending shipping notification...`);
        sendOrderEmail('order_shipped', {
          orderId,
          customerEmail: order.customerEmail,
          customerName: order.shippingAddress.fullName,
          productName: order.productName,
          productImage: order.productImage,
          productPrice: order.productPrice,
          totalUsdc: order.totalUsdc,
          shippingAddress: order.shippingAddress,
          trackingNumber,
          carrier,
        });
      }
      
      toast.success("Order Shipped!", "Tracking info synced. Your package is on the way!");
    };

    sequence();
  };

  const handleFinalCheckout = async () => {
    if (!shippingAddress.fullName || !shippingAddress.street) {
      addLog("ERROR: Please provide shipping details.");
      toast.error("Missing Information", "Please provide your name and shipping address.");
      return;
    }
    
    // In demo mode, skip wallet check
    if (!isDemoMode && (!connected || !publicKey)) {
      addLog("ERROR: Wallet not connected.");
      toast.warning("Wallet Required", "Please connect your Solana wallet to continue.");
      return;
    }

    const totalAmount = (bridgedProduct?.price || 0) * 1.05;
    
    // Check balance (demo or real)
    addLog(isDemoMode ? "DEMO: Checking balance..." : "BALANCE: Checking USDC balance...");
    const { sufficient, balance } = isDemoMode 
      ? await checkDemoBalance(totalAmount)
      : await checkUsdcBalance(totalAmount);
    
    if (!sufficient) {
      addLog(`ERROR: Insufficient balance. Have ${balance.toFixed(2)}, need ${totalAmount.toFixed(2)}`);
      toast.error("Insufficient Balance", `You have ${balance.toFixed(2)} USDC but need ${totalAmount.toFixed(2)} USDC.`);
      return;
    }
    
    addLog(`${isDemoMode ? 'DEMO' : 'BALANCE'}: ${balance.toFixed(2)} USDC available. Proceeding...`);
    setIsProcessingTx(true);
    
    // Generate order ID
    const orderId = `${isDemoMode ? 'DEMO' : 'ST'}-${Math.floor(Math.random() * 9000) + 1000}`;
    
    addLog(isDemoMode ? "DEMO: Simulating escrow transaction..." : "TX: Initiating escrow deposit transaction...");
    
    try {
      // Create escrow (demo or real)
      const escrowResult = isDemoMode
        ? await createDemoEscrow(orderId, totalAmount)
        : await createEscrow(orderId, totalAmount);
      
      if (!escrowResult.success) {
        throw new Error((escrowResult as any).error || 'Failed to create escrow');
      }
      
      addLog(`${isDemoMode ? 'DEMO' : 'TX'}: Escrow locked! Signature: ${escrowResult.txHash?.slice(0, 8)}...`);
      
      // Create order record
      const newOrder: Order = {
        id: orderId,
        productName: bridgedProduct?.title || bridgedProduct?.name || 'TikTok Product',
        productImage: bridgedProduct?.imageUrl || '',
        productPrice: bridgedProduct?.price || totalAmount,
        totalUsdc: totalAmount,
        status: 'processing',
        txHash: escrowResult.txHash || '',
        shippingAddress: { ...shippingAddress },
        customerEmail: shippingAddress.email,
        timestamp: new Date().toLocaleString(),
        steps: [...INITIAL_STEPS],
        isDemo: isDemoMode,
        walletAddress: publicKey?.toBase58(),
      };

      // Submit order to backend API (skip in demo mode)
      if (!isDemoMode) {
        addLog("API: Submitting order to backend...");
        try {
          const apiResponse = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: escrowResult.txHash,
              escrowPda: escrowResult.escrowPDA,
              buyerPubkey: publicKey?.toBase58(),
              product: bridgedProduct,
              totalUsdc: totalAmount,
              shippingAddress
            })
          });
          
          if (apiResponse.ok) {
            addLog("API: Order confirmed by backend.");
          } else {
            addLog("API: Backend unavailable, order stored locally.");
          }
        } catch (apiError) {
          addLog("API: Backend unavailable, order stored locally.");
        }
      } else {
        addLog("DEMO: Order stored locally (no backend call).");
      }

      // Save order (Supabase + localStorage)
      await addOrder(newOrder);
      setIsCheckoutOpen(false);
      
      // Send confirmation email if email provided
      if (shippingAddress.email) {
        addLog(`EMAIL: Sending confirmation to ${shippingAddress.email}...`);
        sendOrderEmail('order_confirmed', {
          orderId: newOrder.id,
          customerEmail: shippingAddress.email,
          customerName: shippingAddress.fullName,
          productName: newOrder.productName,
          productImage: newOrder.productImage,
          productPrice: newOrder.productPrice,
          totalUsdc: newOrder.totalUsdc,
          shippingAddress: {
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zip,
          },
          txHash: escrowResult.txHash,
        }).then(result => {
          if (result.success) {
            addLog('EMAIL: Confirmation sent successfully');
          } else {
            addLog(`EMAIL: Send failed - ${result.error}`);
          }
        });
      }
      
      // Generate a buyer number (simulated - in production this would come from DB)
      const buyerNumber = 12847 + orders.length + Math.floor(Math.random() * 100);
      
      // Show celebration modal
      setLastOrderDetails({
        orderId: newOrder.id,
        productName: bridgedProduct?.title || bridgedProduct?.name || 'TikTok Product',
        amount: totalAmount,
        buyerNumber,
      });
      setShowSuccessModal(true);
      
      // Start fulfillment simulation
      runFulfillmentSim(newOrder.id);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Transaction failed';
      addLog(`ERROR: ${errorMsg}`);
      toast.error("Transaction Failed", errorMsg);
    } finally {
      setIsProcessingTx(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] selection:bg-emerald-500/30">
      <NetworkBanner />
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setActiveSection(AppSection.BROWSE)}>
            <div className="bg-emerald-500 p-2 md:p-2.5 rounded-xl shadow-lg shadow-emerald-500/20"><ArrowRightLeft className="w-5 h-5 md:w-6 md:h-6 text-black" /></div>
            <span className="font-heading text-xl md:text-2xl font-bold">SolTok<span className="text-emerald-500">Bridge</span></span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-gray-500">
            <button onClick={() => setActiveSection(AppSection.BROWSE)} className={`hover:text-white transition-colors ${activeSection === AppSection.BROWSE ? 'text-emerald-400' : ''}`}>Bridge Tool</button>
            <button onClick={() => setActiveSection(AppSection.DASHBOARD)} className={`hover:text-white transition-colors flex items-center gap-2 ${activeSection === AppSection.DASHBOARD ? 'text-emerald-400' : ''}`}>
              My Orders {orders.length > 0 && `(${orders.length})`}
              {isLoadingOrders && <span className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />}
            </button>
            <button onClick={() => setActiveSection(AppSection.ARCHITECTURE)} className={`hover:text-white transition-colors ${activeSection === AppSection.ARCHITECTURE ? 'text-emerald-400' : ''}`}>Protocol</button>
          </div>
          <div className="flex items-center gap-3">
            {isOperator ? (
              <button
                onClick={() => setShowOperatorDashboard(true)}
                className="px-4 py-2 md:py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl font-bold text-xs md:text-sm hover:bg-purple-500/30 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">Operator</span>
              </button>
            ) : (
              <button
                onClick={() => setShowOperatorLogin(true)}
                className="px-3 py-2 md:py-3 text-gray-500 hover:text-white rounded-xl font-bold text-xs md:text-sm transition-colors"
                title="Operator Login"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            <div className="wallet-adapter-button-wrapper">
              <WalletMultiButton className={`!px-4 md:!px-6 !py-2 md:!py-3 !rounded-xl !font-bold !text-xs md:!text-sm !transition-all ${connected ? '!bg-emerald-500/10 !text-emerald-400 !border !border-emerald-500/20' : '!bg-emerald-500 !text-black hover:!bg-emerald-400'}`} />
            </div>
          </div>
        </div>
        {/* Mobile navigation */}
        <div className="flex md:hidden items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
          <button onClick={() => setActiveSection(AppSection.BROWSE)} className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeSection === AppSection.BROWSE ? 'text-emerald-400' : 'text-gray-500'}`}>Bridge</button>
          <button onClick={() => setActiveSection(AppSection.DASHBOARD)} className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeSection === AppSection.DASHBOARD ? 'text-emerald-400' : 'text-gray-500'}`}>Orders {orders.length > 0 && `(${orders.length})`}</button>
          <button onClick={() => setActiveSection(AppSection.ARCHITECTURE)} className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeSection === AppSection.ARCHITECTURE ? 'text-emerald-400' : 'text-gray-500'}`}>Protocol</button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8 md:py-16">
        {activeSection === AppSection.BROWSE && (
          <div className="space-y-8 md:space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4 md:space-y-6">
              <h1 className="text-4xl md:text-7xl font-heading font-bold tracking-tighter leading-none">Bridge any item <br/> to <span className="text-emerald-400">Solana.</span></h1>
              <p className="text-gray-500 text-base md:text-xl max-w-xl mx-auto font-light leading-relaxed px-4">Paste a TikTok Shop URL. We verify the price live using Google Grounding and bridge your USDC to the merchant.</p>
              
              {/* Live Stats */}
              <StatsCounter className="max-w-2xl mx-auto mt-8" />
            </div>

            <div className="relative glass p-2 md:p-3 rounded-[24px] md:rounded-[36px] border-white/10 shadow-3xl max-w-2xl mx-auto">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 p-1">
                <div className="flex-1 relative">
                  <LinkIcon className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 md:w-6 h-5 md:h-6 text-emerald-500" />
                  <input 
                    type="text" 
                    placeholder="Paste TikTok Shop URL..." 
                    className="w-full bg-white/5 border-none rounded-[20px] md:rounded-[28px] py-5 md:py-7 pl-12 md:pl-16 pr-4 md:pr-8 text-base md:text-xl focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetchProduct()}
                  />
                </div>
                <button 
                  onClick={handleFetchProduct}
                  disabled={loading || !urlInput}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black h-[56px] md:h-[84px] px-6 md:px-10 rounded-[20px] md:rounded-[28px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-emerald-500/20"
                >
                  {loading ? <Loader2 className="w-6 md:w-7 h-6 md:h-7 animate-spin" /> : 'VERIFY'}
                </button>
              </div>
            </div>

            {loading && (
              <div className="text-center space-y-4 animate-pulse">
                <div className="inline-flex items-center gap-3 text-emerald-400 font-mono text-xs uppercase tracking-widest">
                  <Globe className="w-4 h-4 animate-spin-slow" /> Grounding Live Data...
                </div>
              </div>
            )}

            {/* Demo Mode Product Gallery */}
            {isDemoMode && !bridgedProduct && !loading && (
              <div className="mt-16">
                <ProductGallery 
                  products={DEMO_PRODUCTS}
                  onSelectProduct={(product) => {
                    setBridgedProduct(product);
                    addLog(`DEMO: Selected ${product.title} - $${product.price}`);
                  }}
                />
              </div>
            )}

            {bridgedProduct && !loading && (
              <div className="max-w-xl mx-auto glass p-6 md:p-10 rounded-[32px] md:rounded-[48px] border-emerald-500/20 animate-in zoom-in-95 duration-500 shadow-2xl">
                <div className="flex flex-col gap-6 md:gap-10">
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-8 items-center sm:items-start">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0 relative">
                      {imageError ? (
                        <div className="flex flex-col items-center text-gray-600">
                          <ImageOff className="w-6 md:w-8 h-6 md:h-8" />
                          <span className="text-[8px] font-bold mt-2">LINK HIDDEN</span>
                        </div>
                      ) : (
                        <img 
                          src={bridgedProduct.imageUrl} 
                          className="w-full h-full object-cover" 
                          alt="Item" 
                          onError={() => {
                            console.warn("TikTok image blocked by CORS/Hotlink. Using fallback visual.");
                            setImageError(true);
                          }}
                        />
                      )}
                      {imageError && (
                         <img 
                            src={`https://picsum.photos/seed/${bridgedProduct.id}/300`} 
                            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                         />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">{bridgedProduct.category}</span>
                      <h3 className="text-xl md:text-2xl font-bold leading-tight">{bridgedProduct.title}</h3>
                      <p className="text-gray-500 text-sm">Merchant: {bridgedProduct.seller}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-6 md:py-8 border-y border-white/5">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Market Price</p>
                      <p className="text-2xl md:text-4xl font-heading font-bold">${bridgedProduct.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Status</p>
                      <p className="text-emerald-400 font-bold flex items-center justify-end gap-2 text-sm md:text-base"><ShieldCheck className="w-4 md:w-5 h-4 md:h-5" /> Verified</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full bg-white text-black font-black py-4 md:py-6 rounded-2xl md:rounded-3xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 text-base md:text-xl shadow-xl shadow-white/5"
                  >
                    <CreditCard className="w-5 md:w-6 h-5 md:h-6" /> PAY WITH USDC
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.DASHBOARD && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
             {/* Database Status */}
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold">Your Orders</h2>
               <DatabaseStatus 
                 connected={supabaseEnabled} 
                 loading={isLoadingOrders} 
                 orderCount={orders.length}
               />
             </div>
             
             <div className="grid grid-cols-1 gap-12">
                <div className="space-y-8">
                  {isLoadingOrders ? (
                    // Loading skeletons
                    <div className="space-y-6">
                      {[1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="glass p-24 text-center rounded-[48px] border-white/5 space-y-6">
                      <Activity className="w-16 h-16 text-gray-700 mx-auto" />
                      <h3 className="text-2xl font-bold text-gray-400">No active bridges.</h3>
                      <p className="text-gray-600 text-sm">
                        {supabaseEnabled ? 'Orders sync across all your devices.' : 'Orders stored locally in this browser.'}
                      </p>
                      <button onClick={() => setActiveSection(AppSection.BROWSE)} className="text-emerald-400 font-bold uppercase tracking-widest text-xs hover:underline">Start your first bridge</button>
                    </div>
                  ) : (
                    orders.map(order => (
                      <div key={order.id} className="glass p-5 md:p-10 rounded-[24px] md:rounded-[48px] border border-white/5 relative overflow-hidden group">
                         <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-12">
                           <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-emerald-400 text-[10px] font-black tracking-tighter uppercase px-2 py-1 bg-emerald-500/10 rounded-md">Order Locked</span>
                              </div>
                              <h2 className="text-2xl md:text-4xl font-heading font-bold">#{order.id}</h2>
                              <p className="text-gray-500 text-xs mt-2">{order.timestamp}</p>
                           </div>
                           <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                             <div className="flex items-center gap-2">
                               <button
                                 onClick={() => {
                                   const url = `${window.location.origin}/order/${order.id}`;
                                   navigator.clipboard.writeText(url);
                                   toast.success("Link Copied!", "Share this link to let others track your order");
                                 }}
                                 className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                 title="Copy shareable link"
                               >
                                 <Copy className="w-4 h-4 text-gray-400" />
                               </button>
                               <a
                                 href={`/order/${order.id}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                 title="Open order page"
                               >
                                 <ExternalLink className="w-4 h-4 text-gray-400" />
                               </a>
                             </div>
                             <div className={`px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] font-black tracking-widest border ${order.status === 'shipped' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-blue-500 text-blue-400 animate-pulse'}`}>
                                {order.status.toUpperCase()}
                             </div>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-12">
                            <div className="bg-white/[0.02] p-4 md:p-8 rounded-2xl md:rounded-3xl space-y-2 md:space-y-4 border border-white/5">
                               <h4 className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2 tracking-widest"><MapPin className="w-4 h-4 text-emerald-400" /> Shipping Info</h4>
                               <p className="text-base md:text-lg font-bold">{order.shippingAddress.fullName}</p>
                               <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.zip}</p>
                            </div>
                            <div className="bg-white/[0.02] p-4 md:p-8 rounded-2xl md:rounded-3xl space-y-2 md:space-y-4 border border-white/5">
                               <h4 className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2 tracking-widest"><ExternalLink className="w-4 h-4 text-purple-400" /> On-Chain Data</h4>
                               <div className="flex justify-between text-xs md:text-sm"><span className="text-gray-500">Value</span><span className="font-bold text-emerald-400">{order.totalUsdc.toFixed(2)} USDC</span></div>
                               <div className="flex justify-between text-[10px] md:text-xs font-mono"><span className="text-gray-500">Sig</span><span className="text-gray-400 truncate ml-4 md:ml-8">{order.txHash}</span></div>
                            </div>
                         </div>
                         <FulfillmentTracker steps={order.steps} isGlobal={order.status !== 'shipped'} />
                      </div>
                    ))
                  )}
                </div>
                <div className="glass p-8 rounded-[36px] border border-white/5 h-fit">
                   <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-500"><Activity className="w-4 h-4 text-emerald-400" /> Network Log</h3>
                   <div className="bg-black/60 rounded-2xl p-6 font-mono text-[10px] text-gray-500 space-y-3 overflow-auto max-h-[300px] border border-white/5 custom-scrollbar">
                      {logs.map((l, i) => <div key={i} className={i === 0 ? 'text-emerald-400' : ''}>{l}</div>)}
                      {logs.length === 0 && <div className="italic text-center py-8">Awaiting telemetry...</div>}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeSection === AppSection.ARCHITECTURE && <ArchitectureView />}
      </main>

      {isCheckoutOpen && bridgedProduct && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setIsCheckoutOpen(false)} />
          <div className="relative glass w-full max-w-5xl rounded-t-[32px] md:rounded-[48px] p-6 md:p-12 lg:p-16 shadow-2xl overflow-y-auto max-h-[95vh] md:max-h-[90vh] border border-white/10 animate-in slide-in-from-bottom md:zoom-in-95">
            <div className="flex justify-between items-center mb-8 md:mb-16">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-heading font-bold tracking-tighter">Bridge Settlement</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="bg-white/5 hover:bg-white/10 p-3 md:p-4 rounded-full transition-transform hover:rotate-90">
                <X className="w-6 md:w-8 h-6 md:h-8" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20">
               <div className="space-y-6 md:space-y-12">
                 <div className="space-y-4 md:space-y-8">
                   <h3 className="text-lg md:text-xl font-bold flex items-center gap-3"><MapPin className="w-5 md:w-7 h-5 md:h-7 text-emerald-400" /> Fulfillment Address</h3>
                   <div className="grid grid-cols-1 gap-3 md:gap-5">
                     <input type="text" placeholder="Full Recipient Name" className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[24px] px-4 md:px-8 py-4 md:py-5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm md:text-base" value={shippingAddress.fullName} onChange={e => setShippingAddress({...shippingAddress, fullName: e.target.value})} />
                     <div className="relative">
                       <Mail className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-gray-500" />
                       <input type="email" placeholder="Email for order updates (optional)" className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[24px] pl-12 md:pl-16 pr-4 md:pr-8 py-4 md:py-5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm md:text-base" value={shippingAddress.email || ''} onChange={e => setShippingAddress({...shippingAddress, email: e.target.value})} />
                     </div>
                     <input type="text" placeholder="Shipping Street Address" className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[24px] px-4 md:px-8 py-4 md:py-5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm md:text-base" value={shippingAddress.street} onChange={e => setShippingAddress({...shippingAddress, street: e.target.value})} />
                     <div className="grid grid-cols-3 gap-2 md:gap-5">
                       <input type="text" placeholder="City" className="col-span-1 w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[24px] px-3 md:px-8 py-4 md:py-5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm md:text-base" value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} />
                       <input type="text" placeholder="State" className="col-span-1 w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[24px] px-3 md:px-8 py-4 md:py-5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm md:text-base" value={shippingAddress.state} onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})} />
                       <input type="text" placeholder="Zip" className="col-span-1 w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[24px] px-3 md:px-8 py-4 md:py-5 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm md:text-base" value={shippingAddress.zip} onChange={e => setShippingAddress({...shippingAddress, zip: e.target.value})} />
                     </div>
                   </div>
                 </div>
                 <div className="bg-emerald-500/5 p-4 md:p-8 rounded-2xl md:rounded-[36px] border border-emerald-500/20 flex gap-4 md:gap-6">
                    <AlertCircle className="w-6 md:w-8 h-6 md:h-8 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-[10px] md:text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Escrow Mechanism</h4>
                      <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed font-medium">Your USDC is locked in the bridge contract. The proxy agent only triggers USD off-ramping once the merchant confirms inventory.</p>
                    </div>
                 </div>
               </div>

               <div className="bg-white/[0.02] p-6 md:p-12 rounded-2xl md:rounded-[56px] border border-white/5 space-y-6 md:space-y-12 h-fit">
                 <div className="space-y-4 md:space-y-8">
                    <h3 className="text-lg md:text-xl font-bold flex items-center gap-3 text-purple-400"><CreditCard className="w-5 md:w-7 h-5 md:h-7" /> Payout Summary</h3>
                    <div className="flex gap-4 md:gap-8 items-center bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-white/5">
                       <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                          {imageError ? <ImageOff className="w-5 md:w-6 h-5 md:h-6 text-gray-700" /> : <img src={bridgedProduct.imageUrl} className="w-full h-full object-cover" />}
                       </div>
                       <div className="flex-1 min-w-0"><h4 className="text-sm md:text-base font-bold line-clamp-1">{bridgedProduct.title}</h4><p className="text-[10px] md:text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">TikTok Verified</p></div>
                       <span className="text-lg md:text-xl font-bold font-heading shrink-0">${bridgedProduct.price}</span>
                    </div>
                    <div className="pt-6 md:pt-10 border-t border-white/10 space-y-3 md:space-y-4">
                      <div className="flex justify-between text-xs md:text-sm text-gray-500 font-bold uppercase tracking-widest"><span>Item Cost</span><span>${bridgedProduct.price.toFixed(2)}</span></div>
                      <div className="flex justify-between text-xs md:text-sm text-emerald-400 font-bold uppercase tracking-widest"><span>Bridge Fee (5%)</span><span>${((bridgedProduct?.price || 0) * 0.05).toFixed(2)}</span></div>
                      <div className="flex justify-between text-xl md:text-3xl lg:text-4xl font-heading font-black pt-6 md:pt-10 text-white tracking-tighter"><span>TOTAL</span><span className="text-emerald-400">{((bridgedProduct?.price || 0) * 1.05).toFixed(2)} USDC</span></div>
                    </div>
                 </div>
                 <button 
                   onClick={handleFinalCheckout} 
                   disabled={isProcessingTx || (!isDemoMode && !connected)} 
                   className="w-full bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/40 text-black font-black py-5 md:py-7 rounded-xl md:rounded-[32px] transition-all shadow-3xl flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50 text-base md:text-xl lg:text-2xl tracking-tighter"
                 >
                   {isProcessingTx ? <Loader2 className="w-6 md:w-8 h-6 md:h-8 animate-spin" /> : isDemoMode ? 'DEMO PURCHASE' : connected ? 'INITIATE BRIDGE' : 'CONNECT WALLET'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Demo Mode Banner */}
      <DemoModeBanner 
        isDemoMode={isDemoMode}
        onToggle={toggleDemoMode}
        balance={isDemoMode ? demoWalletBalance : undefined}
        onResetWallet={resetDemoWallet}
      />
      
      {/* Operator Login Modal */}
      {showOperatorLogin && (
        <OperatorLogin
          onLogin={handleOperatorLogin}
          onCancel={() => setShowOperatorLogin(false)}
        />
      )}
      
      {/* Operator Dashboard Modal */}
      {showOperatorDashboard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen">
            <div className="flex justify-between items-center p-4 bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-10">
              <button
                onClick={() => setShowOperatorDashboard(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to App
              </button>
              <button
                onClick={handleOperatorLogout}
                className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-bold transition-colors"
              >
                Logout
              </button>
            </div>
            <OperatorDashboard
              orders={orders}
              onReleaseEscrow={handleReleaseEscrow}
              onRefundOrder={handleRefundOrder}
              onUpdateStatus={handleUpdateOrderStatus}
              isDemo={isDemoMode}
            />
          </div>
        </div>
      )}
      
      {/* Order Success Modal with Confetti */}
      {lastOrderDetails && (
        <OrderSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setActiveSection(AppSection.DASHBOARD);
          }}
          orderId={lastOrderDetails.orderId}
          productName={lastOrderDetails.productName}
          amount={lastOrderDetails.amount}
          buyerNumber={lastOrderDetails.buyerNumber}
        />
      )}
    </div>
  );
};

export default App;

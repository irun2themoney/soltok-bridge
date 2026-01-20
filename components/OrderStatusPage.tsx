import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Loader2,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { ordersApi, isSupabaseConfigured } from '../src/lib/supabase';
import FulfillmentTracker from './FulfillmentTracker';

interface FulfillmentStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
  timestamp?: number;
}

interface Order {
  id: string;
  productName: string;
  productImage: string;
  productPrice: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  escrowAmount: number;
  shippingName: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  walletAddress?: string;
  createdAt: number;
  fulfillmentSteps: FulfillmentStep[];
  isDemo?: boolean;
}

const OrderStatusPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load order from Supabase or localStorage
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        // Try Supabase first
        if (isSupabaseConfigured()) {
          const dbOrder = await ordersApi.getById(orderId);
          if (dbOrder) {
            setOrder({
              id: dbOrder.id,
              productName: dbOrder.product_name,
              productImage: dbOrder.product_image || '',
              productPrice: dbOrder.product_price,
              status: dbOrder.status as Order['status'],
              escrowAmount: dbOrder.escrow_amount,
              shippingName: dbOrder.shipping_name,
              shippingAddress: {
                fullName: dbOrder.shipping_name,
                street: dbOrder.shipping_street || '',
                city: dbOrder.shipping_city || '',
                state: dbOrder.shipping_state || '',
                zip: dbOrder.shipping_zip || '',
              },
              walletAddress: dbOrder.wallet_address || undefined,
              createdAt: new Date(dbOrder.created_at).getTime(),
              fulfillmentSteps: dbOrder.fulfillment_steps as FulfillmentStep[] || [],
              isDemo: dbOrder.is_demo,
            });
            setLoading(false);
            return;
          }
        }

        // Fall back to localStorage
        const stored = localStorage.getItem('soltok_orders');
        if (stored) {
          const orders: Order[] = JSON.parse(stored);
          const found = orders.find(o => o.id === orderId);
          if (found) {
            setOrder(found);
            setLoading(false);
            return;
          }
        }

        setError('Order not found');
      } catch (err) {
        console.error('Error loading order:', err);
        setError('Failed to load order');
      }
      setLoading(false);
    };

    loadOrder();

    // Subscribe to realtime updates if Supabase is configured
    if (isSupabaseConfigured() && orderId) {
      const subscription = ordersApi.subscribeToOrders((payload) => {
        if (payload.new && (payload.new as any).id === orderId) {
          const dbOrder = payload.new as any;
          setOrder({
            id: dbOrder.id,
            productName: dbOrder.product_name,
            productImage: dbOrder.product_image || '',
            productPrice: dbOrder.product_price,
            status: dbOrder.status as Order['status'],
            escrowAmount: dbOrder.escrow_amount,
            shippingName: dbOrder.shipping_name,
            shippingAddress: {
              fullName: dbOrder.shipping_name,
              street: dbOrder.shipping_street || '',
              city: dbOrder.shipping_city || '',
              state: dbOrder.shipping_state || '',
              zip: dbOrder.shipping_zip || '',
            },
            walletAddress: dbOrder.wallet_address || undefined,
            createdAt: new Date(dbOrder.created_at).getTime(),
            fulfillmentSteps: dbOrder.fulfillment_steps as FulfillmentStep[] || [],
            isDemo: dbOrder.is_demo,
          });
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [orderId]);

  const copyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = `I just bridged a TikTok Shop item to Solana using @SolTokBridge! 🌉✨\n\nTrack my order:`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'processing': return 'text-blue-400';
      case 'shipped': return 'text-purple-400';
      case 'delivered': return 'text-emerald-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'processing': return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'shipped': return <Truck className="w-5 h-5" />;
      case 'delivered': return <CheckCircle2 className="w-5 h-5" />;
      case 'cancelled': return <Package className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Order Not Found</h1>
          <p className="text-gray-400 mb-6">
            {error || "We couldn't find this order. It may have been deleted or the link is incorrect."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">SolTokBridge</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={shareOnTwitter}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              <Twitter className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Order Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className={`flex items-center gap-2 ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="font-bold capitalize">{order.status}</span>
            </span>
            {order.isDemo && (
              <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-xs font-bold">
                DEMO
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-gray-500">
            Placed {new Date(order.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Product</h2>
            <div className="flex gap-4">
              {order.productImage && (
                <img
                  src={order.productImage}
                  alt={order.productName}
                  className="w-24 h-24 rounded-xl object-cover bg-white/5"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1">{order.productName}</h3>
                <p className="text-2xl font-black text-emerald-400">
                  ${order.productPrice.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Escrow: {order.escrowAmount.toFixed(2)} USDC
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Shipping To</h2>
            <div className="space-y-2">
              <p className="text-white font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-gray-400 text-sm">
                {order.shippingAddress.street && <>{order.shippingAddress.street}<br /></>}
                {order.shippingAddress.city && `${order.shippingAddress.city}, `}
                {order.shippingAddress.state} {order.shippingAddress.zip}
              </p>
              {order.walletAddress && (
                <p className="text-gray-600 text-xs font-mono mt-4">
                  Wallet: {order.walletAddress.slice(0, 8)}...{order.walletAddress.slice(-8)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Fulfillment Tracker */}
        {order.fulfillmentSteps && order.fulfillmentSteps.length > 0 && (
          <div className="mt-6">
            <FulfillmentTracker steps={order.fulfillmentSteps} />
          </div>
        )}

        {/* Share Section */}
        <div className="mt-8 p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <Share2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Share Your Order</h3>
              <p className="text-gray-400 text-sm mb-4">
                Let others track your bridge transaction in real-time
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
                <button
                  onClick={shareOnTwitter}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] rounded-lg text-sm font-medium transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  Share on X
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SolTokBridge
          </Link>
        </div>
      </main>
    </div>
  );
};

export default OrderStatusPage;

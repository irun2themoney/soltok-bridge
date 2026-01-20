import React, { useState, useEffect } from 'react';
import {
  Shield,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Truck,
  CreditCard,
  Send,
  Ban,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { Order } from '../types';

interface OperatorDashboardProps {
  orders: Order[];
  onReleaseEscrow: (orderId: string) => Promise<void>;
  onRefundOrder: (orderId: string) => Promise<void>;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  isDemo?: boolean;
}

type FilterStatus = 'all' | 'paid' | 'processing' | 'shipped' | 'completed' | 'refunded';

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  orders,
  onReleaseEscrow,
  onRefundOrder,
  onUpdateStatus,
  isDemo = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'paid' || o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed' || o.status === 'shipped').length,
    refunded: orders.filter(o => o.status === 'refunded').length,
    totalVolume: orders.reduce((sum, o) => sum + o.totalUsdc, 0),
    todayOrders: orders.filter(o => {
      const orderDate = new Date(o.timestamp);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString();
    }).length,
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.products.some(p => p.product.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.shippingAddress.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleReleaseEscrow = async (orderId: string) => {
    setIsProcessing(orderId);
    try {
      await onReleaseEscrow(orderId);
      onUpdateStatus(orderId, 'completed');
    } catch (error) {
      console.error('Failed to release escrow:', error);
    } finally {
      setIsProcessing(null);
      setShowActionMenu(null);
    }
  };

  const handleRefund = async (orderId: string) => {
    setIsProcessing(orderId);
    try {
      await onRefundOrder(orderId);
      onUpdateStatus(orderId, 'refunded');
    } catch (error) {
      console.error('Failed to refund:', error);
    } finally {
      setIsProcessing(null);
      setShowActionMenu(null);
    }
  };

  const handleAdvanceStatus = (orderId: string, currentStatus: Order['status']) => {
    const statusFlow: Record<string, Order['status']> = {
      'paid': 'processing',
      'processing': 'shipped',
      'shipped': 'completed',
    };
    const nextStatus = statusFlow[currentStatus];
    if (nextStatus) {
      onUpdateStatus(orderId, nextStatus);
    }
    setShowActionMenu(null);
  };

  const getStatusBadge = (status: Order['status']) => {
    const badges: Record<Order['status'], { bg: string; text: string; icon: React.ReactNode }> = {
      paid: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock className="w-3 h-3" /> },
      processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
      shipped: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: <Truck className="w-3 h-3" /> },
      completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
      refunded: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
    };
    const badge = badges[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Operator Dashboard</h1>
            {isDemo && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full uppercase">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-gray-500">Manage orders, escrows, and fulfillment</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            View on Explorer
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Orders</span>
          </div>
          <p className="text-4xl font-black">{stats.total}</p>
          <p className="text-xs text-emerald-400 mt-2">+{stats.todayOrders} today</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-4xl font-black">{stats.pending}</p>
          <p className="text-xs text-yellow-400 mt-2">Needs attention</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Completed</span>
          </div>
          <p className="text-4xl font-black">{stats.completed}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.refunded} refunded</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Volume</span>
          </div>
          <p className="text-4xl font-black">${stats.totalVolume.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">Total USDC processed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by order ID, product, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
          {(['all', 'paid', 'processing', 'shipped', 'completed', 'refunded'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-emerald-500 text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-2 opacity-70">
                  ({orders.filter(o => o.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-bold">No orders found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-emerald-400">{order.id}</code>
                        {order.id.startsWith('DEMO') && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-mono">{order.txHash.slice(0, 16)}...</p>
                    </td>
                    <td className="p-4">
                      {order.products[0] && (
                        <div className="flex items-center gap-3">
                          <img 
                            src={order.products[0].product.imageUrl} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover bg-white/5"
                          />
                          <div>
                            <p className="text-sm font-bold line-clamp-1 max-w-[200px]">
                              {order.products[0].product.title}
                            </p>
                            <p className="text-xs text-gray-500">Qty: {order.products[0].quantity}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold">{order.shippingAddress.fullName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">
                        {order.shippingAddress.city ? `${order.shippingAddress.city}, ${order.shippingAddress.state}` : 'No address'}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-lg font-bold text-emerald-400">${order.totalUsdc.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">USDC</p>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{order.timestamp}</p>
                    </td>
                    <td className="p-4">
                      <div className="relative flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setShowActionMenu(showActionMenu === order.id ? null : order.id)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                          
                          {showActionMenu === order.id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                              {(order.status === 'paid' || order.status === 'processing' || order.status === 'shipped') && (
                                <button
                                  onClick={() => handleAdvanceStatus(order.id, order.status)}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 transition-colors"
                                >
                                  <ArrowRight className="w-4 h-4 text-blue-400" />
                                  Advance Status
                                </button>
                              )}
                              
                              {(order.status === 'shipped' || order.status === 'processing') && (
                                <button
                                  onClick={() => handleReleaseEscrow(order.id)}
                                  disabled={isProcessing === order.id}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 transition-colors text-emerald-400"
                                >
                                  <Send className="w-4 h-4" />
                                  {isProcessing === order.id ? 'Processing...' : 'Release Escrow'}
                                </button>
                              )}
                              
                              {order.status !== 'refunded' && order.status !== 'completed' && (
                                <button
                                  onClick={() => handleRefund(order.id)}
                                  disabled={isProcessing === order.id}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 transition-colors text-red-400"
                                >
                                  <Ban className="w-4 h-4" />
                                  {isProcessing === order.id ? 'Processing...' : 'Refund Order'}
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  window.open(`https://solscan.io/tx/${order.txHash}?cluster=devnet`, '_blank');
                                  setShowActionMenu(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 transition-colors border-t border-white/5"
                              >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                                View Transaction
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Order Details</h2>
                <code className="text-sm text-emerald-400">{selectedOrder.id}</code>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-sm">Status</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
              
              {/* Product */}
              {selectedOrder.products[0] && (
                <div className="bg-white/5 rounded-2xl p-4">
                  <div className="flex gap-4">
                    <img 
                      src={selectedOrder.products[0].product.imageUrl} 
                      alt="" 
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <div>
                      <h3 className="font-bold">{selectedOrder.products[0].product.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedOrder.products[0].product.seller}
                      </p>
                      <p className="text-emerald-400 font-bold mt-2">
                        ${selectedOrder.products[0].product.price} × {selectedOrder.products[0].quantity}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Shipping */}
              <div>
                <h4 className="text-gray-500 font-bold uppercase text-sm mb-3">Shipping Address</h4>
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="font-bold">{selectedOrder.shippingAddress.fullName || 'N/A'}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedOrder.shippingAddress.street || 'No street'}<br />
                    {selectedOrder.shippingAddress.city || 'No city'}, {selectedOrder.shippingAddress.state || 'N/A'} {selectedOrder.shippingAddress.zip || ''}
                  </p>
                </div>
              </div>
              
              {/* Transaction */}
              <div>
                <h4 className="text-gray-500 font-bold uppercase text-sm mb-3">Transaction</h4>
                <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-emerald-400">${selectedOrder.totalUsdc.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">TX Hash</span>
                    <code className="text-xs font-mono">{selectedOrder.txHash.slice(0, 24)}...</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Timestamp</span>
                    <span className="text-sm">{selectedOrder.timestamp}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {(selectedOrder.status === 'shipped' || selectedOrder.status === 'processing') && (
                  <button
                    onClick={() => {
                      handleReleaseEscrow(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Release Escrow
                  </button>
                )}
                {selectedOrder.status !== 'refunded' && selectedOrder.status !== 'completed' && (
                  <button
                    onClick={() => {
                      handleRefund(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Refund
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close action menu */}
      {showActionMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowActionMenu(null)}
        />
      )}
    </div>
  );
};

export default OperatorDashboard;

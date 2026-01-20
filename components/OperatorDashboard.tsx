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
  BarChart3,
  LayoutList,
} from 'lucide-react';
import { Order } from '../types';
import AnalyticsDashboard from './AnalyticsDashboard';

interface OperatorDashboardProps {
  orders: Order[];
  onReleaseEscrow: (orderId: string) => Promise<void>;
  onRefundOrder: (orderId: string) => Promise<void>;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  isDemo?: boolean;
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered';
type DashboardTab = 'orders' | 'analytics';

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  orders,
  onReleaseEscrow,
  onRefundOrder,
  onUpdateStatus,
  isDemo = false,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('orders');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'delivered' || o.status === 'shipped').length,
    refunded: 0, // Not tracking refunds in this version
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
      order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingAddress.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleReleaseEscrow = async (orderId: string) => {
    setIsProcessing(orderId);
    try {
      await onReleaseEscrow(orderId);
      onUpdateStatus(orderId, 'delivered');
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
      // Note: refunded status not available in current Order type
    } catch (error) {
      console.error('Failed to refund:', error);
    } finally {
      setIsProcessing(null);
      setShowActionMenu(null);
    }
  };

  const handleAdvanceStatus = (orderId: string, currentStatus: Order['status']) => {
    const statusFlow: Record<string, Order['status']> = {
      'pending': 'processing',
      'processing': 'shipped',
      'shipped': 'delivered',
    };
    const nextStatus = statusFlow[currentStatus];
    if (nextStatus) {
      onUpdateStatus(orderId, nextStatus);
    }
    setShowActionMenu(null);
  };

  const getStatusBadge = (status: Order['status']) => {
    const badges: Record<Order['status'], { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock className="w-3 h-3" /> },
      processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
      shipped: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: <Truck className="w-3 h-3" /> },
      delivered: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
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
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
            <div className="p-1.5 md:p-2 bg-emerald-500/20 rounded-lg md:rounded-xl">
              <Shield className="w-5 md:w-6 h-5 md:h-6 text-emerald-400" />
            </div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight">Operator Dashboard</h1>
            {isDemo && (
              <span className="px-2 md:px-3 py-0.5 md:py-1 bg-purple-500/20 text-purple-400 text-[10px] md:text-xs font-bold rounded-full uppercase">
                Demo
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm md:text-base">Manage orders, escrows, and fulfillment</p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <button className="px-3 md:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button className="px-3 md:px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-colors flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">View on Explorer</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-emerald-500 text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Orders
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-purple-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <AnalyticsDashboard orders={orders} />
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
            <div className="p-1.5 md:p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-4 md:w-5 h-4 md:h-5 text-blue-400" />
            </div>
            <span className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-wider">Orders</span>
          </div>
          <p className="text-2xl md:text-4xl font-black">{stats.total}</p>
          <p className="text-[10px] md:text-xs text-emerald-400 mt-1 md:mt-2">+{stats.todayOrders} today</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
            <div className="p-1.5 md:p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-4 md:w-5 h-4 md:h-5 text-yellow-400" />
            </div>
            <span className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl md:text-4xl font-black">{stats.pending}</p>
          <p className="text-[10px] md:text-xs text-yellow-400 mt-1 md:mt-2">Needs attention</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
            <div className="p-1.5 md:p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-wider">Done</span>
          </div>
          <p className="text-2xl md:text-4xl font-black">{stats.completed}</p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">{stats.refunded} refunded</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
            <div className="p-1.5 md:p-2 bg-purple-500/20 rounded-lg">
              <DollarSign className="w-4 md:w-5 h-4 md:h-5 text-purple-400" />
            </div>
            <span className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-wider">Volume</span>
          </div>
          <p className="text-2xl md:text-4xl font-black">${stats.totalVolume.toFixed(0)}</p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">USDC total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="relative">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 md:pl-12 pr-4 py-2.5 md:py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 md:mx-0 px-4 md:px-0">
          {(['all', 'pending', 'processing', 'shipped', 'delivered'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-emerald-500 text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-1 md:ml-2 opacity-70">
                  ({orders.filter(o => o.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders - Desktop Table / Mobile Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-8 md:p-12 text-center text-gray-500">
          <Package className="w-10 md:w-12 h-10 md:h-12 mx-auto mb-4 opacity-50" />
          <p className="font-bold">No orders found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-emerald-400">{order.id}</code>
                      {order.id.startsWith('DEMO') && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded">
                          DEMO
                        </span>
                      )}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-lg font-bold text-emerald-400">${order.totalUsdc.toFixed(2)}</p>
                </div>
                
                <div className="flex gap-3 mb-3">
                  {order.productImage && (
                    <img src={order.productImage} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold line-clamp-1">{order.productName}</p>
                    <p className="text-xs text-gray-500">{order.shippingAddress.fullName || 'N/A'}</p>
                    <p className="text-[10px] text-gray-600 mt-1">{order.timestamp}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-3 h-3" /> Details
                  </button>
                  <div className="flex items-center gap-2">
                    {(order.status === 'pending' || order.status === 'processing' || order.status === 'shipped') && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, order.status)}
                        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-colors"
                      >
                        Advance
                      </button>
                    )}
                    {(order.status === 'shipped' || order.status === 'processing') && (
                      <button
                        onClick={() => handleReleaseEscrow(order.id)}
                        disabled={isProcessing === order.id}
                        className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isProcessing === order.id ? '...' : 'Release'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
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
                  {filteredOrders.map((order) => (
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
                        <div className="flex items-center gap-3">
                          {order.productImage && (
                            <img 
                              src={order.productImage} 
                              alt="" 
                              className="w-10 h-10 rounded-lg object-cover bg-white/5"
                            />
                          )}
                          <div>
                            <p className="text-sm font-bold line-clamp-1 max-w-[200px]">
                              {order.productName}
                            </p>
                            <p className="text-xs text-gray-500">${order.productPrice?.toFixed(2) || order.totalUsdc.toFixed(2)}</p>
                          </div>
                        </div>
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
                                {(order.status === 'pending' || order.status === 'processing' || order.status === 'shipped') && (
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
                                
                                {order.status !== 'delivered' && (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-3xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111] z-10">
              <div>
                <h2 className="text-lg md:text-xl font-bold">Order Details</h2>
                <code className="text-xs md:text-sm text-emerald-400">{selectedOrder.id}</code>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-5 md:w-6 h-5 md:h-6" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-xs md:text-sm">Status</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
              
              {/* Product */}
              <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4">
                <div className="flex gap-3 md:gap-4">
                  {selectedOrder.productImage && (
                    <img 
                      src={selectedOrder.productImage} 
                      alt="" 
                      className="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm md:text-base line-clamp-2">{selectedOrder.productName}</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                      TikTok Shop
                    </p>
                    <p className="text-emerald-400 font-bold mt-2 text-sm md:text-base">
                      ${selectedOrder.productPrice?.toFixed(2) || selectedOrder.totalUsdc.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Shipping */}
              <div>
                <h4 className="text-gray-500 font-bold uppercase text-xs md:text-sm mb-2 md:mb-3">Shipping Address</h4>
                <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4">
                  <p className="font-bold text-sm md:text-base">{selectedOrder.shippingAddress.fullName || 'N/A'}</p>
                  <p className="text-gray-400 text-xs md:text-sm mt-1">
                    {selectedOrder.shippingAddress.street || 'No street'}<br />
                    {selectedOrder.shippingAddress.city || 'No city'}, {selectedOrder.shippingAddress.state || 'N/A'} {selectedOrder.shippingAddress.zip || ''}
                  </p>
                </div>
              </div>
              
              {/* Transaction */}
              <div>
                <h4 className="text-gray-500 font-bold uppercase text-xs md:text-sm mb-2 md:mb-3">Transaction</h4>
                <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 space-y-2 md:space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-emerald-400">${selectedOrder.totalUsdc.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-500">TX Hash</span>
                    <code className="text-[10px] md:text-xs font-mono truncate ml-4">{selectedOrder.txHash.slice(0, 16)}...</code>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-500">Timestamp</span>
                    <span>{selectedOrder.timestamp}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 md:gap-3 pt-2 md:pt-4 pb-4">
                {(selectedOrder.status === 'shipped' || selectedOrder.status === 'processing') && (
                  <button
                    onClick={() => {
                      handleReleaseEscrow(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 md:py-3 rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <Send className="w-4 h-4" />
                    Release
                  </button>
                )}
                {selectedOrder.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      handleRefund(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2.5 md:py-3 rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
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

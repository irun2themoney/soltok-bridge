import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Percent,
  Clock,
  CheckCircle2,
  MapPin,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { Order } from '../types';
import { useAnalytics, TimePeriod } from '../src/hooks/useAnalytics';

interface AnalyticsDashboardProps {
  orders: Order[];
}

// Simple bar chart component
const BarChart: React.FC<{ data: { label: string; value: number }[]; maxValue?: number; color?: string }> = ({ 
  data, 
  maxValue: customMax,
  color = 'emerald' 
}) => {
  const maxValue = customMax || Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-12 shrink-0">{item.label}</span>
          <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-${color}-500/50 rounded-full transition-all duration-500`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

// Mini sparkline for trends
const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#10b981' }) => {
  if (data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Status donut chart
const StatusDonut: React.FC<{ data: { pending: number; processing: number; shipped: number; delivered: number } }> = ({ data }) => {
  const total = data.pending + data.processing + data.shipped + data.delivered;
  if (total === 0) {
    return (
      <div className="w-32 h-32 mx-auto flex items-center justify-center">
        <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center">
          <span className="text-gray-500 text-xs">No data</span>
        </div>
      </div>
    );
  }
  
  const segments = [
    { value: data.pending, color: '#eab308', label: 'Pending' },
    { value: data.processing, color: '#3b82f6', label: 'Processing' },
    { value: data.shipped, color: '#8b5cf6', label: 'Shipped' },
    { value: data.delivered, color: '#10b981', label: 'Delivered' },
  ].filter(s => s.value > 0);
  
  let currentAngle = -90;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {segments.map((segment, i) => {
          const percentage = segment.value / total;
          const strokeDasharray = `${percentage * circumference} ${circumference}`;
          const strokeDashoffset = -segments.slice(0, i).reduce((acc, s) => acc + (s.value / total) * circumference, 0);
          
          return (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="12"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-black">{total}</p>
          <p className="text-[10px] text-gray-500 uppercase">Orders</p>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ orders }) => {
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const analytics = useAnalytics(orders, period);
  
  const periods: { value: TimePeriod; label: string }[] = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'all', label: 'All time' },
  ];
  
  const formatTrend = (value: number) => {
    const formatted = Math.abs(value).toFixed(1);
    if (value > 0) return `+${formatted}%`;
    if (value < 0) return `-${formatted}%`;
    return '0%';
  };
  
  const TrendIndicator: React.FC<{ value: number }> = ({ value }) => {
    if (value > 0) {
      return (
        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
          <ArrowUpRight className="w-3 h-3" />
          {formatTrend(value)}
        </span>
      );
    }
    if (value < 0) {
      return (
        <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
          <ArrowDownRight className="w-3 h-3" />
          {formatTrend(value)}
        </span>
      );
    }
    return <span className="text-gray-500 text-xs font-bold">—</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-black">Analytics</h2>
            <p className="text-xs text-gray-500">Performance metrics & insights</p>
          </div>
        </div>
        
        {/* Period selector */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === p.value
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <TrendIndicator value={analytics.volumeTrend} />
          </div>
          <p className="text-2xl font-black">${analytics.totalVolume.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">Total Volume</p>
          <Sparkline data={analytics.dailyOrders.map(d => d.volume)} />
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <TrendIndicator value={analytics.ordersTrend} />
          </div>
          <p className="text-2xl font-black">{analytics.totalOrders}</p>
          <p className="text-xs text-gray-500 mt-1">Total Orders</p>
          <Sparkline data={analytics.dailyOrders.map(d => d.orders)} color="#3b82f6" />
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-black">${analytics.averageOrderValue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Avg Order Value</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Percent className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-black">{analytics.conversionRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Conversion Rate</p>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Orders by Day */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Orders Over Time
          </h3>
          
          {analytics.dailyOrders.length > 0 ? (
            <div className="space-y-2">
              {analytics.dailyOrders.slice(-7).map((day, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-14 shrink-0">{day.date}</span>
                  <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/50 to-emerald-500/20 rounded-lg transition-all duration-500"
                      style={{ 
                        width: `${(day.volume / Math.max(...analytics.dailyOrders.map(d => d.volume), 1)) * 100}%` 
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 justify-between">
                      <span className="text-xs font-bold text-white/70">{day.orders} orders</span>
                      <span className="text-xs font-bold text-emerald-400">${day.volume.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
              No order data for this period
            </div>
          )}
        </div>
        
        {/* Status Breakdown */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            Order Status
          </h3>
          
          <StatusDonut data={analytics.statusBreakdown} />
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-gray-400">Pending</span>
              <span className="text-xs font-bold ml-auto">{analytics.statusBreakdown.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-400">Processing</span>
              <span className="text-xs font-bold ml-auto">{analytics.statusBreakdown.processing}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs text-gray-400">Shipped</span>
              <span className="text-xs font-bold ml-auto">{analytics.statusBreakdown.shipped}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-400">Delivered</span>
              <span className="text-xs font-bold ml-auto">{analytics.statusBreakdown.delivered}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Top Products
          </h3>
          
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {analytics.topProducts.slice(0, 4).map((product, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                  {product.image && (
                    <img src={product.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-500">{product.orders} orders</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">${product.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
              No product data
            </div>
          )}
        </div>
        
        {/* Top States */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            Top Locations
          </h3>
          
          {analytics.topStates.length > 0 ? (
            <BarChart 
              data={analytics.topStates.map(s => ({ label: s.state || '?', value: s.orders }))}
              color="purple"
            />
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
              No location data
            </div>
          )}
        </div>
        
        {/* Performance */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Performance
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Fulfillment Rate</span>
                <span className="text-sm font-bold text-emerald-400">{analytics.fulfillmentRate.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.fulfillmentRate}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Avg Fulfillment Time</span>
                <span className="text-sm font-bold">{analytics.avgFulfillmentTime.toFixed(0)}h</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((analytics.avgFulfillmentTime / 72) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Target: 72h</p>
            </div>
            
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Active Orders</span>
                <span className="text-sm font-bold text-yellow-400">
                  {analytics.statusBreakdown.pending + analytics.statusBreakdown.processing + analytics.statusBreakdown.shipped}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

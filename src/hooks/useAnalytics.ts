import { useMemo } from 'react';
import { Order } from '../../types';

export type TimePeriod = '24h' | '7d' | '30d' | 'all';

export interface AnalyticsData {
  // Summary metrics
  totalOrders: number;
  totalVolume: number;
  averageOrderValue: number;
  conversionRate: number; // Simulated for demo
  
  // Status breakdown
  statusBreakdown: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
  };
  
  // Time series data (for charts)
  dailyOrders: { date: string; orders: number; volume: number }[];
  
  // Top products
  topProducts: { name: string; orders: number; revenue: number; image?: string }[];
  
  // Geographic data (from shipping addresses)
  topStates: { state: string; orders: number }[];
  
  // Performance metrics
  fulfillmentRate: number; // % of orders delivered
  avgFulfillmentTime: number; // hours (simulated)
  
  // Comparison to previous period
  ordersTrend: number; // % change
  volumeTrend: number; // % change
}

function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case 'all':
      start.setFullYear(2020); // Far enough back
      break;
  }
  
  return { start, end };
}

function parseOrderDate(timestamp: string): Date {
  // Handle various date formats
  const date = new Date(timestamp);
  if (!isNaN(date.getTime())) return date;
  
  // Fallback for locale strings like "1/20/2026, 3:45:00 PM"
  return new Date();
}

function filterOrdersByPeriod(orders: Order[], period: TimePeriod): Order[] {
  const { start } = getDateRange(period);
  
  return orders.filter(order => {
    const orderDate = parseOrderDate(order.timestamp);
    return orderDate >= start;
  });
}

function getPreviousPeriodOrders(orders: Order[], period: TimePeriod): Order[] {
  const { start: currentStart } = getDateRange(period);
  const periodMs = Date.now() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - periodMs);
  
  return orders.filter(order => {
    const orderDate = parseOrderDate(order.timestamp);
    return orderDate >= previousStart && orderDate < currentStart;
  });
}

export function useAnalytics(orders: Order[], period: TimePeriod = 'all'): AnalyticsData {
  return useMemo(() => {
    const filteredOrders = filterOrdersByPeriod(orders, period);
    const previousOrders = getPreviousPeriodOrders(orders, period);
    
    // Basic metrics
    const totalOrders = filteredOrders.length;
    const totalVolume = filteredOrders.reduce((sum, o) => sum + o.totalUsdc, 0);
    const averageOrderValue = totalOrders > 0 ? totalVolume / totalOrders : 0;
    
    // Simulated conversion rate (would come from actual page views in production)
    const conversionRate = totalOrders > 0 ? 3.2 + Math.random() * 2 : 0;
    
    // Status breakdown
    const statusBreakdown = {
      pending: filteredOrders.filter(o => o.status === 'pending').length,
      processing: filteredOrders.filter(o => o.status === 'processing').length,
      shipped: filteredOrders.filter(o => o.status === 'shipped').length,
      delivered: filteredOrders.filter(o => o.status === 'delivered').length,
    };
    
    // Daily orders (last 7 days for chart)
    const dailyOrders: { date: string; orders: number; volume: number }[] = [];
    const daysToShow = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 14;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayOrders = filteredOrders.filter(o => {
        const orderDate = parseOrderDate(o.timestamp);
        return orderDate >= date && orderDate < nextDate;
      });
      
      dailyOrders.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        volume: dayOrders.reduce((sum, o) => sum + o.totalUsdc, 0),
      });
    }
    
    // Top products
    const productMap = new Map<string, { orders: number; revenue: number; image?: string }>();
    filteredOrders.forEach(order => {
      const existing = productMap.get(order.productName) || { orders: 0, revenue: 0, image: order.productImage };
      productMap.set(order.productName, {
        orders: existing.orders + 1,
        revenue: existing.revenue + order.totalUsdc,
        image: existing.image || order.productImage,
      });
    });
    
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Top states
    const stateMap = new Map<string, number>();
    filteredOrders.forEach(order => {
      const state = order.shippingAddress?.state || 'Unknown';
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });
    
    const topStates = Array.from(stateMap.entries())
      .map(([state, orders]) => ({ state, orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
    
    // Performance metrics
    const deliveredCount = statusBreakdown.delivered;
    const fulfillmentRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
    
    // Simulated avg fulfillment time (would be calculated from actual timestamps)
    const avgFulfillmentTime = totalOrders > 0 ? 24 + Math.random() * 48 : 0;
    
    // Trends (comparison to previous period)
    const previousVolume = previousOrders.reduce((sum, o) => sum + o.totalUsdc, 0);
    const previousCount = previousOrders.length;
    
    const ordersTrend = previousCount > 0 
      ? ((totalOrders - previousCount) / previousCount) * 100 
      : totalOrders > 0 ? 100 : 0;
      
    const volumeTrend = previousVolume > 0 
      ? ((totalVolume - previousVolume) / previousVolume) * 100 
      : totalVolume > 0 ? 100 : 0;
    
    return {
      totalOrders,
      totalVolume,
      averageOrderValue,
      conversionRate,
      statusBreakdown,
      dailyOrders,
      topProducts,
      topStates,
      fulfillmentRate,
      avgFulfillmentTime,
      ordersTrend,
      volumeTrend,
    };
  }, [orders, period]);
}

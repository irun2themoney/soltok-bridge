import { useState, useEffect, useCallback } from 'react';
import { Order } from '../../types';

const STORAGE_KEY = 'soltok_orders';

export function useOrderStorage() {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever orders change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders:', e);
    }
  }, [orders]);

  // Add a new order
  const addOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev]);
  }, []);

  // Update an existing order
  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, ...updates } : o
    ));
  }, []);

  // Remove an order
  const removeOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  // Clear all orders
  const clearOrders = useCallback(() => {
    setOrders([]);
  }, []);

  // Export orders as JSON
  const exportOrders = useCallback(() => {
    const data = JSON.stringify(orders, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `soltok-orders-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [orders]);

  // Import orders from JSON file
  const importOrders = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const imported = JSON.parse(content) as Order[];
          
          if (!Array.isArray(imported)) {
            throw new Error('Invalid format: expected array of orders');
          }
          
          // Validate each order has required fields
          for (const order of imported) {
            if (!order.id || !order.timestamp || !order.status) {
              throw new Error('Invalid order format');
            }
          }
          
          // Merge with existing orders, avoiding duplicates
          setOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const newOrders = imported.filter(o => !existingIds.has(o.id));
            return [...newOrders, ...prev];
          });
          
          resolve(imported.length);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  // Get order statistics
  const getStats = useCallback(() => {
    const total = orders.length;
    const byStatus = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalValue = orders.reduce((sum, o) => sum + o.totalUsdc, 0);
    
    return { total, byStatus, totalValue };
  }, [orders]);

  return {
    orders,
    setOrders,
    addOrder,
    updateOrder,
    removeOrder,
    clearOrders,
    exportOrders,
    importOrders,
    getStats,
  };
}

export default useOrderStorage;

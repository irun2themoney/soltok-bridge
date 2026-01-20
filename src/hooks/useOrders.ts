import { useState, useEffect, useCallback } from 'react';
import { ordersApi, DbOrder, isSupabaseConfigured } from '../lib/supabase';
import { Order, FulfillmentStep } from '../../types';

// Convert DB order to app order format
const dbToAppOrder = (dbOrder: DbOrder): Order => ({
  id: dbOrder.id,
  productName: dbOrder.product_name,
  productImage: dbOrder.product_image,
  productPrice: dbOrder.product_price,
  totalUsdc: dbOrder.escrow_amount,
  status: dbOrder.status as Order['status'],
  txHash: dbOrder.escrow_tx_hash || '',
  shippingAddress: {
    fullName: dbOrder.shipping_name,
    street: dbOrder.shipping_street || '',
    city: dbOrder.shipping_city || '',
    state: dbOrder.shipping_state || '',
    zip: dbOrder.shipping_zip || '',
  },
  walletAddress: dbOrder.wallet_address || undefined,
  isDemo: dbOrder.is_demo,
  steps: dbOrder.fulfillment_steps || [],
  timestamp: new Date(dbOrder.created_at).toLocaleString(),
});

// Convert app order to DB format
const appToDbOrder = (order: Order): Omit<DbOrder, 'created_at' | 'updated_at'> => ({
  id: order.id,
  product_name: order.productName,
  product_image: order.productImage,
  product_price: order.productPrice,
  merchant: '',
  tiktok_url: '',
  status: order.status,
  escrow_amount: order.totalUsdc,
  escrow_tx_hash: order.txHash,
  shipping_name: order.shippingAddress.fullName,
  shipping_street: order.shippingAddress.street,
  shipping_city: order.shippingAddress.city,
  shipping_state: order.shippingAddress.state,
  shipping_zip: order.shippingAddress.zip,
  wallet_address: order.walletAddress || null,
  is_demo: order.isDemo || false,
  fulfillment_steps: order.steps,
});

const LOCAL_STORAGE_KEY = 'soltok_orders';

export function useOrders(walletAddress?: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseEnabled = isSupabaseConfigured();

  // Load orders from localStorage (fallback)
  const loadFromLocalStorage = useCallback((): Order[] => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
    return [];
  }, []);

  // Save orders to localStorage (fallback)
  const saveToLocalStorage = useCallback((ordersToSave: Order[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ordersToSave));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);

      if (supabaseEnabled) {
        try {
          const dbOrders = await ordersApi.getAll(walletAddress || undefined);
          const appOrders = dbOrders.map(dbToAppOrder);
          setOrders(appOrders);
          
          // Also sync to localStorage as backup
          saveToLocalStorage(appOrders);
        } catch (e) {
          console.error('Error loading from Supabase:', e);
          setError('Failed to load orders from database');
          // Fallback to localStorage
          setOrders(loadFromLocalStorage());
        }
      } else {
        // Use localStorage only
        setOrders(loadFromLocalStorage());
      }

      setIsLoading(false);
    };

    loadOrders();
  }, [walletAddress, supabaseEnabled, loadFromLocalStorage, saveToLocalStorage]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!supabaseEnabled) return;

    const subscription = ordersApi.subscribeToOrders((payload) => {
      console.log('Realtime update:', payload);
      
      if (payload.eventType === 'INSERT') {
        const newOrder = dbToAppOrder(payload.new as DbOrder);
        setOrders(prev => {
          const updated = [newOrder, ...prev.filter(o => o.id !== newOrder.id)];
          saveToLocalStorage(updated);
          return updated;
        });
      } else if (payload.eventType === 'UPDATE') {
        const updatedOrder = dbToAppOrder(payload.new as DbOrder);
        setOrders(prev => {
          const updated = prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
          saveToLocalStorage(updated);
          return updated;
        });
      } else if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as any).id;
        setOrders(prev => {
          const updated = prev.filter(o => o.id !== deletedId);
          saveToLocalStorage(updated);
          return updated;
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabaseEnabled, saveToLocalStorage]);

  // Add a new order
  const addOrder = useCallback(async (order: Order): Promise<boolean> => {
    // Optimistically add to local state
    setOrders(prev => {
      const updated = [order, ...prev];
      saveToLocalStorage(updated);
      return updated;
    });

    if (supabaseEnabled) {
      try {
        const dbOrder = appToDbOrder(order);
        const created = await ordersApi.create(dbOrder);
        if (!created) {
          console.warn('Failed to save order to Supabase, keeping in localStorage');
        }
      } catch (e) {
        console.error('Error saving to Supabase:', e);
      }
    }

    return true;
  }, [supabaseEnabled, saveToLocalStorage]);

  // Update an order
  const updateOrder = useCallback(async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
    // Optimistically update local state
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? { ...o, ...updates } : o);
      saveToLocalStorage(updated);
      return updated;
    });

    if (supabaseEnabled) {
      try {
        // Convert partial updates to DB format
        const dbUpdates: Partial<DbOrder> = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.txHash) dbUpdates.escrow_tx_hash = updates.txHash;
        if (updates.steps) dbUpdates.fulfillment_steps = updates.steps;
        
        await ordersApi.update(orderId, dbUpdates);
      } catch (e) {
        console.error('Error updating in Supabase:', e);
      }
    }

    return true;
  }, [supabaseEnabled, saveToLocalStorage]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']): Promise<boolean> => {
    return updateOrder(orderId, { status });
  }, [updateOrder]);

  // Update fulfillment steps
  const updateOrderSteps = useCallback(async (orderId: string, steps: FulfillmentStep[]): Promise<boolean> => {
    return updateOrder(orderId, { steps });
  }, [updateOrder]);

  return {
    orders,
    isLoading,
    error,
    addOrder,
    updateOrder,
    updateOrderStatus,
    updateOrderSteps,
    supabaseEnabled,
    // For direct state manipulation (used by existing code)
    setOrders: (newOrders: Order[] | ((prev: Order[]) => Order[])) => {
      setOrders(prev => {
        const updated = typeof newOrders === 'function' ? newOrders(prev) : newOrders;
        saveToLocalStorage(updated);
        return updated;
      });
    },
  };
}

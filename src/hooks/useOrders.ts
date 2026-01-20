import { useState, useEffect, useCallback } from 'react';
import { ordersApi, DbOrder, isSupabaseConfigured } from '../lib/supabase';

export interface Order {
  id: string;
  product: {
    name: string;
    image: string;
    price: number;
    merchant: string;
    url: string;
  };
  status: 'pending' | 'locked' | 'processing' | 'shipped' | 'delivered' | 'refunded';
  escrowAmount: number;
  escrowTxHash: string | null;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  walletAddress: string | null;
  isDemo: boolean;
  steps: FulfillmentStep[];
  createdAt: Date;
}

export interface FulfillmentStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
  icon: string;
}

// Convert DB order to app order format
const dbToAppOrder = (dbOrder: DbOrder): Order => ({
  id: dbOrder.id,
  product: {
    name: dbOrder.product_name,
    image: dbOrder.product_image,
    price: dbOrder.product_price,
    merchant: dbOrder.merchant,
    url: dbOrder.tiktok_url,
  },
  status: dbOrder.status,
  escrowAmount: dbOrder.escrow_amount,
  escrowTxHash: dbOrder.escrow_tx_hash,
  shippingAddress: {
    fullName: dbOrder.shipping_name,
    street: dbOrder.shipping_street,
    city: dbOrder.shipping_city,
    state: dbOrder.shipping_state,
    zip: dbOrder.shipping_zip,
  },
  walletAddress: dbOrder.wallet_address,
  isDemo: dbOrder.is_demo,
  steps: dbOrder.fulfillment_steps || [],
  createdAt: new Date(dbOrder.created_at),
});

// Convert app order to DB format
const appToDbOrder = (order: Order): Omit<DbOrder, 'created_at' | 'updated_at'> => ({
  id: order.id,
  product_name: order.product.name,
  product_image: order.product.image,
  product_price: order.product.price,
  merchant: order.product.merchant,
  tiktok_url: order.product.url,
  status: order.status,
  escrow_amount: order.escrowAmount,
  escrow_tx_hash: order.escrowTxHash,
  shipping_name: order.shippingAddress.fullName,
  shipping_street: order.shippingAddress.street,
  shipping_city: order.shippingAddress.city,
  shipping_state: order.shippingAddress.state,
  shipping_zip: order.shippingAddress.zip,
  wallet_address: order.walletAddress,
  is_demo: order.isDemo,
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
        return parsed.map((o: any) => ({
          ...o,
          createdAt: new Date(o.createdAt),
        }));
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
        if (updates.escrowTxHash) dbUpdates.escrow_tx_hash = updates.escrowTxHash;
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

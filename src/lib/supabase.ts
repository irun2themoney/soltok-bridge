import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://odtjhasvdqzbxuoxspys.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('Supabase anon key not configured. Database features will be disabled.');
}

export const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface DbOrder {
  id: string;
  product_name: string;
  product_image: string;
  product_price: number;
  merchant: string;
  tiktok_url: string;
  status: 'pending' | 'locked' | 'processing' | 'shipped' | 'delivered' | 'refunded';
  escrow_amount: number;
  escrow_tx_hash: string | null;
  shipping_name: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  wallet_address: string | null;
  is_demo: boolean;
  fulfillment_steps: any; // JSON
  created_at: string;
  updated_at: string;
}

// Check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;

// Order API functions
export const ordersApi = {
  // Create a new order
  async create(order: Omit<DbOrder, 'created_at' | 'updated_at'>): Promise<DbOrder | null> {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating order:', error);
      return null;
    }
    return data;
  },

  // Get all orders (optionally filter by wallet)
  async getAll(walletAddress?: string): Promise<DbOrder[]> {
    if (!supabase) return [];
    
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    return data || [];
  },

  // Get a single order by ID
  async getById(id: string): Promise<DbOrder | null> {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching order:', error);
      return null;
    }
    return data;
  },

  // Update an order
  async update(id: string, updates: Partial<DbOrder>): Promise<DbOrder | null> {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating order:', error);
      return null;
    }
    return data;
  },

  // Update order status
  async updateStatus(id: string, status: DbOrder['status']): Promise<boolean> {
    if (!supabase) return false;
    
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating order status:', error);
      return false;
    }
    return true;
  },

  // Update fulfillment steps
  async updateFulfillmentSteps(id: string, steps: any): Promise<boolean> {
    if (!supabase) return false;
    
    const { error } = await supabase
      .from('orders')
      .update({ fulfillment_steps: steps, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating fulfillment steps:', error);
      return false;
    }
    return true;
  },

  // Subscribe to order changes (realtime)
  subscribeToOrders(callback: (payload: any) => void) {
    if (!supabase) return null;
    
    return supabase
      .channel('orders_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        callback
      )
      .subscribe();
  }
};


export interface TikTokProduct {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  seller: string;
  category: string;
  rating: number;
  inventory: number;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Review {
  id: string;
  productId: string;
  userAddress: string;
  rating: number;
  comment: string;
  date: string;
  isVerified: boolean;
}

export interface FulfillmentStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
  icon: string;
}

export interface Order {
  id: string;
  products: CartItem[];
  totalUsdc: number;
  status: 'pending' | 'paid' | 'bridging' | 'purchased' | 'shipped';
  txHash: string;
  shippingAddress: ShippingAddress;
  timestamp: string;
  steps: FulfillmentStep[];
}

export enum AppSection {
  BROWSE = 'browse',
  DASHBOARD = 'dashboard',
  ARCHITECTURE = 'architecture',
  COMPLIANCE = 'compliance',
  WISHLIST = 'wishlist'
}

export interface CartItem {
  product: TikTokProduct;
  quantity: number;
}

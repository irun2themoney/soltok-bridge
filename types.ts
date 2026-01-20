
export interface TikTokProduct {
  id: string;
  name?: string;
  title: string;
  price: number;
  imageUrl: string;
  seller: string;
  merchant?: string;
  category: string;
  rating: number;
  inventory: number;
  url?: string;
}

export interface ShippingAddress {
  fullName: string;
  email?: string;
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
  status: 'pending' | 'active' | 'complete';
  timestamp?: number;
  description?: string;
  icon?: string;
}

export interface Order {
  id: string;
  productName: string;
  productImage: string;
  productPrice: number;
  totalUsdc: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  txHash: string;
  shippingAddress: ShippingAddress;
  customerEmail?: string;
  timestamp: string;
  steps: FulfillmentStep[];
  isDemo?: boolean;
  walletAddress?: string;
  trackingNumber?: string;
  carrier?: string;
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

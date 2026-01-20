import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store for demo purposes (fallback)
const orders: Map<string, Order> = new Map();

// Helper to access Vercel KV if available
async function getKv() {
  try {
    const mod = await import('@vercel/kv');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (mod as any).kv;
  } catch {
    return null;
  }
}

interface OrderProduct {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  seller: string;
  category: string;
}

interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface FulfillmentStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
  icon: string;
}

interface Order {
  id: string;
  products: { product: OrderProduct; quantity: number }[];
  totalUsdc: number;
  status: 'pending' | 'paid' | 'bridging' | 'purchased' | 'shipped';
  txHash: string;
  escrowPda: string;
  buyerPubkey: string;
  shippingAddress: ShippingAddress;
  timestamp: string;
  steps: FulfillmentStep[];
}

const INITIAL_STEPS: FulfillmentStep[] = [
  { id: '1', label: 'Escrow Lock', status: 'pending', description: 'Solana USDC transaction confirmation.', icon: 'wallet' },
  { id: '2', label: 'Fiat Off-Ramp', status: 'pending', description: 'Settling USDC to USD via Bridge.xyz.', icon: 'bridge' },
  { id: '3', label: 'VCC Issuance', status: 'pending', description: 'Generating proxy card for checkout.', icon: 'card' },
  { id: '4', label: 'Proxy Purchase', status: 'pending', description: 'Automated TikTok Shop execution.', icon: 'cart' },
  { id: '5', label: 'Tracking Sync', status: 'pending', description: 'Finalizing carrier tracking.', icon: 'truck' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    txHash, 
    escrowPda,
    buyerPubkey,
    product, 
    totalUsdc, 
    shippingAddress 
  } = req.body;

  // Validate required fields
  if (!txHash || !buyerPubkey || !product || !totalUsdc || !shippingAddress) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['txHash', 'buyerPubkey', 'product', 'totalUsdc', 'shippingAddress']
    });
  }

  // Validate shipping address
  if (!shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city) {
    return res.status(400).json({ error: 'Invalid shipping address' });
  }

  try {
    // Generate order ID
    const orderId = `ST-${Math.floor(Math.random() * 9000) + 1000}`;

    // Create order record
    const order: Order = {
      id: orderId,
      products: [{ product, quantity: 1 }],
      totalUsdc,
      status: 'paid',
      txHash,
      escrowPda: escrowPda || '',
      buyerPubkey,
      shippingAddress,
      timestamp: new Date().toISOString(),
      steps: INITIAL_STEPS.map(step => ({ ...step }))
    };

    // Store order
    // Prefer persistent KV when available
    const kv = await getKv();
    if (kv) {
      try {
        await kv.set(`order:${orderId}`, order);
        // Optionally push to an index list
        await kv.lpush('orders:list', orderId);
      } catch (e) {
        // Fallback to in-memory if KV write fails
        orders.set(orderId, order);
      }
    } else {
      orders.set(orderId, order);
    }

    // In production, you would:
    // 1. Verify the transaction on-chain
    // 2. Store in a persistent database
    // 3. Trigger fulfillment workflow

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(201).json({ 
      success: true, 
      orderId,
      order 
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ 
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export orders map for use in order-status endpoint (in production, use shared database)
export { orders };

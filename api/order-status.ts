import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store - fallback only
const orders: Map<string, any> = new Map();

async function getKv() {
  try {
    const mod = await import('@vercel/kv');
    return (mod as any).kv;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get order ID from query params
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing order ID' });
  }

  try {
    // Try persistent KV first
    const kv = await getKv();
    let order = null;
    if (kv) {
      try {
        order = await kv.get(`order:${id}`);
      } catch {
        order = null;
      }
    }

    // Fallback to in-memory map
    if (!order) {
      order = orders.get(id);
    }

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        orderId: id
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(order);
  } catch (error) {
    console.error('Order status error:', error);
    return res.status(500).json({
      error: 'Failed to fetch order status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Endpoint to update order status (for fulfillment system)
export async function updateOrderStatus(
  orderId: string,
  stepId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
) {
  // Try KV first
  const kv = await getKv();
  let order = null;
  if (kv) {
    try {
      order = await kv.get(`order:${orderId}`);
    } catch {
      order = null;
    }
  }

  if (!order) {
    order = orders.get(orderId);
  }

  if (!order) return null;

  order.steps = order.steps.map((step: any) =>
    step.id === stepId ? { ...step, status } : step
  );

  // Check if all steps complete
  const allComplete = order.steps.every((s: any) => s.status === 'completed');
  if (allComplete) {
    order.status = 'shipped';
  }

  // Persist update
  if (kv) {
    try {
      await kv.set(`order:${orderId}`, order);
    } catch {
      orders.set(orderId, order);
    }
  } else {
    orders.set(orderId, order);
  }

  return order;
}

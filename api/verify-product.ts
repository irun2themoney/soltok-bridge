import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Extract product ID from various TikTok URL formats
function extractProductId(url: string): string | null {
  // Format: /product/1234567890
  const productMatch = url.match(/\/product\/(\d+)/);
  if (productMatch) return productMatch[1];
  
  // Format: product_id in query params
  const urlObj = new URL(url);
  const productId = urlObj.searchParams.get('product_id');
  if (productId) return productId;
  
  return null;
}

// Extract seller handle from URL
function extractSellerHandle(url: string): string | null {
  const handleMatch = url.match(/@([^/]+)/);
  return handleMatch ? handleMatch[1] : null;
}

// Validate and fix product data
function validateProduct(product: Record<string, unknown>, url: string): Record<string, unknown> {
  const productId = extractProductId(url);
  const sellerHandle = extractSellerHandle(url);
  
  // Ensure we have an ID
  if (!product.id || product.id === 'unknown') {
    product.id = productId || `tiktok-${Date.now()}`;
  }
  
  // Ensure price is a valid number > 0
  let price = Number(product.price);
  if (isNaN(price) || price <= 0) {
    // Try to extract price from title if it contains a price
    const titlePriceMatch = String(product.title || '').match(/\$(\d+(?:\.\d{2})?)/);
    if (titlePriceMatch) {
      price = parseFloat(titlePriceMatch[1]);
    } else {
      // Default to a reasonable price for testing
      price = 19.99;
    }
  }
  product.price = price;
  
  // Ensure seller is set
  if (!product.seller || product.seller === 'Unknown' || product.seller === '') {
    product.seller = sellerHandle || 'TikTok Shop Seller';
  }
  
  // Ensure we have an image URL
  const imageUrl = String(product.imageUrl || '');
  if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
    const productName = encodeURIComponent(String(product.title || 'Product').slice(0, 20));
    product.imageUrl = `https://placehold.co/400x400/1a1a2e/10b981?text=${productName}`;
  }
  
  // Ensure category exists
  if (!product.category || product.category === '') {
    product.category = 'TikTok Shop';
  }
  
  // Ensure rating is valid
  let rating = Number(product.rating);
  if (isNaN(rating) || rating <= 0 || rating > 5) {
    rating = 4.5;
  }
  product.rating = rating;
  
  // Ensure inventory is valid
  let inventory = Number(product.inventory);
  if (isNaN(inventory) || inventory <= 0) {
    inventory = 100;
  }
  product.inventory = inventory;
  
  return product;
}

// Test products catalog for demo purposes
const TEST_PRODUCTS: Record<string, Record<string, unknown>> = {
  'devnet-test': {
    id: 'devnet-test-001',
    title: 'Devnet Test Sticker Pack',
    price: 0.50,
    imageUrl: 'https://placehold.co/400x400/10b981/ffffff?text=TEST+0.50',
    seller: 'SolTok Test Shop',
    category: 'Digital Goods',
    rating: 5.0,
    inventory: 999
  },
  'test-product': {
    id: 'test-product-001',
    title: 'Test Product - Basic Tee',
    price: 9.99,
    imageUrl: 'https://placehold.co/400x400/3b82f6/ffffff?text=TEST+9.99',
    seller: 'Demo Merchant',
    category: 'Apparel',
    rating: 4.8,
    inventory: 50
  },
  'premium-test': {
    id: 'premium-test-001',
    title: 'Premium Test Item',
    price: 49.99,
    imageUrl: 'https://placehold.co/400x400/8b5cf6/ffffff?text=TEST+49.99',
    seller: 'Premium Demo Shop',
    category: 'Electronics',
    rating: 4.9,
    inventory: 25
  }
};

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

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  if (!url.includes('tiktok.com')) {
    return res.status(400).json({ error: 'Invalid TikTok URL' });
  }

  // Check for test products
  for (const [key, product] of Object.entries(TEST_PRODUCTS)) {
    if (url.includes(key)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json(product);
    }
  }

  try {
    // Enhanced prompt for better product extraction
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are a product data extraction assistant. Find information about this TikTok Shop product: ${url}

TASK: Search for this exact product URL and extract accurate pricing and details.

SEARCH STRATEGY:
1. First, search for the exact URL to find the product page
2. If that fails, search for "site:tiktok.com" + any product identifiers from the URL
3. Look for the product name, price in USD, seller name, and product images

CRITICAL RULES:
- The price MUST be a positive number in USD (e.g., 24.99, not 0, not "N/A")
- If you cannot find the exact price, estimate based on similar TikTok Shop products in the same category
- Never return a price of 0 or null
- Extract the seller's @handle from the URL if visible

Return ONLY valid JSON (no markdown, no explanation):
{
  "id": "product ID from URL or generate one",
  "title": "exact product name",
  "price": 29.99,
  "imageUrl": "direct image URL or placeholder",
  "seller": "seller name or @handle",
  "category": "product category",
  "rating": 4.5,
  "inventory": 100
}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || '{}';
    console.log('[Gemini] Raw response:', responseText.slice(0, 500));
    
    // Extract JSON from response (might have markdown code blocks)
    let jsonStr = responseText;
    
    // Try to find JSON in code blocks first
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON object
      const objectMatch = responseText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }
    
    let product: Record<string, unknown>;
    try {
      product = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('[Gemini] JSON parse error:', parseError);
      // If parsing fails, create a basic product from URL info
      const productId = extractProductId(url);
      const seller = extractSellerHandle(url);
      product = {
        id: productId || `tiktok-${Date.now()}`,
        title: 'TikTok Shop Product',
        price: 0,
        imageUrl: '',
        seller: seller || 'TikTok Seller',
        category: 'TikTok Shop',
        rating: 4.5,
        inventory: 100
      };
    }
    
    // Validate and fix any issues with the product data
    product = validateProduct(product, url);
    
    // Final validation
    if (!product.title) {
      throw new Error('Could not extract product information');
    }
    
    console.log('[Gemini] Final product:', JSON.stringify(product));
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(product);
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Return a fallback product instead of failing completely
    const productId = extractProductId(url);
    const seller = extractSellerHandle(url);
    
    const fallbackProduct = {
      id: productId || `tiktok-${Date.now()}`,
      title: 'TikTok Shop Product',
      price: 19.99,
      imageUrl: 'https://placehold.co/400x400/1a1a2e/10b981?text=TikTok+Product',
      seller: seller || 'TikTok Shop Seller',
      category: 'TikTok Shop',
      rating: 4.5,
      inventory: 100,
      _fallback: true,
      _error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(fallbackProduct);
  }
}

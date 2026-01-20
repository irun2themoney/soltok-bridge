import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Extract product ID from various TikTok URL formats
function extractProductId(url: string): string | null {
  // Format: /product/1234567890
  const productMatch = url.match(/\/product\/(\d+)/);
  if (productMatch) return productMatch[1];
  
  // Format: product_id in query params
  try {
    const urlObj = new URL(url);
    const productId = urlObj.searchParams.get('product_id');
    if (productId) return productId;
  } catch {
    // Invalid URL, continue
  }
  
  return null;
}

// Extract seller handle from URL
function extractSellerHandle(url: string): string | null {
  const handleMatch = url.match(/@([^/]+)/);
  return handleMatch ? handleMatch[1] : null;
}

// Try to fetch product data directly from TikTok page
async function fetchTikTokProductDirect(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Try to find JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd['@type'] === 'Product' || jsonLd.name) {
          return {
            title: jsonLd.name,
            price: jsonLd.offers?.price || jsonLd.price,
            imageUrl: jsonLd.image || jsonLd.images?.[0],
            seller: jsonLd.brand?.name || jsonLd.seller?.name,
            description: jsonLd.description,
          };
        }
      } catch {
        // JSON-LD parse failed
      }
    }
    
    // Try to find NEXT_DATA or similar
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        // Navigate through the structure to find product data
        const product = nextData?.props?.pageProps?.product || 
                       nextData?.props?.pageProps?.initialState?.product ||
                       nextData?.props?.initialProps?.product;
        if (product) {
          return {
            title: product.title || product.name,
            price: product.price || product.salePrice || product.originalPrice,
            imageUrl: product.image || product.images?.[0] || product.cover,
            seller: product.seller?.name || product.shop?.name,
          };
        }
      } catch {
        // NEXT_DATA parse failed
      }
    }
    
    // Try to extract from meta tags
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    const ogDescription = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    
    if (ogTitle || ogImage) {
      // Try to extract price from description or title
      const priceMatch = (ogDescription?.[1] || ogTitle?.[1] || '').match(/\$(\d+(?:\.\d{2})?)/);
      return {
        title: ogTitle?.[1]?.replace(/ \| TikTok.*$/i, '').trim(),
        imageUrl: ogImage?.[1],
        price: priceMatch ? parseFloat(priceMatch[1]) : null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Direct fetch error]:', error);
    return null;
  }
}

// Validate and fix product data
function validateProduct(product: Record<string, unknown>, url: string): Record<string, unknown> {
  const productId = extractProductId(url);
  const sellerHandle = extractSellerHandle(url);
  let usedFallback = product._fallback === true;
  
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
      usedFallback = true;
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
  
  // Check if title looks generic/fallback
  const title = String(product.title || '').toLowerCase();
  const imageUrlStr = String(product.imageUrl || '').toLowerCase();
  if (title.includes('tiktok shop item') || 
      title.includes('tiktok product') || 
      title.includes('popular product') ||
      title.includes('example product') ||
      title.includes('popular gadget') ||
      title.includes('(estimate)') ||
      title.length < 5 ||
      imageUrlStr.includes('example.com') ||
      imageUrlStr.includes('placeholder')) {
    usedFallback = true;
  }
  
  // Mark as fallback if we used estimated data
  if (usedFallback) {
    product._fallback = true;
  }
  
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

  const productId = extractProductId(url);
  const seller = extractSellerHandle(url);

  try {
    // Step 1: Try to fetch product data directly from TikTok page
    console.log('[Verify] Attempting direct fetch...');
    const directData = await fetchTikTokProductDirect(url);
    
    if (directData && directData.title && directData.price) {
      console.log('[Verify] Direct fetch successful:', directData);
      const product = validateProduct({
        id: productId || `tiktok-${Date.now()}`,
        ...directData,
        seller: directData.seller || seller || 'TikTok Shop',
        category: 'TikTok Shop',
        rating: 4.5,
        inventory: 100,
      }, url);
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json(product);
    }
    
    // Step 2: Use Gemini with Google Search for product lookup
    console.log('[Verify] Direct fetch incomplete, trying Gemini...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Find the EXACT product details for this TikTok Shop listing: ${url}

IMPORTANT INSTRUCTIONS:
1. Search Google for this exact URL or the product ID "${productId || 'unknown'}"
2. Find the REAL product name and ACTUAL price in USD
3. Find a working image URL for the product (not a placeholder)

The seller handle is: @${seller || 'unknown'}

You MUST return accurate data. If you find the product, return real info.
If you absolutely cannot find it, use reasonable estimates for similar TikTok Shop products.

Return ONLY this JSON format (no other text):
{"id":"${productId || 'tiktok-' + Date.now()}","title":"Product Name Here","price":XX.XX,"imageUrl":"https://...","seller":"@${seller || 'seller'}","category":"Category","rating":4.5,"inventory":100}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || '{}';
    console.log('[Gemini] Response:', responseText.slice(0, 300));
    
    // Extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const objectMatch = responseText.match(/\{[\s\S]*?\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }
    
    let product: Record<string, unknown>;
    try {
      product = JSON.parse(jsonStr.trim());
    } catch {
      console.error('[Gemini] JSON parse failed, using fallback');
      product = {
        id: productId || `tiktok-${Date.now()}`,
        title: `TikTok Product by @${seller || 'shop'}`,
        price: 0,
        imageUrl: '',
        seller: seller || 'TikTok Shop',
        category: 'TikTok Shop',
        rating: 4.5,
        inventory: 100
      };
    }
    
    // Merge with any direct data we got
    if (directData) {
      if (directData.title && !product.title) product.title = directData.title;
      if (directData.imageUrl && (!product.imageUrl || String(product.imageUrl).includes('placeholder'))) {
        product.imageUrl = directData.imageUrl;
      }
      if (directData.price && (!product.price || product.price === 0)) {
        product.price = directData.price;
      }
    }
    
    // Validate and fix any issues
    product = validateProduct(product, url);
    
    console.log('[Verify] Final product:', JSON.stringify(product));
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(product);
    
  } catch (error) {
    console.error('[Verify] Error:', error);
    
    // Return a reasonable fallback
    const fallbackProduct = validateProduct({
      id: productId || `tiktok-${Date.now()}`,
      title: `TikTok Shop Item`,
      price: 24.99,
      imageUrl: '',
      seller: seller || 'TikTok Shop',
      category: 'TikTok Shop',
      rating: 4.5,
      inventory: 100,
      _fallback: true,
    }, url);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(fallbackProduct);
  }
}

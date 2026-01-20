import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

  // Special test product for devnet testing with minimal USDC
  // Use URL: https://www.tiktok.com/@test/product/devnet-test
  if (url.includes('devnet-test') || url.includes('test-product')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      id: 'devnet-test-001',
      title: 'Devnet Test Sticker Pack',
      price: 0.50,  // Only 0.50 USDC for testing!
      imageUrl: 'https://placehold.co/400x400/10b981/ffffff?text=TEST+PRODUCT',
      seller: 'SolTok Test Shop',
      category: 'Digital Goods',
      rating: 5.0,
      inventory: 999
    });
  }

  try {
    // Note: Google Search tool doesn't support responseSchema/controlled generation
    // So we ask for JSON in the prompt and parse the response
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `VERIFY AND EXTRACT DATA FOR THIS TIKTOK PRODUCT: ${url}. 
      1. Use your search tool to find the live product name, current price in USD, and the merchant/seller name.
      2. Crucially, find a PUBLICLY ACCESSIBLE image URL for this product (often found in search result thumbnails or shopping snippets). 
      3. If you cannot find a direct image link that allows hotlinking, provide a descriptive placeholder URL like "https://placehold.co/400x400?text=Product".
      
      IMPORTANT: Return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
      {
        "id": "string - unique product ID from URL or generated",
        "title": "string - product name",
        "price": number - price in USD as a number (not string),
        "imageUrl": "string - image URL or placeholder",
        "seller": "string - seller/merchant name",
        "category": "string - product category",
        "rating": number - rating out of 5,
        "inventory": number - estimated stock
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || '{}';
    
    // Extract JSON from response (might have markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const product = JSON.parse(jsonStr.trim());
    
    // Validate required fields
    if (!product.title || product.price === undefined) {
      throw new Error('Invalid product data returned');
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(product);
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify product',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

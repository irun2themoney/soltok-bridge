import { TikTokProduct } from '../types';

/**
 * Uses the serverless API to verify a TikTok Shop URL.
 * The API key is kept server-side for security.
 */
export const getProductFromUrl = async (url: string): Promise<TikTokProduct> => {
  // In development, call local API; in production, use relative path
  const apiUrl = import.meta.env.DEV 
    ? '/api/verify-product' 
    : '/api/verify-product';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to verify product');
  }

  return response.json();
};

/**
 * Fallback for local development without serverless functions.
 * Uses the Gemini API directly (requires API key in env).
 */
export const getProductFromUrlDirect = async (url: string): Promise<TikTokProduct> => {
  // Dynamic import to avoid bundling in production
  const { GoogleGenAI, Type } = await import('@google/genai');
  
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `VERIFY AND EXTRACT DATA FOR THIS TIKTOK PRODUCT: ${url}. 
    1. Use your search tool to find the live product name, current price in USD, and the merchant/seller name.
    2. Crucially, find a PUBLICLY ACCESSIBLE image URL for this product (often found in search result thumbnails or shopping snippets). 
    3. If you cannot find a direct image link that allows hotlinking, provide a descriptive keyword for the image so I can generate a fallback.
    
    Return a JSON object with: id, title, price, imageUrl, seller, category, rating, inventory.
    Price must be a number. imageUrl must be a string.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          price: { type: Type.NUMBER },
          imageUrl: { type: Type.STRING },
          seller: { type: Type.STRING },
          category: { type: Type.STRING },
          rating: { type: Type.NUMBER },
          inventory: { type: Type.NUMBER },
        },
        required: ['id', 'title', 'price', 'imageUrl', 'seller', 'category', 'rating', 'inventory']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

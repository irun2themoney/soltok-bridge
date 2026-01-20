import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

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

  try {
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

    const product = JSON.parse(response.text || '{}');
    
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

import type { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Extract product ID from URL
function extractProductId(url: string): string | null {
  const match = url.match(/\/product\/(\d+)/);
  return match ? match[1] : null;
}

// Extract seller handle from URL
function extractSellerHandle(url: string): string | null {
  const match = url.match(/@([^/]+)/);
  return match ? match[1] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || !url.includes('tiktok.com')) {
    return res.status(400).json({ error: 'Invalid TikTok URL' });
  }

  const productId = extractProductId(url);
  const seller = extractSellerHandle(url);

  let browser = null;
  
  try {
    console.log('[Scraper] Launching browser...');
    
    // Launch browser with chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('[Scraper] Navigating to:', url);
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });

    // Wait for content to load
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Try to extract product data from the page
    const productData = await page.evaluate(() => {
      // Look for common product data patterns
      const result: Record<string, string | number | null> = {
        title: null,
        price: null,
        imageUrl: null,
        seller: null,
        rating: null,
      };

      // Try to get title
      const titleEl = document.querySelector('h1, [data-e2e="product-title"], .product-title');
      if (titleEl) {
        result.title = titleEl.textContent?.trim() || null;
      }

      // Try to get price - look for currency patterns
      const priceElements = document.querySelectorAll('[class*="price"], [data-e2e*="price"]');
      for (const el of priceElements) {
        const text = el.textContent || '';
        const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
          result.price = parseFloat(priceMatch[1]);
          break;
        }
      }

      // Try to get image
      const imgEl = document.querySelector('img[src*="tiktok"], img[class*="product"], img[data-e2e*="product"]');
      if (imgEl) {
        result.imageUrl = imgEl.getAttribute('src') || null;
      }

      // Try to get seller
      const sellerEl = document.querySelector('[data-e2e="seller-name"], .seller-name, [class*="seller"]');
      if (sellerEl) {
        result.seller = sellerEl.textContent?.trim() || null;
      }

      // Try to get from JSON-LD
      const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) {
        try {
          const jsonLd = JSON.parse(jsonLdScript.textContent || '{}');
          if (jsonLd.name && !result.title) result.title = jsonLd.name;
          if (jsonLd.offers?.price && !result.price) result.price = parseFloat(jsonLd.offers.price);
          if (jsonLd.image && !result.imageUrl) result.imageUrl = jsonLd.image;
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Get the page title as fallback
      if (!result.title) {
        const pageTitle = document.title;
        if (pageTitle && !pageTitle.includes('TikTok')) {
          result.title = pageTitle.split('|')[0].trim();
        }
      }

      return result;
    });

    await browser.close();
    browser = null;

    console.log('[Scraper] Extracted data:', productData);

    // Build final product object
    const product = {
      id: productId || `tiktok-${Date.now()}`,
      title: productData.title || `TikTok Product by @${seller || 'shop'}`,
      price: productData.price || 19.99,
      imageUrl: productData.imageUrl || `https://placehold.co/400x400/1a1a2e/10b981?text=${encodeURIComponent(seller || 'Product')}`,
      seller: productData.seller || seller || 'TikTok Shop',
      category: 'TikTok Shop',
      rating: productData.rating || 4.5,
      inventory: 100,
      _scraped: true,
      _fallback: !productData.title || !productData.price,
    };

    return res.status(200).json(product);

  } catch (error) {
    console.error('[Scraper] Error:', error);
    
    if (browser) {
      await browser.close();
    }

    // Return fallback data
    return res.status(200).json({
      id: productId || `tiktok-${Date.now()}`,
      title: `TikTok Product`,
      price: 19.99,
      imageUrl: `https://placehold.co/400x400/1a1a2e/10b981?text=Product`,
      seller: seller || 'TikTok Shop',
      category: 'TikTok Shop',
      rating: 4.5,
      inventory: 100,
      _fallback: true,
      _error: error instanceof Error ? error.message : 'Scraping failed',
    });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Test TikTok Shop API Scraper
 * 
 * This endpoint tests the TikTok Shop API scraper we built
 * It can be called from your web app at https://soltok-bridge.vercel.app
 * 
 * Usage:
 * GET /api/test-tiktok-api-scraper?apiId=7143486084047324930
 * GET /api/test-tiktok-api-scraper?action=list
 * GET /api/test-tiktok-api-scraper?action=search&keyword=product
 */

const BASE_URL = "https://api-partner-sg.tiktokshop.com/api/v1";
const ACCOUNT_ID = "359713";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

async function fetchTikTokAPI(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(endpoint, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiId, apiVersion, action, keyword, limit } = req.query;

    // Action 1: List all APIs
    if (action === 'list' || !action) {
      const limitNum = limit ? parseInt(limit as string) : 20;
      
      const data = await fetchTikTokAPI('/open/api_test/apis', {
        aid: ACCOUNT_ID,
        locale: 'en-US',
      });

      if (data.code === 0) {
        const allApis: any[] = [];
        for (const pkg of data.data.pkgs || []) {
          for (const api of pkg.apis || []) {
            if (api.is_available) {
              allApis.push({
                id: String(api.id),
                name: api.name,
                path: api.displayed_path,
                method: { 1: 'POST', 2: 'GET', 3: 'PUT', 4: 'DELETE' }[api.method] || 'UNKNOWN',
                package: pkg.name,
              });
            }
          }
        }

        return res.status(200).json({
          success: true,
          total: allApis.length,
          apis: allApis.slice(0, limitNum),
          message: `Found ${allApis.length} available APIs`,
        });
      }

      return res.status(500).json({
        success: false,
        error: data.message || 'Failed to fetch APIs',
      });
    }

    // Action 2: Get specific API details
    if (action === 'detail' || apiId) {
      const id = (apiId as string) || '7143486084047324930';
      const version = (apiVersion as string) || '202306';

      const data = await fetchTikTokAPI('/open/api_test/api/detail', {
        id,
        api_version: version,
        aid: ACCOUNT_ID,
        locale: 'en-US',
      });

      if (data.code === 0) {
        const detail = data.data;
        const baseInfo = detail.base_info;

        // Build full endpoint URL
        let fullEndpoint = '';
        const path = baseInfo.displayed_path;
        if (path.startsWith('/api/')) {
          fullEndpoint = `https://open-api.tiktokglobalshop.com${path}`;
        } else {
          const baseUrl = 'https://api-partner-sg.tiktokshop.com';
          const versionedPath = path.replace('{version}', version).replace(':version', version);
          fullEndpoint = baseUrl + versionedPath;
        }

        return res.status(200).json({
          success: true,
          data: {
            id: baseInfo.id,
            name: baseInfo.name,
            path: baseInfo.displayed_path,
            method: { 1: 'POST', 2: 'GET', 3: 'PUT', 4: 'DELETE' }[baseInfo.method] || 'UNKNOWN',
            version: detail.version,
            baseUrl: path.startsWith('/api/') 
              ? 'https://open-api.tiktokglobalshop.com'
              : 'https://api-partner-sg.tiktokshop.com',
            fullEndpointUrl: fullEndpoint,
            parameters: detail.quries || [],
            requestBody: detail.bodies || [],
            pathVariables: detail.path_variables || [],
            authType: detail.auth_type,
          },
          message: 'API details retrieved successfully',
        });
      }

      return res.status(500).json({
        success: false,
        error: data.message || 'Failed to fetch API details',
      });
    }

    // Action 3: Search APIs
    if (action === 'search' && keyword) {
      const searchTerm = (keyword as string).toLowerCase();

      const data = await fetchTikTokAPI('/open/api_test/apis', {
        aid: ACCOUNT_ID,
        locale: 'en-US',
      });

      if (data.code === 0) {
        const matchingApis: any[] = [];
        for (const pkg of data.data.pkgs || []) {
          for (const api of pkg.apis || []) {
            if (api.is_available) {
              const name = api.name.toLowerCase();
              const path = api.displayed_path.toLowerCase();
              if (name.includes(searchTerm) || path.includes(searchTerm)) {
                matchingApis.push({
                  id: String(api.id),
                  name: api.name,
                  path: api.displayed_path,
                  method: { 1: 'POST', 2: 'GET', 3: 'PUT', 4: 'DELETE' }[api.method] || 'UNKNOWN',
                  package: pkg.name,
                });
              }
            }
          }
        }

        return res.status(200).json({
          success: true,
          keyword: searchTerm,
          count: matchingApis.length,
          apis: matchingApis,
          message: `Found ${matchingApis.length} APIs matching "${searchTerm}"`,
        });
      }

      return res.status(500).json({
        success: false,
        error: data.message || 'Failed to search APIs',
      });
    }

    // Default: Show help
    return res.status(200).json({
      success: true,
      message: 'TikTok Shop API Scraper Test Endpoint',
      usage: {
        list: 'GET /api/test-tiktok-api-scraper?action=list',
        detail: 'GET /api/test-tiktok-api-scraper?action=detail&apiId=7143486084047324930',
        search: 'GET /api/test-tiktok-api-scraper?action=search&keyword=product',
      },
      example: {
        testCurrentPage: 'GET /api/test-tiktok-api-scraper?apiId=7143486084047324930',
      },
    });

  } catch (error: any) {
    console.error('[API Scraper Test] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

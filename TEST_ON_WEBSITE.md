# 🧪 Test the Scraper on Your Website

You can now test the TikTok Shop API scraper directly on your deployed website!

## 🌐 Your Website
**URL**: https://soltok-bridge.vercel.app

## 🚀 How to Test

### Option 1: Test in Browser (Easiest)

Just open these URLs in your browser:

#### 1. List All APIs
```
https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=list
```

#### 2. Test Specific API (Get Product Detail)
```
https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?apiId=7143486084047324930
```

#### 3. Search for APIs
```
https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=search&keyword=product
```

#### 4. Get API Details
```
https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=detail&apiId=7143486084047324930&apiVersion=202306
```

### Option 2: Test with cURL

```bash
# List all APIs
curl "https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=list"

# Test specific API
curl "https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?apiId=7143486084047324930"

# Search APIs
curl "https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=search&keyword=order"
```

### Option 3: Test from JavaScript/Frontend

```javascript
// List all APIs
const response = await fetch('https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=list');
const data = await response.json();
console.log(data);

// Get specific API details
const apiResponse = await fetch('https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?apiId=7143486084047324930');
const apiData = await apiResponse.json();
console.log(apiData);
```

## 📋 What You'll Get

### List APIs Response:
```json
{
  "success": true,
  "total": 203,
  "apis": [
    {
      "id": "7143486084047324930",
      "name": "Get Product Detail",
      "path": "/api/products/details",
      "method": "GET",
      "package": "Product Basic"
    }
  ],
  "message": "Found 203 available APIs"
}
```

### API Details Response:
```json
{
  "success": true,
  "data": {
    "id": "7143486084047324930",
    "name": "Get Product Detail",
    "path": "/api/products/details",
    "method": "GET",
    "version": "202306",
    "baseUrl": "https://open-api.tiktokglobalshop.com",
    "fullEndpointUrl": "https://open-api.tiktokglobalshop.com/api/products/details",
    "parameters": [...],
    "requestBody": [...]
  },
  "message": "API details retrieved successfully"
}
```

## ✅ Quick Test Checklist

1. **Open in browser:**
   ```
   https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=list
   ```
   - Should show JSON with 203 APIs

2. **Test specific API:**
   ```
   https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?apiId=7143486084047324930
   ```
   - Should show complete API details
   - Should include full endpoint URL

3. **Search APIs:**
   ```
   https://soltok-bridge.vercel.app/api/test-tiktok-api-scraper?action=search&keyword=product
   ```
   - Should show matching APIs

## 🎯 Integration Example

You can add a test button to your frontend:

```typescript
// In your React component
const testScraper = async () => {
  const response = await fetch('/api/test-tiktok-api-scraper?action=list&limit=10');
  const data = await response.json();
  
  if (data.success) {
    console.log(`Found ${data.total} APIs`);
    console.log('Sample APIs:', data.apis);
  }
};
```

## 🔍 Verify It's Working

1. Open the URL in browser
2. You should see JSON response
3. Check that `success: true`
4. Verify API data is present
5. Check full endpoint URLs are generated

## 📝 API Endpoints Available

- `GET /api/test-tiktok-api-scraper?action=list` - List all APIs
- `GET /api/test-tiktok-api-scraper?apiId=<id>` - Get API details
- `GET /api/test-tiktok-api-scraper?action=detail&apiId=<id>` - Get API details
- `GET /api/test-tiktok-api-scraper?action=search&keyword=<term>` - Search APIs

## 🚀 Deploy

After creating the endpoint, deploy to Vercel:

```bash
git add api/test-tiktok-api-scraper.ts
git commit -m "Add TikTok API scraper test endpoint"
git push
```

Vercel will automatically deploy it!

## ✅ Success Indicators

- ✅ Endpoint returns JSON
- ✅ `success: true` in response
- ✅ API data is present
- ✅ Full endpoint URLs are generated
- ✅ Parameters are included

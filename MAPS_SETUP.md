# Google Maps Cost-Safe Integration Setup

## Overview

The `/pubs` page now features a cost-optimized Google Maps integration that:
- ✅ Only loads Maps JS API when needed (not on page load)
- ✅ Uses bounding box queries to minimize API calls
- ✅ Implements debouncing (500ms) to prevent excessive requests
- ✅ Uses marker clustering to handle 1000+ pins efficiently
- ✅ Caches loaded areas to avoid refetching
- ✅ NO Places/Details API calls from client (cost savings!)
- ✅ All photos served via your cached proxy (7-day TTL)

## Environment Variables Required

### 1. Browser API Key (Client-Side)

Create a **new** API key in Google Cloud Console with HTTP referrer restrictions:

```env
NEXT_PUBLIC_GMAPS_BROWSER_KEY=AIzaSy...your_browser_key
```

**Restrictions:**
- API Restrictions: Maps JavaScript API ONLY (uncheck all others)
- Application restrictions: HTTP referrers
  - Add: `localhost:3000/*` (development)
  - Add: `yourdomain.com/*` (production)

### 2. Server API Key (Backend)

Your existing server key (no restrictions) for backend calls:

```env
GOOGLE_MAPS_API_KEY=AIzaSy...your_server_key
```

Used for:
- `/api/photo-by-place` - Photo proxy
- Any server-side geocoding (if needed)

## Setup Steps

### 1. Create .env.local File

```bash
# In project root
cp .env.local.example .env.local
```

### 2. Add Your Keys

```env
# .env.local
NEXT_PUBLIC_GMAPS_BROWSER_KEY=your_browser_api_key_here
GOOGLE_MAPS_API_KEY=your_server_api_key_here
```

### 3. Restart Dev Server

```bash
npm run dev
```

## API Endpoints

### `/api/pubs/search`

Returns lightweight pub data for map pins - no Google API calls!

**Query Parameters:**
- `bbox` - Bounding box: `west,south,east,north`
- `filters` - JSON-encoded filter object
- `limit` - Max results (default: 500)

**Example:**
```
GET /api/pubs/search?bbox=-0.3,51.4,0.1,51.6&filters=%7B%22minRating%22%3A4%7D&limit=500
```

**Response:**
```json
{
  "total": 1234,
  "items": [
    {
      "id": "uuid",
      "name": "The Riverside",
      "lat": 51.48,
      "lng": -0.22,
      "rating": 4.4,
      "reviewCount": 186,
      "amenities": ["beer_garden", "dog_friendly"],
      "photo": "/api/photo-by-place?place_id=xxx&w=160"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

## Cost Optimization Features

### 1. Lazy Loading
Map JS loads **only** when user switches to Map view.

### 2. Debouncing
Bounds changes debounced to 500ms - prevents spam during pan/zoom.

### 3. Tile Caching
Each loaded area is cached by `bbox|filters` hash - no duplicate fetches.

### 4. Clustering
Uses @googlemaps/markerclusterer - efficiently handles 1000+ markers.

### 5. Request Limiting
- Max 500 pins per fetch
- Shows "Zoom in to see more" if total > 500
- Abort in-flight requests when bounds change

### 6. No Client-Side Places Calls
- Photos: Served via your `/api/photo-by-place` proxy
- Details: Not fetched on map (only basic pin data)
- Search: Uses local data, not Places Autocomplete

## Expected Costs

### Maps JavaScript API
- **Free**: 28,000 loads/month
- **After**: $7 per 1,000 loads
- With lazy loading: ~0.3 loads per user (only if they view map)

### NO Additional Costs From:
- ❌ Places API (we don't use it on client)
- ❌ Photos API (using cached proxy)
- ❌ Geocoding API (not needed for pins)

### Example Monthly Cost (10K users):
- 30% view map = 3,000 map loads
- **Cost: $0** (within free tier)
- Even at 100K users: ~$17/month

## Performance Targets

### Initial Page Load (List View)
- **No map JS downloaded** ✅
- Lighthouse: 90+ performance

### Map View Toggle
- First map load: < 1.0s on decent connection
- Pins appear: < 500ms after idle

### Subsequent Pan/Zoom
- Debounced: 500ms delay
- API response: < 200ms (cached)
- Pins render: < 100ms (clustering)

## Monitoring

Watch your Google Cloud Console for:
- Maps JavaScript API usage (should be low)
- Ensure NO Places API calls from client
- Photo proxy hits (should be 7-day cached)

## Troubleshooting

### "Error Loading Map"
- Check `NEXT_PUBLIC_GMAPS_BROWSER_KEY` is set
- Verify key has Maps JavaScript API enabled
- Check HTTP referrer restrictions include your domain

### Pins Not Loading
- Check browser console for errors
- Verify `/api/pubs/search` returns data
- Check filters - might be too restrictive

### Excessive API Calls
- Should see debouncing in action (500ms delays)
- Check loaded areas cache is working
- Ensure abort controller cancels in-flight requests

## Files Created/Modified

### New Files:
- `src/hooks/useMapLoader.ts` - Lazy map loading
- `src/hooks/useMapPins.ts` - Pin management with debouncing
- `src/hooks/useUrlState.ts` - URL state synchronization
- `src/app/api/pubs/search/route.ts` - Pin feed API

### Modified Files:
- `src/components/PubDataLoader.tsx` - Integrated map view
- `package.json` - Added @googlemaps/markerclusterer

## Future Enhancements

### Optional Upgrades:
1. **Tile-Based Pagination**: Fetch per 0.05° grid tile
2. **Heatmap Layer**: Show density from counts
3. **MapLibre Fallback**: Use OSM tiles to cut costs further
4. **Server-Side "Open Now"**: Compute on backend

### Cost Reduction:
- Current: ~$0/month (under free tier)
- With MapLibre: $0/month forever (no Google maps)
- With tile pagination: Even more efficient caching


# Google Places Photo Proxy Setup

This implementation provides a cost-effective way to serve Google Places photos with 7-day caching, reducing API calls and improving page load performance.

## 🚀 Quick Setup

### 1. Environment Configuration

Create a `.env.local` file in your project root with:

```bash
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Photo Cache Configuration
PHOTO_CACHE_TTL_SECONDS=604800           # 7 days
PHOTO_CACHE_MAXWIDTH_DEFAULT=480
PHOTO_CACHE_MAXWIDTH_MAX=1280

# Optional: Daily quota monitoring
GOOGLE_PLACES_PHOTO_DAILY_QUOTA=10000
GOOGLE_PLACES_PHOTO_BUDGET_ALERT=0.80    # Alert at 80% of quota
```

### 2. API Route

The photo proxy API is already implemented at `/api/photo/route.ts` with:

- **Edge Runtime** for optimal performance
- **7-day caching** with CDN-friendly headers
- **Size limits** (64px - 1280px width)
- **Timeout protection** (8 seconds)
- **Error handling** and validation

### 3. Usage Examples

#### Basic Usage with Photo Reference

```tsx
import { getCachedPhotoUrl } from '@/utils/photoUtils';
import Image from 'next/image';

function PubCard({ photoRef, name }) {
  const photoUrl = photoRef 
    ? getCachedPhotoUrl({ ref: photoRef, width: 480 })
    : '/images/placeholders/pub-default.webp';

  return (
    <Image
      src={photoUrl}
      alt={name}
      width={480}
      height={320}
      loading="lazy"
      sizes="(max-width: 640px) 100vw, 480px"
    />
  );
}
```

#### Using the PubPhoto Component

```tsx
import { PubPhoto } from '@/components/PubPhoto';

function PubCard({ pub }) {
  return (
    <PubPhoto
      photoRef={pub._internal?.photo_reference}
      alt={`${pub.name} pub`}
      width={480}
      height={320}
      fallbackIcon="🍺"
    />
  );
}
```

#### Clickable Photo

```tsx
import { ClickablePubPhoto } from '@/components/PubPhoto';

function PubCard({ pub }) {
  return (
    <ClickablePubPhoto
      href={`/pubs/${pub.slug}`}
      photoRef={pub._internal?.photo_reference}
      alt={`${pub.name} pub`}
      width={480}
      height={320}
      hoverEffect={true}
    />
  );
}
```

## 🔧 API Endpoint

### GET `/api/photo`

**Query Parameters:**
- `ref` (required): Google Places photo reference
- `w` (optional): Width in pixels (64-1280, default 480)

**Example:**
```
GET /api/photo?ref=Aap_uEA7...&w=480
```

**Response Headers:**
```
Content-Type: image/jpeg
Cache-Control: public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400
X-Source: google-places-photo
X-Photo-Reference: Aap_uEA7...
X-Requested-Width: 480
X-Cache-TTL: 604800
```

## 📊 Cost Savings

### Before (Direct Google API calls)
- Each photo request = 1 Google API call
- 1000 page views = 1000 API calls
- Cost: $0.007 per photo

### After (With Proxy + CDN)
- First request per 7 days = 1 Google API call
- Subsequent requests = 0 API calls (served from CDN)
- Cost: ~$0.001 per photo (85%+ reduction)

### Expected Results
- **90%+ CDN cache hit ratio**
- **85%+ cost reduction**
- **Faster page loads** (images served from edge)
- **Better user experience**

## 🛡️ Safety Features

1. **Size Limits**: Width clamped between 64px - 1280px
2. **Timeout Protection**: 8-second timeout on Google API calls
3. **File Size Limits**: 5MB maximum image size
4. **Error Handling**: Graceful fallbacks for failed requests
5. **Content Validation**: Ensures response is actually an image
6. **CORS Support**: Proper headers for CDN compatibility

## 🧪 Testing

Visit `/test-photo-proxy` to test the implementation:

1. Enter a Google Places photo reference
2. Choose desired width
3. Click "Test Photo Proxy"
4. View the generated URL and photo preview

## 🔄 CDN Configuration

### Cloudflare
```yaml
# Cache all /api/photo responses
- path: "/api/photo*"
  cache_control: "public, max-age=604800"
  edge_cache_ttl: 604800
```

### Vercel
The Edge Runtime automatically provides optimal caching at the edge.

### Other CDNs
Configure to respect the `Cache-Control` headers:
- `max-age=604800` (7 days)
- `s-maxage=604800` (CDN cache for 7 days)
- `stale-while-revalidate=86400` (serve stale content while revalidating)

## 📈 Monitoring

### Google Cloud Console
Set up alerts for:
- Daily quota usage
- API errors
- Unusual traffic patterns

### Application Monitoring
Track:
- Cache hit ratios
- Response times
- Error rates
- Photo proxy usage

## 🔧 Advanced Configuration

### Custom Cache TTL
```bash
PHOTO_CACHE_TTL_SECONDS=86400  # 1 day
PHOTO_CACHE_TTL_SECONDS=259200 # 3 days
PHOTO_CACHE_TTL_SECONDS=1209600 # 14 days
```

### Multiple Image Sizes
```tsx
const sizes = {
  thumbnail: getCachedPhotoUrl({ ref, width: 150 }),
  small: getCachedPhotoUrl({ ref, width: 320 }),
  medium: getCachedPhotoUrl({ ref, width: 480 }),
  large: getCachedPhotoUrl({ ref, width: 800 }),
};
```

## 🚨 Important Notes

1. **Attribution**: Google requires attribution for Places photos
2. **Rate Limits**: Monitor your Google API quota
3. **Legal Compliance**: Ensure you comply with Google's Terms of Service
4. **Cache Invalidation**: Images are cached for 7 days automatically
5. **Fallbacks**: Always provide fallback images for missing photos

## 🔍 Troubleshooting

### Common Issues

1. **"Missing photo reference" error**
   - Ensure the `ref` parameter is provided
   - Check that the photo reference is valid

2. **"Failed to fetch photo" error**
   - Verify your Google API key is correct
   - Check your Google Places API quota
   - Ensure the photo reference is still valid

3. **Images not loading**
   - Check browser network tab for errors
   - Verify the photo proxy URL is accessible
   - Test with the `/test-photo-proxy` page

### Debug Mode
Add `?debug=1` to any photo URL to see additional headers:
```
GET /api/photo?ref=Aap_uEA7...&w=480&debug=1
```

This implementation provides a robust, cost-effective solution for serving Google Places photos with excellent performance and user experience.

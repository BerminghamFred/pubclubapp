/**
 * Cloudflare Workers configuration for photo proxy caching
 * Deploy this as a Cloudflare Worker or use in your existing Worker
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle photo proxy requests
    if (url.pathname.startsWith('/api/photo')) {
      return handlePhotoProxy(request, env);
    }
    
    // For other requests, forward to your Next.js app
    return fetch(request);
  }
};

async function handlePhotoProxy(request, env) {
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref');
  const width = url.searchParams.get('w') || '480';
  
  if (!ref) {
    return new Response(JSON.stringify({ error: 'Missing photo reference' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Build cache key
  const cacheKey = `photo:${ref}:${width}`;
  
  // Try to get from cache first
  const cache = caches.default;
  let response = await cache.match(request);
  
  if (response) {
    console.log('Cache hit for photo:', cacheKey);
    return response;
  }
  
  console.log('Cache miss for photo:', cacheKey);
  
  // Build Google Places API URL
  const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
  googleUrl.searchParams.set('photo_reference', ref);
  googleUrl.searchParams.set('maxwidth', width);
  googleUrl.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
  
  try {
    // Fetch from Google Places API
    const googleResponse = await fetch(googleUrl.toString(), {
      headers: {
        'User-Agent': 'pubclub-photo-proxy/1.0'
      }
    });
    
    if (!googleResponse.ok) {
      return new Response(JSON.stringify({ 
        error: `Google API error: ${googleResponse.status}` 
      }), {
        status: googleResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const imageData = await googleResponse.arrayBuffer();
    
    // Create response with caching headers
    response = new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': googleResponse.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
        'X-Source': 'google-places-photo',
        'X-Photo-Reference': ref,
        'X-Requested-Width': width,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
    // Cache the response for 7 days
    await cache.put(request, response.clone());
    
    return response;
    
  } catch (error) {
    console.error('Photo proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch photo' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cloudflare Workers environment variables
// Add these in your Cloudflare Workers dashboard:
// GOOGLE_MAPS_API_KEY = your_google_maps_api_key_here

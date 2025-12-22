export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Server-side API key only
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DEFAULT_TTL = Number(process.env.PHOTO_CACHE_TTL_SECONDS ?? 604800);
const MAXWIDTH_DEFAULT = Number(process.env.PHOTO_CACHE_MAXWIDTH_DEFAULT ?? 480);
const MAXWIDTH_MAX = Number(process.env.PHOTO_CACHE_MAXWIDTH_MAX ?? 1280);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB max
const REQUEST_TIMEOUT_MS = 8000;
const USER_AGENT = "pubclub-photo-proxy/1.0";

// In-memory cache for place_id -> photo_reference lookups (24h TTL)
interface PlaceCacheEntry {
  photoReference: string | null;
  timestamp: number;
}

const placeCache = new Map<string, PlaceCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback image path
const FALLBACK_IMAGE_PATH = path.join(process.cwd(), 'public', 'images', 'pub-fallback.jpg');

/**
 * Get fallback image - returns a simple SVG if file doesn't exist
 */
async function getFallbackImage(): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    if (fs.existsSync(FALLBACK_IMAGE_PATH)) {
      const buffer = await fs.promises.readFile(FALLBACK_IMAGE_PATH);
      return { buffer, contentType: 'image/jpeg' };
    }
  } catch (error) {
    console.error('Error reading fallback image:', error);
  }
  
  // Generate a simple SVG fallback
  const svg = `<svg width="480" height="320" xmlns="http://www.w3.org/2000/svg">
    <rect width="480" height="320" fill="#08d78c" opacity="0.2"/>
    <text x="240" y="160" font-family="Arial" font-size="48" text-anchor="middle" fill="#08d78c">🍺</text>
  </svg>`;
  return { buffer: Buffer.from(svg), contentType: 'image/svg+xml' };
}

/**
 * Return fallback image response
 */
async function returnFallbackImage(): Promise<NextResponse> {
  const { buffer, contentType } = await getFallbackImage();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Source': 'fallback',
    },
  });
}

/**
 * Extract photo_reference from Google Places photo URL
 */
function extractPhotoReference(photoUrl: string): string | null {
  try {
    const url = new URL(photoUrl);
    return url.searchParams.get('photo_reference');
  } catch {
    // Try regex fallback
    const match = photoUrl.match(/photo_reference=([^&]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Fetch photo using legacy Google Places API (photo_reference)
 */
async function fetchPhotoByReference(
  photoReference: string,
  requestedWidth: number
): Promise<{ success: true; buffer: Buffer; contentType: string } | { success: false; status: number; message: string }> {
  const googleUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
  googleUrl.searchParams.set("photo_reference", photoReference);
  googleUrl.searchParams.set("maxwidth", String(requestedWidth));
  googleUrl.searchParams.set("key", GOOGLE_API_KEY!);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(googleUrl.toString(), {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/*",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "unknown";
      const errorText = await res.text().catch(() => "Unable to read error body");
      
      console.error(`[Photo API] Legacy API error: ${res.status} ${res.statusText}`);
      console.error(`[Photo API] Content-Type: ${contentType}`);
      console.error(`[Photo API] Error body: ${errorText.substring(0, 200)}`);
      
      return {
        success: false,
        status: res.status,
        message: `Google Places Photo API error: ${res.status}`,
      };
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    if (!contentType.startsWith("image/")) {
      console.error(`[Photo API] Invalid content type: ${contentType}`);
      return {
        success: false,
        status: 502,
        message: "Invalid content type from Google Places API",
      };
    }

    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      console.warn(`[Photo API] Image too large: ${arrayBuffer.byteLength} bytes`);
      return {
        success: false,
        status: 413,
        message: "Image too large",
      };
    }

    return {
      success: true,
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error("[Photo API] Network error:", err);
    return {
      success: false,
      status: 504,
      message: "Failed to fetch photo from Google Places API",
    };
  }
}

/**
 * Fetch photo using Places API (New) - photo name
 */
async function fetchPhotoByName(
  photoName: string,
  requestedWidth: number
): Promise<{ success: true; buffer: Buffer; contentType: string } | { success: false; status: number; message: string }> {
  const widthCandidates = Array.from(
    new Set([
      requestedWidth,
      Math.max(64, Math.floor(requestedWidth * 0.75)),
      320,
      240,
      160,
    ])
  ).filter((width) => width >= 64 && width <= MAXWIDTH_MAX);

  for (const width of widthCandidates) {
    const googleUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${GOOGLE_API_KEY}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(googleUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*",
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "unknown";
        const errorText = await res.text().catch(() => "Unable to read error body");
        
        console.error(`[Photo API] New API error: ${res.status} ${res.statusText}`);
        console.error(`[Photo API] Content-Type: ${contentType}`);
        console.error(`[Photo API] Error body: ${errorText.substring(0, 200)}`);
        
        // If 403, try next width or fall back
        if (res.status === 403 || res.status === 404) {
          continue; // Try next width
        }
        
        return {
          success: false,
          status: res.status,
          message: `Google Places Photo API error: ${res.status}`,
        };
      }

      const contentType = res.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await res.arrayBuffer();

      if (!contentType.startsWith("image/")) {
        continue; // Try next width
      }

      if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
        continue; // Try smaller width
      }

      return {
        success: true,
        buffer: Buffer.from(arrayBuffer),
        contentType,
      };
    } catch (err) {
      clearTimeout(timeout);
      if (width === widthCandidates[widthCandidates.length - 1]) {
        // Last attempt failed
        console.error("[Photo API] Network error:", err);
        return {
          success: false,
          status: 504,
          message: "Failed to fetch photo from Google Places API",
        };
      }
      // Try next width
      continue;
    }
  }

  return {
    success: false,
    status: 502,
    message: "Unable to fetch photo from Google Places API",
  };
}

/**
 * Fetch place details and extract photo_reference (with caching)
 */
async function fetchPlacePhotoReference(placeId: string): Promise<string | null> {
  // Check cache first
  const cached = placeCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.photoReference;
  }

  const placeUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_API_KEY}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const placeRes = await fetch(placeUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    if (!placeRes.ok) {
      const contentType = placeRes.headers.get("content-type") || "unknown";
      const errorText = await placeRes.text().catch(() => "Unable to read error body");
      
      console.error(`[Photo API] Place Details error: ${placeRes.status} ${placeRes.statusText}`);
      console.error(`[Photo API] Content-Type: ${contentType}`);
      console.error(`[Photo API] Error body: ${errorText.substring(0, 200)}`);
      
      // Cache negative result for 1 hour
      placeCache.set(placeId, { photoReference: null, timestamp: Date.now() });
      return null;
    }

    const placeData = await placeRes.json();
    
    if (!placeData.photos || placeData.photos.length === 0) {
      placeCache.set(placeId, { photoReference: null, timestamp: Date.now() });
      return null;
    }

    // Try to get photo_reference from first photo (legacy format)
    // If not available, we'll use photo.name for new API
    const firstPhoto = placeData.photos[0];
    const photoReference = firstPhoto?.photoReference || null;
    
    // Cache the result
    placeCache.set(placeId, { photoReference, timestamp: Date.now() });
    
    return photoReference;
  } catch (err) {
    clearTimeout(timeout);
    console.error("[Photo API] Place Details fetch error:", err);
    placeCache.set(placeId, { photoReference: null, timestamp: Date.now() });
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Validate API key at startup
    if (!GOOGLE_API_KEY) {
      console.error("[Photo API] GOOGLE_MAPS_API_KEY not configured");
      return returnFallbackImage();
    }

    const { searchParams } = new URL(req.url);
    const placeId = (searchParams.get("place_id") || "").trim();
    const photoName = (searchParams.get("photo_name") || "").trim();
    const photoRef = (searchParams.get("ref") || "").trim(); // Legacy support

    if (!placeId && !photoName && !photoRef) {
      console.error("[Photo API] Missing place_id, photo_name, or ref parameter");
      return returnFallbackImage();
    }

    const reqWidth = Number(searchParams.get("w") || MAXWIDTH_DEFAULT);
    const requestedWidth = Math.max(64, Math.min(reqWidth, MAXWIDTH_MAX));

    // Priority 1: Use photo_reference (legacy API - most reliable)
    if (photoRef) {
      const result = await fetchPhotoByReference(photoRef, requestedWidth);
      if (result.success) {
        return new NextResponse(result.buffer, {
          status: 200,
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": `public, max-age=${DEFAULT_TTL}, s-maxage=${DEFAULT_TTL}, stale-while-revalidate=86400`,
            "X-Source": "google-places-legacy",
            "X-Photo-Reference": photoRef,
            "X-Requested-Width": String(requestedWidth),
          },
        });
      }
      // Fall through to fallback
    }

    // Priority 2: Use photo_name (Places API New)
    if (photoName) {
      const result = await fetchPhotoByName(photoName, requestedWidth);
      if (result.success) {
        return new NextResponse(result.buffer, {
          status: 200,
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": `public, max-age=${DEFAULT_TTL}, s-maxage=${DEFAULT_TTL}, stale-while-revalidate=86400`,
            "X-Source": "google-places-api-new",
            "X-Photo-Name": photoName,
            "X-Requested-Width": String(requestedWidth),
          },
        });
      }
      // Fall through to place_id lookup or fallback
    }

    // Priority 3: Use place_id to lookup photo_reference
    if (placeId) {
      const photoReference = await fetchPlacePhotoReference(placeId);
      
      if (photoReference) {
        const result = await fetchPhotoByReference(photoReference, requestedWidth);
        if (result.success) {
          return new NextResponse(result.buffer, {
            status: 200,
            headers: {
              "Content-Type": result.contentType,
              "Cache-Control": `public, max-age=${DEFAULT_TTL}, s-maxage=${DEFAULT_TTL}, stale-while-revalidate=86400`,
              "X-Source": "google-places-legacy-via-place-id",
              "X-Place-ID": placeId,
              "X-Requested-Width": String(requestedWidth),
            },
          });
        }
      }
      
      // If place_id lookup failed, try fetching photo_name from place details
      // (This would require another API call, but let's skip it for now and use fallback)
    }

    // All methods failed - return fallback image
    console.warn(`[Photo API] All photo fetch methods failed for place_id=${placeId}, photo_name=${photoName}, ref=${photoRef}`);
    return returnFallbackImage();

  } catch (error) {
    console.error("[Photo API] Unexpected error:", error);
    return returnFallbackImage();
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

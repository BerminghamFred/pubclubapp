import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const DEFAULT_TTL = Number(process.env.PHOTO_CACHE_TTL_SECONDS ?? 604800);
const MAXWIDTH_DEFAULT = Number(process.env.PHOTO_CACHE_MAXWIDTH_DEFAULT ?? 480);
const MAXWIDTH_MAX = Number(process.env.PHOTO_CACHE_MAXWIDTH_MAX ?? 1280);

// Use default Node.js runtime on Vercel (avoid explicit edge runtime)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = (searchParams.get("place_id") || "").trim();
    const photoName = (searchParams.get("photo_name") || "").trim();
    
    if (!placeId && !photoName) {
      return NextResponse.json({ error: "Missing place_id or photo_name parameter" }, { status: 400 });
    }

    // Validate and clamp width parameter
    const reqWidth = Number(searchParams.get("w") || MAXWIDTH_DEFAULT);
    const width = Math.max(64, Math.min(reqWidth, MAXWIDTH_MAX));

    let googleUrl: string;

    if (photoName) {
      // Direct photo fetch using photo name
      googleUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${GOOGLE_API_KEY}`;
    } else {
      // First get photo info from place, then fetch the photo
      const placeUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_API_KEY}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      let placeRes: Response;
      try {
        placeRes = await fetch(placeUrl, {
          method: "GET",
          signal: controller.signal,
          headers: { 
            "User-Agent": "pubclub-photo-proxy/1.0",
            "Accept": "application/json"
          },
        });
      } catch (err) {
        clearTimeout(timeout);
        console.error("Google Places API fetch error:", err);
        return NextResponse.json({ 
          error: "Failed to fetch place details from Google Places API" 
        }, { status: 504 });
      }
      
      clearTimeout(timeout);

      if (!placeRes.ok) {
        console.error(`Google Places API error: ${placeRes.status} ${placeRes.statusText}`);
        return NextResponse.json({ 
          error: `Google Places API error: ${placeRes.status}` 
        }, { status: placeRes.status });
      }

      const placeData = await placeRes.json();
      
      if (!placeData.photos || placeData.photos.length === 0) {
        return NextResponse.json({ 
          error: "No photos available for this place" 
        }, { status: 404 });
      }

      // Use the first photo
      const photo = placeData.photos[0];
      googleUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${width}&key=${GOOGLE_API_KEY}`;
    }

    // Fetch the actual photo
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    let res: Response;
    try {
      res = await fetch(googleUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { 
          "User-Agent": "pubclub-photo-proxy/1.0",
          "Accept": "image/*"
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error("Google Places Photo fetch error:", err);
      return NextResponse.json({ 
        error: "Failed to fetch photo from Google Places API" 
      }, { status: 504 });
    }
    
    clearTimeout(timeout);

    // Handle Google API errors
    if (!res.ok) {
      console.error(`Google Places Photo API error: ${res.status} ${res.statusText}`);
      return NextResponse.json({ 
        error: `Google Places Photo API error: ${res.status}` 
      }, { status: res.status });
    }

    // Get content type and image data
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    // Validate that we got an image
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ 
        error: "Invalid content type from Google Places API" 
      }, { status: 502 });
    }

    // Validate image size (prevent abuse)
    const maxSize = 5 * 1024 * 1024; // 5MB max
    if (arrayBuffer.byteLength > maxSize) {
      return NextResponse.json({ 
        error: "Image too large" 
      }, { status: 413 });
    }

    // Build response headers with aggressive caching
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${DEFAULT_TTL}, s-maxage=${DEFAULT_TTL}, stale-while-revalidate=86400`,
      "X-Source": "google-places-api-new",
      "X-Place-ID": placeId || "unknown",
      "X-Photo-Name": photoName || "unknown",
      "X-Requested-Width": String(width),
      "X-Cache-TTL": String(DEFAULT_TTL),
    });

    // Add any attribution headers from Google if present
    const attribution = res.headers.get("X-Attribution");
    if (attribution) {
      headers.set("X-Attribution", attribution);
    }

    // Add CORS headers for CDN compatibility
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET");
    headers.set("Access-Control-Max-Age", "86400");

    return new NextResponse(arrayBuffer, { 
      status: 200, 
      headers 
    });

  } catch (error) {
    console.error("Photo proxy error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
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

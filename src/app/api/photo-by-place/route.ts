import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const DEFAULT_TTL = Number(process.env.PHOTO_CACHE_TTL_SECONDS ?? 604800);
const MAXWIDTH_DEFAULT = Number(process.env.PHOTO_CACHE_MAXWIDTH_DEFAULT ?? 480);
const MAXWIDTH_MAX = Number(process.env.PHOTO_CACHE_MAXWIDTH_MAX ?? 1280);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB max
const REQUEST_TIMEOUT_MS = 8000;
const USER_AGENT = "pubclub-photo-proxy/1.0";

type PhotoSuccess = {
  success: true;
  arrayBuffer: ArrayBuffer;
  contentType: string;
  width: number;
  photoName: string;
  placeId?: string;
  attribution?: string | null;
};

type PhotoError = {
  success: false;
  status: number;
  message: string;
};

type PhotoFetchFailureReason =
  | "image-too-large"
  | "network-error"
  | "not-image"
  | "http-error";

type PhotoFetchResult =
  | {
      success: true;
      arrayBuffer: ArrayBuffer;
      contentType: string;
      attribution?: string | null;
    }
  | {
      success: false;
      status: number;
      message: string;
      reason: PhotoFetchFailureReason;
    };

async function fetchPhotoFromUrl(
  googleUrl: string,
  requestedWidth: number
): Promise<PhotoFetchResult> {
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
      console.error(
        `Google Places Photo API error: ${res.status} ${res.statusText}`
      );
      return {
        success: false,
        status: res.status,
        message: `Google Places Photo API error: ${res.status}`,
        reason: "http-error",
      };
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    if (!contentType.startsWith("image/")) {
      return {
        success: false,
        status: 502,
        message: "Invalid content type from Google Places API",
        reason: "not-image",
      };
    }

    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      console.warn(
        `Google Places photo exceeded max size (${arrayBuffer.byteLength} bytes) for width ${requestedWidth}`
      );
      return {
        success: false,
        status: 413,
        message: "Image too large",
        reason: "image-too-large",
      };
    }

    return {
      success: true,
      arrayBuffer,
      contentType,
      attribution: res.headers.get("X-Attribution"),
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error("Google Places Photo fetch error:", err);
    return {
      success: false,
      status: 504,
      message: "Failed to fetch photo from Google Places API",
      reason: "network-error",
    };
  }
}

async function tryFetchPhotoByName(
  photoName: string,
  requestedWidth: number
): Promise<PhotoSuccess | PhotoError> {
  const widthCandidates = Array.from(
    new Set([
      requestedWidth,
      Math.max(64, Math.floor(requestedWidth * 0.75)),
      320,
      240,
      160,
    ])
  ).filter((width) => width >= 64 && width <= MAXWIDTH_MAX);

  let lastError: PhotoError | null = null;

  for (const width of widthCandidates) {
    const googleUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${GOOGLE_API_KEY}`;
    const result = await fetchPhotoFromUrl(googleUrl, width);

    if (result.success) {
      return {
        success: true,
        arrayBuffer: result.arrayBuffer,
        contentType: result.contentType,
        width,
        photoName,
        attribution: result.attribution,
      };
    }

    lastError = {
      success: false,
      status: result.status,
      message: result.message,
    };

    if (result.reason !== "image-too-large") {
      break;
    }
  }

  return (
    lastError ?? {
      success: false,
      status: 502,
      message: "Unable to fetch photo from Google Places API",
    }
  );
}

async function fetchPhotoByPlaceId(
  placeId: string,
  requestedWidth: number
): Promise<PhotoSuccess | PhotoError> {
  const placeUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let placeRes: Response;
  try {
    placeRes = await fetch(placeUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error("Google Places API fetch error:", err);
    return {
      success: false,
      status: 504,
      message: "Failed to fetch place details from Google Places API",
    };
  }

  clearTimeout(timeout);

  if (!placeRes.ok) {
    console.error(
      `Google Places API error: ${placeRes.status} ${placeRes.statusText}`
    );
    return {
      success: false,
      status: placeRes.status,
      message: `Google Places API error: ${placeRes.status}`,
    };
  }

  const placeData = await placeRes.json();

  if (!placeData.photos || placeData.photos.length === 0) {
    return {
      success: false,
      status: 404,
      message: "No photos available for this place",
    };
  }

  let lastError: PhotoError | null = null;

  for (const photo of placeData.photos) {
    if (!photo?.name) {
      continue;
    }

    const result = await tryFetchPhotoByName(photo.name, requestedWidth);

    if (result.success) {
      return {
        ...result,
        placeId,
      };
    }

    lastError = result;
  }

  return (
    lastError ?? {
      success: false,
      status: 502,
      message: "Unable to fetch photo from Place details",
    }
  );
}

function buildSuccessResponse(
  photo: PhotoSuccess,
  requestedPlaceId?: string,
  requestedPhotoName?: string
) {
  const headers = new Headers({
    "Content-Type": photo.contentType,
    "Cache-Control": `public, max-age=${DEFAULT_TTL}, s-maxage=${DEFAULT_TTL}, stale-while-revalidate=86400`,
    "X-Source": "google-places-api-new",
    "X-Place-ID": photo.placeId || requestedPlaceId || "unknown",
    "X-Photo-Name": photo.photoName || requestedPhotoName || "unknown",
    "X-Requested-Width": String(photo.width),
    "X-Cache-TTL": String(DEFAULT_TTL),
  });

  if (photo.attribution) {
    headers.set("X-Attribution", photo.attribution);
  }

  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET");
  headers.set("Access-Control-Max-Age", "86400");

  return new NextResponse(photo.arrayBuffer, {
    status: 200,
    headers,
  });
}

// Use default Node.js runtime on Vercel (avoid explicit edge runtime)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = (searchParams.get("place_id") || "").trim();
    const photoName = (searchParams.get("photo_name") || "").trim();

    if (!placeId && !photoName) {
      return NextResponse.json(
        { error: "Missing place_id or photo_name parameter" },
        { status: 400 }
      );
    }

    const reqWidth = Number(searchParams.get("w") || MAXWIDTH_DEFAULT);
    const requestedWidth = Math.max(64, Math.min(reqWidth, MAXWIDTH_MAX));

    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Google Maps API key is not configured" },
        { status: 500 }
      );
    }

    if (photoName) {
      const photoResult = await tryFetchPhotoByName(photoName, requestedWidth);

      if (photoResult.success) {
        return buildSuccessResponse(photoResult, placeId, photoName);
      }

      if (!placeId) {
        return NextResponse.json(
          { error: photoResult.message },
          { status: photoResult.status }
        );
      }

      console.warn(
        `Direct photo fetch failed for ${photoName} (${photoResult.status}). Falling back to place lookup.`
      );
    }

    if (placeId) {
      const photoResult = await fetchPhotoByPlaceId(placeId, requestedWidth);

      if (photoResult.success) {
        return buildSuccessResponse(photoResult, placeId, photoName);
      }

      return NextResponse.json(
        { error: photoResult.message },
        { status: photoResult.status }
      );
    }

    return NextResponse.json(
      { error: "Unable to resolve photo source" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Photo proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

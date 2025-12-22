/**
 * Utility functions for handling Google Places photos with caching
 * Updated for Google Places API (New)
 */

export interface PhotoUrlOptions {
  ref?: string; // Old photo reference format
  photoName?: string; // New photo name format
  placeId?: string; // Place ID for new API
  width?: number;
  fallbackUrl?: string;
}

/**
 * Generate a cached photo URL using our proxy API
 * @param options Photo options (supports both old and new API formats)
 * @returns URL string for the cached photo
 */
export function getCachedPhotoUrl(options: PhotoUrlOptions): string {
  const { ref, photoName, placeId, width = 480 } = options;
  
  // Priority 1: Use new photo name format
  if (photoName) {
    const params = new URLSearchParams({
      photo_name: photoName,
      w: width.toString(),
    });
    if (placeId) {
      params.set("place_id", placeId);
    }
    return `/api/photo-by-place?${params.toString()}`;
  }
  
  // Priority 2: Use place ID to fetch photo
  if (placeId) {
    const params = new URLSearchParams({
      place_id: placeId,
      w: width.toString(),
    });
    return `/api/photo-by-place?${params.toString()}`;
  }
  
  // Priority 3: Fall back to old photo reference format (use photo-by-place route)
  if (ref) {
    const params = new URLSearchParams({
      ref: ref,
      w: width.toString(),
    });
    return `/api/photo-by-place?${params.toString()}`;
  }

  return options.fallbackUrl || '/images/placeholders/pub-default.webp';
}

/**
 * Generate multiple photo URLs for different sizes (responsive images)
 * @param options Photo reference and size options
 * @returns Object with different sized URLs
 */
export function getResponsivePhotoUrls(options: PhotoUrlOptions) {
  const { ref, photoName, placeId, fallbackUrl } = options;
  
  if (!photoName && !placeId && !ref) {
    const fallback = fallbackUrl || '/images/placeholders/pub-default.webp';
    return {
      small: fallback,
      medium: fallback,
      large: fallback,
    };
  }

  return {
    small: getCachedPhotoUrl({ ref, photoName, placeId, width: 320 }),
    medium: getCachedPhotoUrl({ ref, photoName, placeId, width: 480 }),
    large: getCachedPhotoUrl({ ref, photoName, placeId, width: 800 }),
  };
}

/**
 * Extract photo reference from Google Places photo URL
 * @param googleUrl Full Google Places photo URL
 * @returns Photo reference string or null
 */
export function extractPhotoReference(googleUrl: string): string | null {
  try {
    const url = new URL(googleUrl);
    return url.searchParams.get('photo_reference');
  } catch {
    // Try to extract from URL string if URL parsing fails
    const match = googleUrl.match(/photo_reference=([^&]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Check if a URL is a Google Places photo URL
 * @param url URL to check
 * @returns boolean
 */
export function isGooglePlacesPhotoUrl(url: string): boolean {
  return url.includes('maps.googleapis.com/maps/api/place/photo');
}

/**
 * Convert Google Places photo URL to cached URL
 * @param googleUrl Original Google Places photo URL
 * @param width Desired width (default 480)
 * @returns Cached photo URL or fallback
 */
export function convertToCachedUrl(googleUrl: string, width: number = 480): string {
  const ref = extractPhotoReference(googleUrl);
  if (!ref) {
    return '/images/placeholders/pub-default.webp';
  }
  
  return getCachedPhotoUrl({ ref, width });
}

/**
 * Generate Next.js Image component props for optimized loading
 * @param options Photo options
 * @returns Props object for Next.js Image component
 */
export function getImageProps(options: PhotoUrlOptions & { 
  alt: string; 
  className?: string;
  priority?: boolean;
}) {
  const { alt, className, priority = false, ...photoOptions } = options;
  const src = getCachedPhotoUrl(photoOptions);
  
  return {
    src,
    alt,
    className,
    priority,
    loading: priority ? 'eager' : 'lazy',
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px",
    style: { objectFit: 'cover' as const },
  };
}

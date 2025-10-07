'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCachedPhotoUrl, isGooglePlacesPhotoUrl, convertToCachedUrl } from '@/utils/photoUtils';

interface PubPagePhotoProps {
  src?: string;
  photoRef?: string; // Old format
  photoName?: string; // New format
  placeId?: string; // Place ID for new API
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fallbackIcon?: string;
}

export default function PubPagePhoto({
  src,
  photoRef,
  photoName,
  placeId,
  alt,
  width = 800,
  height = 600,
  className = "",
  priority = true,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px",
  fallbackIcon = "🍺"
}: PubPagePhotoProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('[PubPagePhoto] Loading timeout - showing fallback');
        setIsLoading(false);
        setImageError(true);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Use the new photo proxy system
  const getPhotoSrc = (): string | null => {
    // Debug: Log what we're receiving
    if (typeof window !== 'undefined') {
      console.log('[PubPagePhoto] Props:', { 
        photoName: photoName ? 'exists' : 'missing', 
        placeId: placeId ? 'exists' : 'missing', 
        src: src ? 'exists' : 'missing', 
        photoRef: photoRef ? 'exists' : 'missing', 
        width 
      });
    }
    
    // Priority 1: Use new photo name format (Google Places API New)
    if (photoName) {
      const url = getCachedPhotoUrl({ photoName, width });
      if (typeof window !== 'undefined') {
        console.log('[PubPagePhoto] Using photoName, URL:', url);
      }
      return url;
    }
    
    // Priority 2: Use place ID to fetch photo (Google Places API New)
    if (placeId) {
      const url = getCachedPhotoUrl({ placeId, width });
      if (typeof window !== 'undefined') {
        console.log('[PubPagePhoto] Using placeId, URL:', url);
      }
      return url;
    }
    
    // Priority 3: Use src URL, convert if it's a Google Places photo
    if (src) {
      if (isGooglePlacesPhotoUrl(src)) {
        return convertToCachedUrl(src, width);
      }
      return src;
    }

    if (typeof window !== 'undefined') {
      console.log('[PubPagePhoto] No valid photo source found');
    }
    return null;
  };

  const photoSrc = getPhotoSrc();

  const handleImageLoad = () => {
    console.log('[PubPagePhoto] Image loaded successfully');
    setIsLoading(false);
  };

  const handleImageError = (e: any) => {
    console.log('[PubPagePhoto] Image error:', e);
    setIsLoading(false);
    setImageError(true);
  };

  // Show fallback if no photo source
  if (!photoSrc) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[#08d78c]/20 ${className}`}>
        <div className="text-[#08d78c] text-6xl">{fallbackIcon}</div>
      </div>
    );
  }

  // Show loading state
  if (isLoading && !imageError) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  // Show fallback if error
  if (imageError) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[#08d78c]/20 ${className}`}>
        <div className="text-[#08d78c] text-6xl">{fallbackIcon}</div>
      </div>
    );
  }

  return (
    <Image
      src={photoSrc}
      alt={alt}
      width={width}
      height={height}
      className={`w-full h-full object-cover ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
      sizes={sizes}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
}

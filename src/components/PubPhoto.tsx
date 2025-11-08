'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getCachedPhotoUrl, isGooglePlacesPhotoUrl, convertToCachedUrl } from '@/utils/photoUtils';

interface PubPhotoProps {
  src?: string;
  photoRef?: string; // Old photo reference format
  photoName?: string; // New photo name format
  placeId?: string; // Place ID for new API
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fallbackIcon?: string;
  onError?: () => void;
}

export default function PubPhoto({
  src,
  photoRef,
  photoName,
  placeId,
  alt,
  width = 480,
  height = 320,
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 100vw, 480px",
  fallbackIcon = "🍺",
  onError
}: PubPhotoProps) {
  const [hasError, setHasError] = useState(false);

  // Determine the best photo source
  const getPhotoSrc = (): string | null => {
         // Debug: Log what we're receiving
         if (typeof window !== 'undefined') {
           console.log('[PubPhoto] Props:', { 
             photoName: photoName ? 'exists' : 'missing', 
             placeId: placeId ? 'exists' : 'missing', 
             src: src ? 'exists' : 'missing', 
             photoRef: photoRef ? 'exists' : 'missing', 
             width 
           });
         }
    
    // Priority 1: Use new photo name format (Google Places API New)
    if (photoName) {
      const url = getCachedPhotoUrl({ photoName, placeId, width });
           if (typeof window !== 'undefined') {
             console.log('[PubPhoto] Using photoName');
           }
      return url;
    }
    
    // Priority 2: Use place ID to fetch photo (Google Places API New)
    if (placeId) {
      const url = getCachedPhotoUrl({ placeId, width });
           if (typeof window !== 'undefined') {
             console.log('[PubPhoto] Using placeId');
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
    
    // Priority 4: Use old photo reference format (legacy support) - TEMPORARILY DISABLED
    // if (photoRef) {
    //   return getCachedPhotoUrl({ ref: photoRef, width });
    // }
    
           if (typeof window !== 'undefined') {
             console.log('[PubPhoto] No valid photo source found');
           }
    return null;
  };

  const photoSrc = getPhotoSrc();

  useEffect(() => {
    setHasError(false);
  }, [photoSrc]);

  if (!photoSrc || hasError) {
    // Show fallback placeholder
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[#08d78c]/20 ${className}`}>
        <div className="text-[#08d78c] text-4xl">{fallbackIcon}</div>
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
      onError={(e) => {
        console.warn(`Failed to load image: ${photoSrc}`);
        setHasError(true);
        
        // Show fallback if onError callback is provided
        if (onError) {
          onError();
        }
      }}
    />
  );
}

// Utility component for clickable pub photos
interface ClickablePubPhotoProps extends PubPhotoProps {
  href: string;
  hoverEffect?: boolean;
}

export function ClickablePubPhoto({ 
  href, 
  hoverEffect = true, 
  className = "",
  ...photoProps 
}: ClickablePubPhotoProps) {
  return (
    <a href={href} className="block">
      <div className={`relative overflow-hidden cursor-pointer ${hoverEffect ? 'group' : ''}`}>
        <PubPhoto
          {...photoProps}
          className={`${className} ${hoverEffect ? 'group-hover:scale-105 transition-transform duration-300' : ''}`}
        />
      </div>
    </a>
  );
}

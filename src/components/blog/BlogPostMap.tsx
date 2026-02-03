'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapLoader } from '@/hooks/useMapLoader';
import { useMapPins } from '@/hooks/useMapPins';

const DEFAULT_LONDON = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 12;

export interface BlogPostMapProps {
  mapConfig: { type: 'area' | 'amenity'; slug: string };
  /** Resolved area name (e.g. "Soho") when type is area - used for search filter */
  areaName?: string;
  /** Resolved amenity label (e.g. "Terrestrial TV") when type is amenity - used for search filter */
  amenityLabel?: string;
  caption?: string;
  height?: number;
}

export function BlogPostMap({
  mapConfig,
  areaName,
  amenityLabel,
  caption,
  height = 320,
}: BlogPostMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { isLoaded, error } = useMapLoader(true);

  const filters = {
    searchTerm: undefined as string | undefined,
    selectedArea: mapConfig.type === 'area' && areaName ? areaName : undefined,
    selectedAmenities: mapConfig.type === 'amenity' && amenityLabel ? [amenityLabel] : undefined,
    minRating: undefined as number | undefined,
    openingFilter: undefined as string | undefined,
  };

  useMapPins(map, filters);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || typeof window === 'undefined' || !window.google?.maps?.Map) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_LONDON,
      zoom: DEFAULT_ZOOM,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });
    setMap(mapInstance);

    return () => {
      setMap(null);
    };
  }, [isLoaded]);

  if (error) {
    return (
      <div className="rounded-lg bg-gray-100 flex items-center justify-center p-8" style={{ minHeight: height }}>
        <p className="text-gray-600 text-sm">Map unavailable: {error.message}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-lg bg-gray-100 flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#08d78c] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <div ref={mapRef} className="w-full bg-gray-100" style={{ height }} />
      {caption && (
        <p className="text-sm text-gray-500 mt-2 px-1">{caption}</p>
      )}
    </div>
  );
}

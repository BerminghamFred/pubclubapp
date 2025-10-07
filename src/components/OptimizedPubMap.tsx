'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface PubMarker {
  id: string;
  name: string;
  borough: string;
  lat: number;
  lng: number;
  rating: number;
  type: string;
  features: string[];
  address: string;
}

interface OptimizedPubMapProps {
  pubs: {
    id: string;
    name: string;
    borough: string;
    lat: number;
    lng: number;
    rating: number;
    type: string;
    features: string[];
    amenities?: string[];
    address: string;
  }[];
  onPubClick?: (pub: any) => void;
  onBoundsChanged?: (bounds: google.maps.LatLngBounds) => void;
  className?: string;
}

export default function OptimizedPubMap({ 
  pubs, 
  onPubClick, 
  onBoundsChanged,
  className = "h-96 w-full rounded-lg"
}: OptimizedPubMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loader = new Loader({
          apiKey: 'AIzaSyCUMtS8YR9mG1Phzlq2Z15WEIAe-ePYD28',
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();
        
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 51.5074, lng: -0.1278 }, // London center
          zoom: 10,
          styles: [
            {
              featureType: 'poi.business',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Add bounds changed listener
        if (onBoundsChanged) {
          map.addListener('bounds_changed', () => {
            const bounds = map.getBounds();
            if (bounds) {
              onBoundsChanged(bounds);
            }
          });
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Map initialization error:', err);
        setError(err.message || 'Failed to load map');
        setIsLoading(false);
      }
    };

    initMap();
  }, [onBoundsChanged]);

  // Update markers when pubs change
  useEffect(() => {
    if (!mapInstanceRef.current || !pubs.length) return;

    const map = mapInstanceRef.current;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    const markers = pubs.map(pub => {
      const marker = new google.maps.Marker({
        position: { lat: pub.lat, lng: pub.lng },
        map: map,
        title: pub.name,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#08d78c" stroke="white" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">🍺</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onPubClick) {
          onPubClick(pub);
        }
      });

      return marker;
    });

    markersRef.current = markers;

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      map.fitBounds(bounds);
    }

  }, [pubs, onPubClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      if (mapInstanceRef.current) {
        // Clean up map instance
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`${className} bg-red-50 border border-red-200 rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">⚠️ Map Error</div>
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto mb-2"></div>
          <div className="text-gray-600">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {pubs.length > 0 && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          Showing {pubs.length} pubs on map
        </div>
      )}
    </div>
  );
} 
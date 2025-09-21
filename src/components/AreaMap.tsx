'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';

interface Area {
  name: string;
  slug: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface AreaMapProps {
  area: Area;
}

export default function AreaMap({ area }: AreaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    // Only load map when component is visible (lazy loading)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoaded && !isLoading) {
          loadMap();
        }
      },
      { threshold: 0.1 }
    );

    if (mapRef.current) {
      observer.observe(mapRef.current);
    }

    return () => observer.disconnect();
  }, [isLoaded, isLoading]);

  const loadMap = async () => {
    if (typeof window === 'undefined' || !mapRef.current || isLoading) return;
    
    setIsLoading(true);

    try {
      // Use the existing Google Maps loader utility
      await loadGoogleMaps();
      initializeMap();
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 13,
      center: {
        lat: (area.bounds.north + area.bounds.south) / 2,
        lng: (area.bounds.east + area.bounds.west) / 2
      },
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Fit map to area bounds
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(area.bounds.south, area.bounds.west),
      new google.maps.LatLng(area.bounds.north, area.bounds.east)
    );
    mapInstance.fitBounds(bounds);

    setMap(mapInstance);

    // Load area pubs
    loadAreaPubs(mapInstance);
  };

  const loadAreaPubs = async (mapInstance: google.maps.Map) => {
    try {
      // Load all pubs in the area, not just the first 50
      const response = await fetch(`/api/areas/${area.slug}/pubs?limit=200`);
      const data = await response.json();
      
      if (data.pubs) {
        console.log(`Loading ${data.pubs.length} pubs for map`);
        let markersAdded = 0;
        data.pubs.forEach((pub: any) => {
          if (pub.lat && pub.lng) {
            markersAdded++;
            const marker = new google.maps.Marker({
              position: { lat: pub.lat, lng: pub.lng },
              map: mapInstance,
              title: pub.name,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#08d78c"/>
                    <circle cx="12" cy="12" r="6" fill="white"/>
                    <text x="12" y="16" text-anchor="middle" font-size="12" fill="#08d78c">🍺</text>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24)
              }
            });

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div class="p-2">
                  <h3 class="font-semibold text-gray-900 mb-1">${pub.name}</h3>
                  <div class="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <span class="text-yellow-400">★</span>
                    <span>${pub.rating.toFixed(1)}</span>
                    <span>•</span>
                    <span>${pub.reviewCount} reviews</span>
                  </div>
                  <a 
                    href="${pub.url}" 
                    class="text-[#08d78c] hover:text-[#06b875] font-medium text-sm"
                    target="_blank"
                  >
                    View Details →
                  </a>
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(mapInstance, marker);
            });
          }
        });
        console.log(`Added ${markersAdded} markers to map`);
      }
    } catch (error) {
      console.error('Error loading area pubs:', error);
    }
  };

  return (
    <div className="relative">
      <div 
        ref={mapRef}
        className="w-full h-96 md:h-[500px] rounded-lg shadow-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Loading state */}
      {(!isLoaded || isLoading) && (
        <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto mb-2"></div>
            <p className="text-gray-600">
              {isLoading ? 'Loading map...' : 'Map will load when you scroll here'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

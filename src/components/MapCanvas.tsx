'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleMapScript } from '@/hooks/useGoogleMapScript';

interface PubPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  photo: string;
}

interface Filters {
  searchTerm: string;
  selectedArea: string;
  minRating: number;
  openingFilter: string;
  selectedAmenities: string[];
}

interface MapCanvasProps {
  filters: Filters;
  onMarkersUpdate: (markers: PubPin[]) => void;
  onTotalUpdate: (total: number) => void;
  isMapLoaded?: boolean;
  mapLoadError?: Error | null;
}

// Helper functions
function debounce(fn: Function, ms: number) {
  let t: any;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function toBbox(bounds: google.maps.LatLngBounds): string {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`;
}

function openInfoWindow(marker: google.maps.Marker, pub: PubPin) {
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div style="width:260px; padding: 8px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <img 
            src="${pub.photo || '/images/placeholders/thumb.webp'}" 
            width="64" 
            height="64" 
            style="border-radius:8px; object-fit:cover;" 
            alt="${pub.name}"
          />
          <div>
            <div style="font-weight:600; margin-bottom: 4px;">${pub.name}</div>
            <div style="color: #666;">⭐ ${pub.rating || '—'} (${pub.reviewCount || 0} reviews)</div>
          </div>
        </div>
        <a 
          href="/pubs/${pub.id}" 
          style="display:inline-block; margin-top:8px; color:#08d78c; text-decoration:none; font-weight:500;"
        >
          View Details →
        </a>
      </div>
    `,
  });
  infoWindow.open({ 
    anchor: marker, 
    shouldFocus: false, 
    map: marker.getMap() as google.maps.Map 
  });
}

export function MapCanvas({ filters, onMarkersUpdate, onTotalUpdate, isMapLoaded, mapLoadError }: MapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalPubs, setTotalPubs] = useState(0);
  
  // Use loading state from parent or fallback to hook if not provided
  const shouldLoadScript = isMapLoaded === undefined;
  const { ready, error: scriptError } = useGoogleMapScript(shouldLoadScript);
  
  // Determine the actual loading state - prefer props over hook
  const actualReady = isMapLoaded !== undefined ? isMapLoaded : ready;
  const actualError = mapLoadError !== undefined ? mapLoadError : scriptError;

  // Fetch pins based on current map bounds and filters
  const fetchPins = useCallback(async (map: google.maps.Map) => {
    const bounds = map.getBounds();
    
    // If bounds are not available yet, use default London bounds or current center
    let bbox: string;
    if (!bounds) {
      const center = map.getCenter();
      if (center) {
        // Use a default bounding box around London if no bounds available yet
        const lat = center.lat();
        const lng = center.lng();
        const delta = 0.1; // ~11km radius
        bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
      } else {
        // Fallback to London bounds if no center either
        bbox = '-0.5,51.3,0.3,51.7';
      }
    } else {
      bbox = toBbox(bounds);
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    setError(null);

    try {
      const filtersParam = encodeURIComponent(JSON.stringify(filters));
      const url = `/api/pubs/search?bbox=${bbox}&filters=${filtersParam}&limit=500`;
      console.log('Fetching pins:', { bbox, filters, url });
      
      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Pins response:', { total: data.total, itemsCount: data.items?.length });
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Handle case where no items are returned
      if (!data.items || data.items.length === 0) {
        console.warn('No pub pins received from API');
        setTotalPubs(0);
        onMarkersUpdate([]);
        onTotalUpdate(0);
        return;
      }

      // Create new markers
      const newMarkers: google.maps.Marker[] = data.items.map((pub: PubPin) => {
        const marker = new google.maps.Marker({
          position: { lat: pub.lat, lng: pub.lng },
          map: map,
          title: pub.name,
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="22.5" cy="22.5" r="18" fill="#08d78c" stroke="white" stroke-width="3"/>
                <text x="22.5" y="30" text-anchor="middle" fill="white" font-size="18" font-weight="bold">🍺</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(45, 45),
            anchor: new google.maps.Point(22.5, 22.5),
          },
        });

        // Add click listener
        marker.addListener('click', () => {
          // Close any existing info window
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
          openInfoWindow(marker, pub);
          infoWindowRef.current = new google.maps.InfoWindow({
            content: `
              <div style="width:260px; padding: 8px;">
                <div style="display:flex; gap:8px; align-items:center;">
                  <img 
                    src="${pub.photo || '/images/placeholders/thumb.webp'}" 
                    width="64" 
                    height="64" 
                    style="border-radius:8px; object-fit:cover;" 
                    alt="${pub.name}"
                  />
                  <div>
                    <div style="font-weight:600; margin-bottom: 4px;">${pub.name}</div>
                    <div style="color: #666;">⭐ ${pub.rating || '—'} (${pub.reviewCount || 0} reviews)</div>
                  </div>
                </div>
                <a 
                  href="/pubs/${pub.id}" 
                  style="display:inline-block; margin-top:8px; color:#08d78c; text-decoration:none; font-weight:500;"
                >
                  View Details →
                </a>
              </div>
            `,
          });
          infoWindowRef.current.open({ 
            anchor: marker, 
            shouldFocus: false, 
            map: map 
          });
        });

        return marker;
      });

      markersRef.current = newMarkers;
      setTotalPubs(data.total);
      onMarkersUpdate(data.items);
      onTotalUpdate(data.total);

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error fetching pins:', err);
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, onMarkersUpdate, onTotalUpdate]);

  // Initialize map
  useEffect(() => {
    if (!actualReady || !mapRef.current || mapObj.current || actualError) return;
    
    let retryTimeout: NodeJS.Timeout | null = null;
    
    // Double-check that google.maps.Map is actually available with retry mechanism
    const initializeMap = () => {
      if (typeof window === 'undefined' || !window.google?.maps?.Map) {
        console.warn('google.maps.Map not yet available, retrying...');
        // Retry after a short delay since the API might still be initializing
        retryTimeout = setTimeout(initializeMap, 100);
        return;
      }

      try {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 51.5074, lng: -0.1278 }, // London center
          zoom: 11,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        });

        mapObj.current = map;

        // Debounced fetch function
        const debouncedFetch = debounce(() => fetchPins(map), 500);

        let idleListener: google.maps.MapsEventListener;
        let boundsListener: google.maps.MapsEventListener;

        // Wait for the map to be idle (fully rendered) before fetching pins
        idleListener = map.addListener('idle', () => {
          // Fetch pins on first idle and then use debounced version
          fetchPins(map);
          // Replace this listener with the debounced version
          google.maps.event.removeListener(idleListener);
          map.addListener('idle', debouncedFetch);
          boundsListener = map.addListener('bounds_changed', debouncedFetch);
        });

        return () => {
          if (idleListener) google.maps.event.removeListener(idleListener);
          if (boundsListener) google.maps.event.removeListener(boundsListener);
        };
      } catch (err) {
        console.error('Error initializing map:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize map'));
      }
    };

    // Start the initialization
    initializeMap();

    // Cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [actualReady, actualError, fetchPins]);

  // Update pins when filters change
  useEffect(() => {
    if (mapObj.current) {
      fetchPins(mapObj.current);
    }
  }, [filters, fetchPins]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      markersRef.current.forEach(marker => marker.setMap(null));
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, []);

  if (actualError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-6">
          <div className="text-red-500 mb-2">⚠️</div>
          <div className="text-gray-700">Error loading map</div>
          <div className="text-sm text-gray-500">{actualError.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Map container */}
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#08d78c] rounded-full animate-spin"></div>
            Loading pubs...
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-lg">
          <div className="text-sm text-red-600">
            ⚠️ {error.message}
          </div>
        </div>
      )}

      {/* Status pill - bottom left */}
      {totalPubs > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold text-gray-900">{totalPubs}</span> pubs
          </div>
        </div>
      )}
    </div>
  );
}

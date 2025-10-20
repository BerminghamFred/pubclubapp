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

function isPinInBounds(pin: PubPin, bounds: google.maps.LatLngBounds | null): boolean {
  if (!bounds || !pin.lat || !pin.lng) return true; // Show all if no bounds
  return bounds.contains(new google.maps.LatLng(pin.lat, pin.lng));
}


export function MapCanvas({ filters, onMarkersUpdate, onTotalUpdate, isMapLoaded, mapLoadError }: MapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const allPinsRef = useRef<PubPin[]>([]);
  const pinsLoadedRef = useRef<boolean>(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalPubs, setTotalPubs] = useState(0);
  
  // Use loading state from parent or fallback to hook if not provided
  const shouldLoadScript = isMapLoaded === undefined;
  const { ready, error: scriptError } = useGoogleMapScript(shouldLoadScript);
  
  // Determine the actual loading state - prefer props over hook
  const actualReady = isMapLoaded !== undefined ? isMapLoaded : ready;
  const actualError = mapLoadError !== undefined ? mapLoadError : scriptError;

  // Update marker visibility based on current map bounds (client-side only)
  const updateMarkerVisibility = useCallback((map: google.maps.Map) => {
    if (!pinsLoadedRef.current || markersRef.current.length === 0) return;

    const bounds = map.getBounds();
    console.log('Updating marker visibility for bounds');

    let visibleCount = 0;
    
    // Show/hide markers based on current bounds
    markersRef.current.forEach((marker, index) => {
      const pin = allPinsRef.current[index];
      if (pin && marker) {
        const isVisible = isPinInBounds(pin, bounds);
        marker.setMap(isVisible ? map : null);
        if (isVisible) visibleCount++;
      }
    });

    console.log(`Showing ${visibleCount} visible markers out of ${markersRef.current.length} total`);
  }, []);

  // Load ALL pins once on initial load and when filters change
  const loadAllPins = useCallback(async (map: google.maps.Map, isInitialLoad = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);

    try {
      const filtersParam = encodeURIComponent(JSON.stringify(filters));
      // Don't include bbox parameter to get ALL pins
      const url = `/api/pubs/search?filters=${filtersParam}&limit=2000`;
      console.log('Loading all pins:', { filters, url, isInitialLoad });
      
      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('All pins loaded:', { total: data.total, itemsCount: data.items?.length });
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Store all pins for client-side filtering
      allPinsRef.current = data.items || [];
      pinsLoadedRef.current = true;

      // Handle case where no items are returned
      if (!data.items || data.items.length === 0) {
        console.warn('No pub pins received from API');
        setTotalPubs(0);
        onMarkersUpdate([]);
        onTotalUpdate(0);
        return;
      }

      // Create markers for all pins but don't add them to map yet
      const allMarkers: google.maps.Marker[] = data.items.map((pub: PubPin) => {
        const marker = new google.maps.Marker({
          position: { lat: pub.lat, lng: pub.lng },
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
          
          // Recenter map to ensure the info window is visible
          const map = marker.getMap() as google.maps.Map;
          if (map) {
            // Pan to marker and recenter if needed to avoid clipping
            const position = marker.getPosition()!;
            map.panTo(position);
            
            // Add small offset to ensure info window is fully visible
            const offset = 100; // pixels
            const point = map.getProjection()?.fromLatLngToPoint(position);
            if (point) {
              const pixelOffset = new google.maps.Point(0, -offset);
              const newPoint = new google.maps.Point(point.x + pixelOffset.x, point.y + pixelOffset.y);
              const newPosition = map.getProjection()?.fromPointToLatLng(newPoint);
              if (newPosition) {
                map.panTo(newPosition);
              }
            }
          }
          infoWindowRef.current = new google.maps.InfoWindow({
            content: `
              <div class="custom-info-window" role="dialog" aria-labelledby="pub-name-${pub.id}" aria-describedby="pub-rating-${pub.id}">
                <style>
                  .custom-info-window {
                    width: 360px;
                    max-width: 90vw;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
                    border: 1px solid rgba(0, 0, 0, 0.06);
                    position: relative;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                    animation: fadeInScale 0.1s ease-out;
                  }
                  @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  .custom-info-window::after {
                    content: '';
                    position: absolute;
                    bottom: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 8px solid white;
                  }
                  .info-window-close {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: none;
                    font-size: 20px;
                    color: #666;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.15s ease;
                    z-index: 10;
                  }
                  .info-window-close:hover { background: #f5f5f5; color: #333; }
                  .info-window-header {
                    display: flex;
                    gap: 12px;
                    padding: 20px 20px 16px 20px;
                    padding-top: 52px;
                  }
                  .info-window-thumbnail {
                    width: 72px;
                    height: 72px;
                    border-radius: 8px;
                    object-fit: cover;
                    flex-shrink: 0;
                    background: #f5f5f5;
                  }
                  .info-window-content {
                    flex: 1;
                    min-width: 0;
                  }
                  .info-window-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 6px 0;
                    color: #1a1a1a;
                    line-height: 1.3;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  }
                  .info-window-rating {
                    font-size: 13px;
                    color: #666;
                    margin: 0 0 8px 0;
                    line-height: 1.4;
                  }
                  .info-window-amenities {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                  }
                  .info-window-chip {
                    background: rgba(8, 215, 140, 0.12);
                    color: #08d78c;
                    font-size: 12px;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-weight: 500;
                  }
                  .info-window-actions {
                    padding: 0 20px 16px 20px;
                  }
                  .info-window-btn {
                    width: 100%;
                    background: #08d78c;
                    color: black;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    margin-bottom: 12px;
                  }
                  .info-window-btn:hover { background: #06b875; }
                  .info-window-secondary {
                    display: flex;
                    gap: 16px;
                  }
                  .info-window-link {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #666;
                    text-decoration: none;
                    font-size: 13px;
                    cursor: pointer;
                    transition: color 0.15s ease;
                  }
                  .info-window-link:hover { color: #333; }
                  @media (max-width: 640px) {
                    .custom-info-window {
                      width: 100%;
                      max-width: 100%;
                      border-radius: 16px 16px 0 0;
                    }
                    .custom-info-window::after { display: none; }
                    .info-window-header { padding: 16px 16px 12px 16px; padding-top: 48px; }
                    .info-window-actions { padding: 0 16px 16px 16px; }
                  }
                </style>
                
                <button class="info-window-close" onclick="window.closeInfoWindow && window.closeInfoWindow()" aria-label="Close">×</button>
                  
                  <div class="info-window-header">
                    <img 
                      src="${pub.photo || '/images/placeholders/thumb.webp'}" 
                      alt="${pub.name}"
                      class="info-window-thumbnail"
                    />
                    <div class="info-window-content">
                      <h3 id="pub-name-${pub.id}" class="info-window-title" title="${pub.name}">
                        ${pub.name}
                      </h3>
                      <p id="pub-rating-${pub.id}" class="info-window-rating">
                        ${!pub.rating || pub.rating === 0 ? '⭐ New' : `⭐ ${pub.rating}${pub.reviewCount > 0 ? ` · ${pub.reviewCount} reviews` : ''}`}
                      </p>
                      ${(pub.amenities?.slice(0, 2) || []).length > 0 ? `
                        <div class="info-window-amenities">
                          ${(pub.amenities?.slice(0, 2) || []).map((amenity: string) => `<span class="info-window-chip">${amenity}</span>`).join('')}
                        </div>
                      ` : ''}
                    </div>
                  </div>

                  <div class="info-window-actions">
                    <button 
                      class="info-window-btn" 
                      onclick="window.location.href='/pubs/${pub.id}'"
                      tabindex="0"
                    >
                      View details
                    </button>
                    <div class="info-window-secondary">
                      <a 
                        href="https://www.google.com/maps/dir/?api=1&destination=${pub.lat},${pub.lng}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="info-window-link"
                        tabindex="0"
                      >
                        📍 Directions
                      </a>
                    </div>
                  </div>
                </div>
            `,
          });
          
          infoWindowRef.current.open({ 
            anchor: marker, 
            shouldFocus: false, 
            map: map,
            pixelOffset: new google.maps.Size(0, -10)
          });
          
          // Add global close function for the info window
          (window as any).closeInfoWindow = () => {
            if (infoWindowRef.current) {
              infoWindowRef.current.close();
            }
          };
        });

        return marker;
      });

      markersRef.current = allMarkers;
      setTotalPubs(data.total);
      onMarkersUpdate(data.items);
      onTotalUpdate(data.total);
      
      // Now update visibility based on current map bounds
      updateMarkerVisibility(map);

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error loading all pins:', err);
        setError(err);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
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

        // Load all pins initially (no API calls on map movement)
        loadAllPins(map, true);
        
        // Update visibility when map moves (client-side only, no API calls)
        const debouncedUpdateVisibility = debounce(() => updateMarkerVisibility(map), 300);
        const idleListener = map.addListener('idle', debouncedUpdateVisibility);

        return () => {
          if (idleListener) google.maps.event.removeListener(idleListener);
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
  }, [actualReady, actualError, loadAllPins]);

  // Update pins when filters change
  useEffect(() => {
    if (mapObj.current && pinsLoadedRef.current) {
      // Load new pins based on updated filters
      loadAllPins(mapObj.current, false);
    }
  }, [filters, loadAllPins]);

  // Handle keyboard events (ESC to close info window)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

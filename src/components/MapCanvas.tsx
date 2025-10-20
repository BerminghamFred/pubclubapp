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
  area: string;
  type: string;
  address: string;
  phone?: string;
  website?: string;
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
          // Close any existing info window without panning the map
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
          
          const map = marker.getMap() as google.maps.Map;
          if (!map) return;

          // Format rating display
          const formatRating = () => {
            if (!pub.rating || pub.rating === 0) {
              return '⭐ New';
            }
            return `⭐ ${pub.rating}${pub.reviewCount > 0 ? ` · ${pub.reviewCount} reviews` : ''}`;
          };

          // Show first 3-4 amenities and count remaining
          const showAmenities = () => {
            if (!pub.amenities || pub.amenities.length === 0) return '';
            
            const visibleAmenities = pub.amenities.slice(0, 4);
            const remainingCount = pub.amenities.length - visibleAmenities.length;
            
            const amenityChips = visibleAmenities.map(amenity => 
              `<span class="amenity-chip">${amenity}</span>`
            ).join('');
            
            const moreIndicator = remainingCount > 0 ? 
              `<span class="amenity-more">+${remainingCount} more</span>` : '';
              
            return `<div class="amenities-container">${amenityChips}${moreIndicator}</div>`;
          };

          // Format contact details
          const formatContact = () => {
            const contactItems = [];
            if (pub.address) {
              contactItems.push(`<div class="contact-item"><strong>📍</strong> ${pub.address}</div>`);
            }
            if (pub.phone) {
              contactItems.push(`<div class="contact-item"><strong>📞</strong> <a href="tel:${pub.phone}">${pub.phone}</a></div>`);
            }
            return contactItems.length > 0 ? `<div class="contact-details">${contactItems.join('')}</div>` : '';
          };

          // Create beautiful popup without Google Maps wrapper styling
          const popupContent = `
            <div class="pub-popup-container">
              <style>
                /* Override Google Maps InfoWindow default styling */
                .gm-style-iw, .gm-style-iw-d, .gm-style-iw-c {
                  padding: 0 !important;
                  background: transparent !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                }
                
                .pub-popup {
                  width: 210px;
                  max-width: 90vw;
                  background: white;
                  border-radius: 20px;
                  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
                  border: 1px solid rgba(0, 0, 0, 0.08);
                  position: relative;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  overflow: hidden;
                  animation: popupIn 0.15s ease-out;
                }
                
                @keyframes popupIn {
                  from { opacity: 0; transform: scale(0.9) translateY(10px); }
                  to { opacity: 1; transform: scale(1) translateY(0); }
                }
                
                .pub-popup::after {
                  content: '';
                  position: absolute;
                  bottom: -12px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 0;
                  height: 0;
                  border-left: 12px solid transparent;
                  border-right: 12px solid transparent;
                  border-top: 12px solid white;
                  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                }
                
                .popup-close {
                  position: absolute;
                  top: 16px;
                  right: 16px;
                  width: 36px;
                  height: 36px;
                  border: none;
                  background: rgba(255, 255, 255, 0.9);
                  backdrop-filter: blur(10px);
                  font-size: 22px;
                  color: #666;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 50%;
                  transition: all 0.2s ease;
                  z-index: 10;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
                
                .popup-close:hover { 
                  background: white; 
                  color: #333; 
                  transform: scale(1.05);
                }
                
                .popup-image {
                  width: 100%;
                  height: 120px;
                  object-fit: cover;
                  display: block;
                }
                
                .popup-content {
                  padding: 16px;
                }
                
                .popup-header {
                  margin-bottom: 12px;
                }
                
                .popup-title {
                  font-size: 18px;
                  font-weight: 700;
                  margin: 0 0 6px 0;
                  color: #1a1a1a;
                  line-height: 1.2;
                }
                
                .popup-rating {
                  font-size: 13px;
                  color: #666;
                  margin: 0 0 8px 0;
                }
                
                .amenities-container {
                  display: flex;
                  gap: 6px;
                  flex-wrap: wrap;
                  margin-bottom: 12px;
                }
                
                .amenity-chip {
                  background: rgba(8, 215, 140, 0.15);
                  color: #08d78c;
                  font-size: 11px;
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-weight: 600;
                }
                
                .amenity-more {
                  background: rgba(102, 102, 102, 0.15);
                  color: #666;
                  font-size: 11px;
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-weight: 500;
                }
                
                .contact-details {
                  margin-bottom: 16px;
                  padding: 12px;
                  background: #f8f9fa;
                  border-radius: 8px;
                }
                
                .contact-item {
                  display: flex;
                  align-items: flex-start;
                  gap: 6px;
                  margin-bottom: 6px;
                  font-size: 12px;
                  line-height: 1.3;
                }
                
                .contact-item:last-child {
                  margin-bottom: 0;
                }
                
                .contact-item a {
                  color: #08d78c;
                  text-decoration: none;
                }
                
                .contact-item a:hover {
                  text-decoration: underline;
                }
                
                .popup-actions {
                  margin-top: 16px;
                }
                
                .popup-btn {
                  width: 100%;
                  background: #08d78c;
                  color: black;
                  border: none;
                  border-radius: 10px;
                  padding: 12px 16px;
                  font-size: 14px;
                  font-weight: 700;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  text-decoration: none;
                  display: block;
                  text-align: center;
                }
                
                .popup-btn:hover { 
                  background: #06b875;
                  transform: translateY(-1px);
                  box-shadow: 0 4px 12px rgba(8, 215, 140, 0.3);
                }
                
                @media (max-width: 640px) {
                  .pub-popup {
                    width: 100%;
                    max-width: 100%;
                    border-radius: 20px 20px 0 0;
                    margin: 0;
                  }
                  .pub-popup::after { display: none; }
                  .popup-content { padding: 16px; }
                  .popup-title { font-size: 18px; }
                }
              </style>
              
              <div class="pub-popup" role="dialog" aria-labelledby="popup-title-${pub.id}" aria-describedby="popup-rating-${pub.id}">
                <button class="popup-close" onclick="window.closeInfoWindow && window.closeInfoWindow()" aria-label="Close">×</button>
                
                <img 
                  src="${pub.photo || '/images/placeholders/thumb.webp'}" 
                  alt="${pub.name}"
                  class="popup-image"
                />
                
                <div class="popup-content">
                  <div class="popup-header">
                    <h2 id="popup-title-${pub.id}" class="popup-title">${pub.name}</h2>
                    <p id="popup-rating-${pub.id}" class="popup-rating">${formatRating()}</p>
                    ${showAmenities()}
                  </div>
                  
                  ${formatContact()}
                  
                  <div class="popup-actions">
                    <a href="/pubs/${pub.id}" class="popup-btn">View Pub</a>
                  </div>
                </div>
              </div>
            </div>
          `;

          // Create and open info window with custom styling
          infoWindowRef.current = new google.maps.InfoWindow({
            content: popupContent,
            disableAutoPan: true, // Prevent map from panning
            pixelOffset: new google.maps.Size(0, -20)
          });
          
          infoWindowRef.current.open({
            anchor: marker,
            map: map,
            shouldFocus: false
          });
          
          // Add global close function
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

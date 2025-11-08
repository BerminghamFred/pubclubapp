'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleMapScript } from '@/hooks/useGoogleMapScript';
import { List } from 'lucide-react';
import { getCachedPhotoUrl } from '@/utils/photoUtils';

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
  photo?: string | null;
  photoName?: string | null;
  photoRef?: string | null;
  placeId?: string | null;
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
  onSwitchToListView?: () => void;
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

function createAreaClusterIcon(count: number): string {
  const size = count < 10 ? 50 : count < 100 ? 60 : 70;
  const fontSize = count < 10 ? '18' : count < 100 ? '20' : '22';
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#08d78c" stroke="white" stroke-width="3"/>
      <text x="${size/2}" y="${size/2 + 6}" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif">${count}</text>
    </svg>
  `;
}

function createPurplePubIcon(): string {
  return `
    <svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22.5" cy="22.5" r="18" fill="#9333ea" stroke="white" stroke-width="3"/>
      <text x="22.5" y="30" text-anchor="middle" fill="white" font-size="18" font-weight="bold">🍺</text>
    </svg>
  `;
}

export function MapCanvas({ filters, onMarkersUpdate, onTotalUpdate, isMapLoaded, mapLoadError, onSwitchToListView }: MapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const allPinsRef = useRef<PubPin[]>([]);
  const pinsLoadedRef = useRef<boolean>(false);
  const filtersRef = useRef(filters);
  const mapInitializedRef = useRef<boolean>(false);
  const visibleMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalPubs, setTotalPubs] = useState(0);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  
  // Use loading state from parent or fallback to hook if not provided
  const shouldLoadScript = isMapLoaded === undefined;
  const { ready, error: scriptError } = useGoogleMapScript(shouldLoadScript);
  
  // Determine the actual loading state - prefer props over hook
  const actualReady = isMapLoaded !== undefined ? isMapLoaded : ready;
  const actualError = mapLoadError !== undefined ? mapLoadError : scriptError;

  // Update filters ref whenever filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Helper function to create a pub marker
  const createPubMarker = useCallback((pub: PubPin, map: google.maps.Map): google.maps.Marker => {
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

    // Add click listener for popup
    marker.addListener('click', () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      
      const map = marker.getMap() as google.maps.Map;
      if (!map) return;

      // Reset previous selected marker to green
      if (selectedMarkerRef.current && selectedMarkerRef.current !== marker) {
        selectedMarkerRef.current.setIcon({
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22.5" cy="22.5" r="18" fill="#08d78c" stroke="white" stroke-width="3"/>
              <text x="22.5" y="30" text-anchor="middle" fill="white" font-size="18" font-weight="bold">🍺</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(45, 45),
          anchor: new google.maps.Point(22.5, 22.5),
        });
      }

      // Change clicked marker to purple
      marker.setIcon({
        url: `data:image/svg+xml,${encodeURIComponent(createPurplePubIcon())}`,
        scaledSize: new google.maps.Size(45, 45),
        anchor: new google.maps.Point(22.5, 22.5),
      });
      selectedMarkerRef.current = marker;

      const formatRating = () => {
        if (!pub.rating || pub.rating === 0) {
          return '⭐ New';
        }
        return `⭐ ${pub.rating}${pub.reviewCount > 0 ? ` · ${pub.reviewCount} reviews` : ''}`;
      };

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

      const fallbackImage = '/images/placeholders/thumb.webp';
      const derivedPhotoUrl = getCachedPhotoUrl({
        photoName: pub.photoName ?? undefined,
        placeId: (pub.placeId ?? pub.id) || undefined,
        ref: pub.photoRef ?? undefined,
        width: 320,
        fallbackUrl: fallbackImage,
      });
      const photoUrl = pub.photo ?? derivedPhotoUrl ?? fallbackImage;

      const popupContent = `
        <div class="pub-popup-container">
          <style>
            .gm-style-iw, .gm-style-iw-d, .gm-style-iw-c, .gm-style-iw-t {
              padding: 0 !important;
              background: transparent !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              overflow: visible !important;
            }
            
            .gm-style-iw-t::after, .gm-style-iw-t::before {
              display: none !important;
            }
            
            .gm-style-iw + div {
              display: none !important;
            }
            
            .pub-popup {
              width: 300px;
              max-width: 90vw;
              background: white;
              border-radius: 16px;
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
              height: 80px;
              object-fit: cover;
              display: block;
            }
            
            .popup-content {
              padding: 12px;
            }
            
            .popup-header {
              margin-bottom: 8px;
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
              gap: 4px;
              flex-wrap: wrap;
              margin-bottom: 8px;
            }
            
            .amenity-chip {
              background: rgba(8, 215, 140, 0.15);
              color: #08d78c;
              font-size: 10px;
              padding: 3px 6px;
              border-radius: 10px;
              font-weight: 600;
            }
            
            .amenity-more {
              background: rgba(102, 102, 102, 0.15);
              color: #666;
              font-size: 10px;
              padding: 3px 6px;
              border-radius: 10px;
              font-weight: 500;
            }
            
            .contact-details {
              margin-bottom: 12px;
              padding: 8px;
              background: #f8f9fa;
              border-radius: 6px;
            }
            
            .contact-item {
              display: flex;
              align-items: flex-start;
              gap: 4px;
              margin-bottom: 4px;
              font-size: 11px;
              line-height: 1.2;
              color: #333;
            }
            
            .contact-item:last-child {
              margin-bottom: 0;
            }
            
            .contact-item strong {
              color: #333;
            }
            
            .contact-item a {
              color: #08d78c;
              text-decoration: none;
            }
            
            .contact-item a:hover {
              text-decoration: underline;
            }
            
            .popup-actions {
              margin-top: 12px;
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
                border-radius: 16px 16px 0 0;
                margin: 0;
              }
              .pub-popup::after { display: none; }
              .popup-content { padding: 12px; }
              .popup-title { font-size: 18px; }
            }
          </style>
          
          <div class="pub-popup" role="dialog" aria-labelledby="popup-title-${pub.id}" aria-describedby="popup-rating-${pub.id}">
            <button class="popup-close" onclick="window.closeInfoWindow && window.closeInfoWindow()" aria-label="Close">×</button>
            
          <img 
            src="${photoUrl}" 
            alt="${pub.name}"
            class="popup-image"
            loading="lazy"
            decoding="async"
            onerror="this.onerror=null;this.src='${fallbackImage}';this.classList.add('fallback-image');"
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

      // Pan map to better center the marker with popup
      const latlng = marker.getPosition();
      if (latlng) {
        const bounds = map.getBounds();
        if (bounds) {
          // Calculate a lat offset to shift marker to 25% from bottom
          // Shifting map north (increasing lat) moves marker south visually
          const heightDiff = bounds.getNorthEast().lat() - bounds.getSouthWest().lat();
          const offsetLat = heightDiff * 0.25; // Shift map north to position marker at 25% from bottom
          
          map.panTo({
            lat: latlng.lat() + offsetLat,
            lng: latlng.lng()
          });
        }
      }

      infoWindowRef.current = new google.maps.InfoWindow({
        content: popupContent,
        disableAutoPan: true, // Disable to prevent double-panning
        pixelOffset: new google.maps.Size(0, -20)
      });
      
      infoWindowRef.current.open({ 
        anchor: marker, 
        map: map,
        shouldFocus: false
      });
      
      (window as any).closeInfoWindow = () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
      };
    });

    return marker;
  }, []);

  // Helper function to create an area cluster marker
  const createAreaClusterMarker = useCallback((areaName: string, count: number, centroid: { lat: number; lng: number }, map: google.maps.Map): google.maps.Marker => {
    const marker = new google.maps.Marker({
      position: { lat: centroid.lat, lng: centroid.lng },
      map: map,
      title: `${areaName} - ${count} pubs`,
      icon: {
        url: `data:image/svg+xml,${encodeURIComponent(createAreaClusterIcon(count))}`,
        scaledSize: new google.maps.Size(50, 50),
        anchor: new google.maps.Point(25, 25),
      },
      zIndex: google.maps.Marker.MAX_ZINDEX + 1,
    });

    marker.addListener('click', () => {
      // Expand this area to show individual pins
      setExpandedAreas(prev => new Set(prev).add(areaName));
      
      // Trigger map update
      setTimeout(() => updateAreaClusters(map), 0);
    });

    return marker;
  }, []);

  // Update area-based cluster markers
  const updateAreaClusters = useCallback((map: google.maps.Map) => {
    if (!pinsLoadedRef.current || allPinsRef.current.length === 0) return;

    const bounds = map.getBounds() ?? null;
    const zoom = map.getZoom() || 10;
    console.log(`Updating area clusters at zoom ${zoom}`);

    // Group pins by area
    const areaGroups = new Map<string, { pins: PubPin[], centroid: { lat: number; lng: number } }>();
    
    allPinsRef.current.forEach(pin => {
      if (!pin.area || pin.area.trim() === '') return; // Skip pubs without area
      
      const existing = areaGroups.get(pin.area) || { pins: [], centroid: { lat: 0, lng: 0 } };
      existing.pins.push(pin);
      areaGroups.set(pin.area, existing);
    });

    // Calculate centroids for each area
    areaGroups.forEach((group, areaName) => {
      const latSum = group.pins.reduce((sum, pin) => sum + pin.lat, 0);
      const lngSum = group.pins.reduce((sum, pin) => sum + pin.lng, 0);
      group.centroid = {
        lat: latSum / group.pins.length,
        lng: lngSum / group.pins.length
      };
    });

    // Track which markers should be visible
    const shouldBeVisible = new Set<string>();
    const newMarkers: google.maps.Marker[] = [];

    // Determine if we should show individual pins or clusters
    areaGroups.forEach((group, areaName) => {
      const isExpanded = expandedAreas.has(areaName);
      
      // Check if any pin in this area is in the current bounds
      const hasVisiblePins = bounds ? group.pins.some(pin => isPinInBounds(pin, bounds)) : true;
      
      // Auto-expand if zoom is high enough AND the area is visible in bounds
      const shouldAutoExpand = zoom >= 13 && hasVisiblePins;
      
      if ((isExpanded || shouldAutoExpand) && hasVisiblePins) {
        // Show individual pins for this expanded area (show ALL pins in the area, not just visible ones)
        group.pins.forEach(pin => {
          const markerKey = `pin_${pin.id}`;
          shouldBeVisible.add(markerKey);
          
          // Only create marker if it doesn't already exist
          let marker = visibleMarkersRef.current.get(markerKey);
          if (!marker) {
            marker = createPubMarker(pin, map);
            visibleMarkersRef.current.set(markerKey, marker);
          }
          
          newMarkers.push(marker);
        });
      } else if (hasVisiblePins && bounds) {
        // Check if cluster centroid is in bounds
        if (isPinInBounds({ lat: group.centroid.lat, lng: group.centroid.lng } as PubPin, bounds)) {
          // Show cluster marker for this area
          const clusterKey = `cluster_${areaName}`;
          shouldBeVisible.add(clusterKey);
          
          // Only create marker if it doesn't already exist
          let marker = visibleMarkersRef.current.get(clusterKey);
          if (!marker) {
            marker = createAreaClusterMarker(areaName, group.pins.length, group.centroid, map);
            visibleMarkersRef.current.set(clusterKey, marker);
          }
          
          newMarkers.push(marker);
        }
      }
    });

    // Hide markers that should no longer be visible
    visibleMarkersRef.current.forEach((marker, key) => {
      if (!shouldBeVisible.has(key)) {
        marker.setMap(null);
        visibleMarkersRef.current.delete(key);
      }
    });

    markersRef.current = newMarkers;
    console.log(`Showing ${markersRef.current.length} markers/clusters`);
  }, [expandedAreas]);

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
      const filtersParam = encodeURIComponent(JSON.stringify(filtersRef.current));
      // Don't include bbox parameter to get ALL pins
      const url = `/api/pubs/search?filters=${filtersParam}&limit=2000`;
      console.log('Loading all pins:', { filters: filtersRef.current, url, isInitialLoad });
      
      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('All pins loaded:', { total: data.total, itemsCount: data.items?.length });
      
      // Clear existing markers completely when filters change
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      visibleMarkersRef.current.forEach(marker => marker.setMap(null));
      visibleMarkersRef.current.clear();

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

      // Now use area-based clustering instead of direct marker creation
      setTotalPubs(data.total);
      onMarkersUpdate(data.items);
      onTotalUpdate(data.total);
      
      updateAreaClusters(map);

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
  }, [onMarkersUpdate, onTotalUpdate, updateAreaClusters]);

  // Initialize map
  useEffect(() => {
    if (!actualReady || !mapRef.current || mapObj.current || actualError || mapInitializedRef.current) return;
    
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
      const container = mapRef.current;
      if (!container) return; // Type guard for non-null container
      const map = new google.maps.Map(container, {
        center: { lat: 51.5074, lng: -0.1278 }, // London center
        zoom: 11,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
      });

      mapObj.current = map;
      mapInitializedRef.current = true;

        // Wait for map to be fully initialized before loading pins
        const initListener = map.addListener('idle', () => {
          console.log('Map is ready, loading pins...');
          loadAllPins(map, true);
          
          // Update area clusters when map is idle (client-side only, no API calls)
          // Only update on idle, not during movement, to avoid flashing
          map.addListener('idle', () => updateAreaClusters(map));
          
          // Remove the initial listener since we only need it once
          google.maps.event.removeListener(initListener);
        });

      return () => {
          if (initListener) google.maps.event.removeListener(initListener);
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

      {/* List View Button - top left */}
      {onSwitchToListView && (
        <button
          onClick={onSwitchToListView}
          className="absolute top-12 left-4 bg-white/90 backdrop-blur-sm text-gray-700 p-3 rounded-lg shadow-lg hover:bg-white transition-colors z-20 border border-gray-200 flex items-center gap-2"
          title="Switch to List View"
        >
          <List className="w-5 h-5" />
          <span className="font-medium">List View</span>
        </button>
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

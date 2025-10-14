'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

interface PubPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  area: string;
  type: string;
  amenities: string[];
  photo: string | null;
}

interface Filters {
  searchTerm?: string;
  selectedArea?: string;
  selectedAmenities?: string[];
  minRating?: number;
  openingFilter?: string;
}

// Debounce utility
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

export function useMapPins(map: google.maps.Map | null, filters: Filters) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalPubs, setTotalPubs] = useState(0);
  
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const loadedAreasRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Fetch pins for the current map bounds
  const fetchPins = useCallback(async () => {
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    try {
      setLoading(true);
      setError(null);

      // Get bounding box
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const bbox = `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`;

      // Create cache key
      const filterHash = JSON.stringify(filters);
      const cacheKey = `${bbox}|${filterHash}`;

      // Check if we've already loaded this area
      if (loadedAreasRef.current.has(cacheKey)) {
        setLoading(false);
        return;
      }

      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Build URL
      const params = new URLSearchParams({
        bbox,
        filters: encodeURIComponent(JSON.stringify(filters)),
        limit: '500',
      });

      const response = await fetch(`/api/pubs/search?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pubs: ${response.statusText}`);
      }

      const data = await response.json();
      const { items, total, hasMore } = data;

      setTotalPubs(total);

      // Create markers
      const newMarkers: google.maps.Marker[] = items.map((pub: PubPin) => {
        const marker = new google.maps.Marker({
          position: { lat: pub.lat, lng: pub.lng },
          title: pub.name,
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="12" fill="#08d78c" stroke="white" stroke-width="2"/>
                <text x="15" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🍺</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15),
          },
        });

        // Add click listener for info window
        marker.addListener('click', () => {
          // Close any existing info window
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }

          // Create info window content
          const content = `
            <div style="padding: 12px; min-width: 200px; max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${pub.photo ? `
                <div style="margin-bottom: 12px;">
                  <img src="${pub.photo}" alt="${pub.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px;" />
                </div>
              ` : ''}
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${pub.name}</h3>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">⭐ ${pub.rating.toFixed(1)}</span>
                <span style="font-size: 12px; color: #6b7280;">${pub.reviewCount} reviews</span>
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                📍 ${pub.area} • ${pub.type}
              </div>
              ${pub.amenities.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px;">
                  ${pub.amenities.slice(0, 3).map(a => 
                    `<span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 8px; font-size: 11px;">${a}</span>`
                  ).join('')}
                </div>
              ` : ''}
              <a href="/pubs/${encodeURIComponent(pub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}-${pub.id}" 
                 style="display: block; width: 100%; background: #08d78c; color: white; text-align: center; padding: 8px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                View Pub
              </a>
            </div>
          `;

          const infoWindow = new google.maps.InfoWindow({
            content,
          });

          infoWindow.open(map, marker);
          infoWindowRef.current = infoWindow;
        });

        return marker;
      });

      // Add to markers array
      markersRef.current = [...markersRef.current, ...newMarkers];

      // Update clusterer
      if (!clustererRef.current) {
        clustererRef.current = new MarkerClusterer({
          map,
          markers: markersRef.current,
          algorithm: new MarkerClusterer.GridAlgorithm({ maxZoom: 15 }),
        });
      } else {
        clustererRef.current.addMarkers(newMarkers);
      }

      // Mark this area as loaded
      loadedAreasRef.current.add(cacheKey);

      setLoading(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Error fetching pins:', err);
      setError(err);
      setLoading(false);
    }
  }, [map, filters]);

  // Debounced fetch function
  const debouncedFetch = useDebouncedCallback(fetchPins, 500);

  // Setup map listeners
  useEffect(() => {
    if (!map) return;

    // Fetch pins on initial idle
    const idleListener = map.addListener('idle', () => {
      debouncedFetch();
    });

    // Fetch pins when bounds change
    const boundsListener = map.addListener('bounds_changed', () => {
      debouncedFetch();
    });

    return () => {
      google.maps.event.removeListener(idleListener);
      google.maps.event.removeListener(boundsListener);
    };
  }, [map, debouncedFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      // Clean up clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      
      // Close info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      
      // Abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear loaded areas cache
      loadedAreasRef.current.clear();
    };
  }, []);

  // Clear markers when filters change significantly
  useEffect(() => {
    // Clear all markers and reset loaded areas
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    
    loadedAreasRef.current.clear();
    
    // Trigger new fetch
    if (map) {
      debouncedFetch();
    }
  }, [filters, map, debouncedFetch]);

  return {
    loading,
    error,
    totalPubs,
    markerCount: markersRef.current.length,
  };
}


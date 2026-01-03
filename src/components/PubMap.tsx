'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Pub {
  id: number;
  name: string;
  description: string;
  area: string;
  type: string;
  features: string[];
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  website?: string;
  openingHours: string;
  _internal?: {
    place_id: string;
    lat: number;
    lng: number;
    types: string;
    photo_url: string;
  };
}

interface PubMapProps {
  pubs: Pub[];
  selectedArea: string;
  selectedType: string;
  selectedFeatures: string[];
}

export default function PubMap({ pubs, selectedArea, selectedType, selectedFeatures }: PubMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  // Filter pubs based on current filters (client-side, no API calls)
  const filteredPubs = pubs.filter(pub => {
    const matchesArea = selectedArea === '' || selectedArea === 'All Areas' || pub.area === selectedArea;
    const matchesType = selectedType === '' || selectedType === 'All Types' || pub.type === selectedType;
    const matchesFeatures = selectedFeatures.length === 0 || 
                           selectedFeatures.every(feature => pub.features.includes(feature));
    
    return matchesArea && matchesType && matchesFeatures;
  });

  // Get pubs with valid coordinates
  const pubsWithCoordinates = filteredPubs.filter(pub => 
    pub._internal?.lat && pub._internal?.lng
  );

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        try {
          if (mapRef.current) {
            const mapInstance = new window.google.maps.Map(mapRef.current, {
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

            setMap(mapInstance);
            setMapError(null);
            setIsMapLoading(false);
            console.log('Map instance created successfully');
          }
        } catch (error) {
          console.error('Error creating map with existing Google Maps:', error);
          setMapError(`Failed to create map: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsMapLoading(false);
        }
        return;
      }

      // Get API key from environment variable
      const apiKey = process.env.NEXT_PUBLIC_MAPS_BROWSER_KEY || process.env.NEXT_PUBLIC_GMAPS_BROWSER_KEY;
      if (!apiKey) {
        throw new Error('Missing Google Maps API key. Please set NEXT_PUBLIC_MAPS_BROWSER_KEY or NEXT_PUBLIC_GMAPS_BROWSER_KEY in your environment variables.');
      }
      console.log('Using API key from environment variable');

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places']
      });

      try {
        console.log('Loading Google Maps...');
        const google = await loader.load();
        console.log('Google Maps loaded successfully');
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
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

          setMap(mapInstance);
          setMapError(null);
          setIsMapLoading(false);
          console.log('Map instance created successfully');
        }
      } catch (error) {
        console.error('Error loading Google Maps with Places library:', error);
        
        // Try loading without Places library as fallback
        try {
          console.log('Trying to load Google Maps without Places library...');
          const fallbackLoader = new Loader({
            apiKey: apiKey,
            version: 'weekly'
          });
          
          const google = await fallbackLoader.load();
          console.log('Google Maps loaded successfully without Places');
          
          if (mapRef.current) {
            const mapInstance = new google.maps.Map(mapRef.current, {
              center: { lat: 51.5074, lng: -0.1278 },
              zoom: 10,
              styles: [
                {
                  featureType: 'poi.business',
                  elementType: 'labels',
                  stylers: [{ visibility: 'off' }]
                }
              ]
            });

            setMap(mapInstance);
            setMapError(null);
            setIsMapLoading(false);
            console.log('Map instance created successfully (fallback)');
          }
        } catch (fallbackError) {
          console.error('Fallback Google Maps load also failed:', fallbackError);
          let errorMessage = 'Failed to load Google Maps';
          
          if (fallbackError instanceof Error) {
            if (fallbackError.message.includes('API_KEY_MALFORMED')) {
              errorMessage = 'Invalid API key format. Please check your Google Maps API key.';
            } else if (fallbackError.message.includes('API_KEY_INVALID')) {
              errorMessage = 'Invalid API key. Please verify your Google Maps API key is correct.';
            } else if (fallbackError.message.includes('QUOTA_EXCEEDED')) {
              errorMessage = 'API quota exceeded. Please check your Google Cloud billing.';
            } else if (fallbackError.message.includes('REQUEST_DENIED')) {
              errorMessage = 'API request denied. Please check API key restrictions and billing.';
            } else {
              errorMessage = `Failed to load Google Maps: ${fallbackError.message}`;
            }
          }
          
          setMapError(errorMessage);
          setIsMapLoading(false);
        }
      }
    };

    initMap();
  }, []);

  // Update markers when pubs or filters change (using local coordinates)
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Create markers for filtered pubs using stored coordinates
    pubsWithCoordinates.forEach(pub => {
      const marker = new google.maps.Marker({
        position: { lat: pub._internal!.lat, lng: pub._internal!.lng },
        map: map,
        title: pub.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#08d78c" stroke="#ffffff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">🍺</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      // Create info window with pub details
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; color: #08d78c; font-size: 16px;">${pub.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${pub.area}</p>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">⭐ ${pub.rating} (${pub.reviewCount} reviews)</p>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${pub.type}</p>
            <p style="margin: 0; color: #666; font-size: 12px;">${pub.address}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      map.fitBounds(bounds);
      
      // Adjust zoom if too close
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        const zoom = map.getZoom();
        if (zoom && zoom > 15) {
          map.setZoom(15);
        }
      });
    } else {
      // If no pubs, center on London
      map.setCenter({ lat: 51.5074, lng: -0.1278 });
      map.setZoom(10);
    }
  }, [map, pubsWithCoordinates]);

  // Handle location search (minimal API usage - only for geocoding user input)
  const handleLocationSearch = async () => {
    if (!searchLocation.trim() || !map) return;

    setIsLoading(true);
    
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: searchLocation });
      
      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        setUserLocation({ lat: location.lat(), lng: location.lng() });
        
        // Center map on searched location
        map.setCenter(location);
        map.setZoom(13);
        
        // Add user location marker
        new google.maps.Marker({
          position: location,
          map: map,
          title: 'Your Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold">📍</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
          }
        });

        // Highlight nearby pubs from searched location
        highlightNearbyPubs(location.lat(), location.lng());
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Location not found. Please try a different search term.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get user's current location (minimal API usage)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        if (map) {
          const location = new google.maps.LatLng(latitude, longitude);
          map.setCenter(location);
          map.setZoom(13);
          
          // Add user location marker
          new google.maps.Marker({
            position: location,
            map: map,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
                  <text x="12" y="16" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold">📍</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12)
            }
          });

          // Highlight nearby pubs (within 2km)
          highlightNearbyPubs(latitude, longitude);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please try searching for a location instead.');
        setIsLoading(false);
      }
    );
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Highlight nearby pubs when user sets location
  const highlightNearbyPubs = (userLat: number, userLng: number) => {
    const nearbyPubs = pubsWithCoordinates.filter(pub => {
      if (!pub._internal?.lat || !pub._internal?.lng) return false;
      const distance = calculateDistance(userLat, userLng, pub._internal.lat, pub._internal.lng);
      return distance <= 2; // Within 2km
    });

    if (nearbyPubs.length > 0) {
      // Show info about nearby pubs
      const infoContent = `
        <div style="padding: 8px; max-width: 300px;">
          <h3 style="margin: 0 0 8px 0; color: #08d78c; font-size: 16px;">Nearby Pubs Found!</h3>
          <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">Found ${nearbyPubs.length} pubs within 2km of your location:</p>
          ${nearbyPubs.slice(0, 3).map(pub => {
            const distance = calculateDistance(userLat, userLng, pub._internal!.lat, pub._internal!.lng);
            return `<p style="margin: 2px 0; color: #666; font-size: 12px;">• ${pub.name} (${distance.toFixed(1)}km)</p>`;
          }).join('')}
          ${nearbyPubs.length > 3 ? `<p style="margin: 2px 0; color: #666; font-size: 12px;">...and ${nearbyPubs.length - 3} more</p>` : ''}
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent
      });

      // Show info window at user location
      const userLocation = new google.maps.LatLng(userLat, userLng);
      infoWindow.open(map, new google.maps.Marker({ position: userLocation, map: map }));
    }
  };

  // Show loading state while map initializes
  if (isMapLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Interactive Pub Map</h3>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if map failed to load
  if (mapError) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Interactive Pub Map</h3>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Map Loading Error</h3>
            <p className="text-gray-600 mb-4">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] text-black font-medium rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Map Header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Interactive Pub Map</h3>
        
        {/* Location Search */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Enter your location (e.g., 'Soho, London')"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
          />
          <button
            onClick={handleLocationSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] text-black font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
            title="Use my current location"
          >
            📍
          </button>
        </div>

        {/* Map Legend */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#08d78c] rounded-full"></div>
            <span>Pubs ({pubsWithCoordinates.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
        </div>

        {/* Efficiency Info */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <span>⚡</span>
            <span>
              <strong>Efficient:</strong> All {pubsWithCoordinates.length} pub locations loaded from local data 
              (no API calls for pub coordinates)
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-96 md:h-[500px]"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
} 
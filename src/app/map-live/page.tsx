'use client';

import { useState, useEffect, useCallback } from 'react';
import { pubData } from '@/data/pubData';
import { Pub } from '@/data/types';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';

export default function MapLivePage() {
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapStatus, setMapStatus] = useState<string>('Initializing...');
  const [googleAvailable, setGoogleAvailable] = useState<boolean>(false);
  const [mapDiv, setMapDiv] = useState<HTMLDivElement | null>(null);
  const [mapCreated, setMapCreated] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [filteredPubs, setFilteredPubs] = useState<Pub[]>([]);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [currentMarkers, setCurrentMarkers] = useState<google.maps.Marker[]>([]);
  const [selectedRating, setSelectedRating] = useState<string>('0');
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());

  // Toggle amenity selection
  const toggleAmenity = useCallback((amenity: string) => {
    setSelectedAmenities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(amenity)) {
        newSet.delete(amenity);
      } else {
        newSet.add(amenity);
      }
      return newSet;
    });
  }, []);

  // Load pubs data FIRST (like the working test page)
  useEffect(() => {
    console.log('MapLivePage: Component mounted');
    console.log('MapLivePage: Total pubs in pubData:', pubData.length);
    
    // Get all pubs (not just 10 like test page)
    const allPubs = pubData;
    console.log('MapLivePage: All pubs:', allPubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      area: pub.area,
      hasLatLng: !!(pub._internal?.lat && pub._internal?.lng),
      lat: pub._internal?.lat,
      lng: pub._internal?.lng
    })));

    setPubs(allPubs);
    setFilteredPubs(allPubs);
    setLoading(false);
  }, []);

  // Filter pubs when area, rating, or amenities selection changes
  useEffect(() => {
    let filtered = pubs;
    
    // Filter by area
    if (selectedArea !== 'all') {
      filtered = filtered.filter(pub => pub.area === selectedArea);
    }
    
    // Filter by minimum rating
    if (selectedRating !== '0') {
      const minRating = parseFloat(selectedRating);
      filtered = filtered.filter(pub => (pub.rating || 0) >= minRating);
    }
    
    // Filter by amenities (AND logic - pub must have ALL selected amenities)
    if (selectedAmenities.size > 0) {
      filtered = filtered.filter(pub => {
        const pubAmenities = pub.amenities || [];
        return Array.from(selectedAmenities).every(amenity => 
          pubAmenities.includes(amenity)
        );
      });
    }
    
    setFilteredPubs(filtered);
  }, [selectedArea, selectedRating, selectedAmenities, pubs]);

  // Update map markers when filtered pubs change
  useEffect(() => {
    if (mapCreated && mapDiv && googleAvailable) {
      updateMapMarkers();
    }
  }, [filteredPubs, mapCreated]);

  // Test Google Maps API (like the working test page)
  const testGoogleMapsAPI = async () => {
    setMapStatus('Testing Google Maps API...');
    
    try {
      // Test if Google Maps is available globally
      if (typeof google !== 'undefined' && google.maps) {
        setMapStatus('Google Maps API loaded successfully!');
        setGoogleAvailable(true);
        console.log('Google Maps API is available:', google.maps);
        return;
      }

      // Use shared utility to load Google Maps API
      setMapStatus('Attempting to load Google Maps API...');
      
      await loadGoogleMaps();
      setMapStatus('Google Maps API script loaded!');
      setGoogleAvailable(true);
      console.log('Google Maps API script loaded successfully');
      
    } catch (error) {
      setMapStatus(`Error: ${error}`);
      console.error('Error testing Google Maps API:', error);
    }
  };

  // Update map markers when filtered pubs change
  const updateMapMarkers = useCallback(() => {
    if (!mapInstance || !googleAvailable) return;

    // Clear existing markers
    currentMarkers.forEach(marker => marker.setMap(null));
    setCurrentMarkers([]);

    // Get pubs with coordinates
    const pubsWithCoords = filteredPubs.filter(pub => pub._internal?.lat && pub._internal?.lng);
    
    if (pubsWithCoords.length === 0) {
      setMapStatus('No pubs with coordinates in selected area');
      return;
    }

    setMapStatus(`Updating map with ${pubsWithCoords.length} pub markers...`);

    // Create new markers
    const newMarkers: google.maps.Marker[] = [];
    
    // Create the amenities display with categories
    const amenitiesByCategory = {
      '🎵 Music': ['DJs', 'Jukebox', 'Karaoke', 'Live Music'],
      '🍸 Drinks': ['Cocktails', 'Craft Beer', 'Craft Ales', 'Draught', 'Non-Alcoholic', 'Real Ale', 'Spirits', 'Taproom', 'Wine'],
      '🍔 Food': ['Bar Snacks', 'Bottomless Brunch', 'Bring Your Own Food', 'Burgers', 'Chips', 'English Breakfast', 'Fish and Chips', 'Gluten-Free Options', 'Kids Menu', 'Outdoor Food Service', 'Pie', 'Pizza', 'Sandwiches', 'Steak', 'Street Food Vendor', 'Sunday Roast', 'Thai', 'Vegetarian Options', 'Wings'],
      '🌳 Outdoor Space': ['Beer Garden', 'Heating', 'In the Sun', 'Large Space (20+ People)', 'Outdoor Viewing', 'Outside Bar', 'River View', 'Rooftop', 'Small Space (<20 People)', 'Street Seating', 'Under Cover'],
      '📺 Sport Viewing': ['Amazon Sports', 'Outdoor Viewing', 'Six Nations', 'Sky Sports', 'TNT Sports', 'Terrestrial TV'],
      '♿ Accessibility': ['Car Park', 'Child Friendly', 'Dance Floor', 'Disabled Access', 'Dog Friendly', 'Open Past Midnight', 'Open Past Midnight (Weekends)', 'Table Booking'],
      '💷 Affordability': ['Bargain', 'Premium', 'The Norm'],
      '🎯 Activities': ['Beer Pong', 'Billiards', 'Board Games', 'Darts', 'Game Machines', 'Ping Pong', 'Pool Table', 'Pub Quiz', 'Shuffleboard', 'Slot Machines', 'Table Football'],
      '💺 Comfort': ['Booths', 'Fireplace', 'Sofas', 'Stools at the Bar']
    };

    // Keep track of the current info window to close it when opening a new one
    let currentInfoWindow: google.maps.InfoWindow | null = null;

    pubsWithCoords.forEach(pub => {
      const marker = new google.maps.Marker({
        position: { 
          lat: pub._internal!.lat!, 
          lng: pub._internal!.lng! 
        },
        map: mapInstance,
        title: pub.name,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18.5" cy="18.5" r="16" fill="#08d78c" stroke="white" stroke-width="2"/>
              <text x="18.5" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🍺</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(37, 37),
          anchor: new google.maps.Point(18.5, 18.5)
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        // Close the previous info window if one is open
        if (currentInfoWindow) {
          currentInfoWindow.close();
        }

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${pub._internal?.photo_url ? `
                <div style="margin-bottom: 12px; text-align: center;">
                  <img src="${pub._internal.photo_url}" alt="${pub.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                </div>
              ` : ''}
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1f2937; line-height: 1.2;">${pub.name}</h3>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; margin-bottom: 12px;">
                <span style="font-size: 14px; color: #6b7280;">Rating:</span>
                <span style="font-size: 16px; font-weight: 600; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 12px;">${pub.rating || 'N/A'}</span>
              </div>
              
              <div id="amenities-${pub.id}" style="display: none;">
                <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
                  <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #374151;">Available Features</h4>
                  ${Object.entries(amenitiesByCategory).map(([category, amenities]) => {
                    const availableAmenities = amenities.filter(amenity => 
                      pub.amenities?.includes(amenity)
                    );
                    if (availableAmenities.length === 0) return '';
                    
                    return `
                      <div style="margin-bottom: 16px;">
                        <div style="font-weight: 600; color: #6b7280; margin-bottom: 6px; font-size: 14px;">${category}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                          ${availableAmenities.map(amenity => 
                            `<span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 12px; border: 1px solid #e5e7eb;">${amenity}</span>`
                          ).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
              
              <button 
                onclick="document.getElementById('amenities-${pub.id}').style.display = document.getElementById('amenities-${pub.id}').style.display === 'none' ? 'block' : 'none'; this.textContent = this.textContent === 'See Features' ? 'Hide Features' : 'See Features';"
                style="width: 100%; background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 8px; transition: background-color 0.2s;"
                onmouseover="this.style.background='#2563eb'"
                onmouseout="this.style.background='#3b82f6'"
              >
                See Features
              </button>
            </div>
          `
        });
        
        infoWindow.open(mapInstance, marker);
        currentInfoWindow = infoWindow;
      });

      newMarkers.push(marker);
    });

    setCurrentMarkers(newMarkers);

    // Fit bounds to show all markers
    if (pubsWithCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      pubsWithCoords.forEach(pub => {
        bounds.extend({ 
          lat: pub._internal!.lat!, 
          lng: pub._internal!.lng! 
        });
      });
      mapInstance.fitBounds(bounds);
    }

    setMapStatus(`Map updated with ${pubsWithCoords.length} pub markers!`);
  }, [mapInstance, googleAvailable, filteredPubs, currentMarkers]);

  // Create map manually (like the working test page)
  const createMap = useCallback(() => {
    if (!googleAvailable || !mapDiv) {
      setMapStatus('Cannot create map: Google Maps not available or map div not ready');
      return;
    }

    try {
      setMapStatus('Creating map...');
      
      // Create a basic map with minimal styling
      const map = new google.maps.Map(mapDiv, {
        center: { lat: 51.5074, lng: -0.1278 }, // London center
        zoom: 10,
        styles: [
          // Only remove the most distracting business/POI labels
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          // Keep everything else exactly as Google intended
        ],
        // Disable unnecessary controls
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      // Store the map instance
      setMapInstance(map);
      setMapStatus('Map created successfully! Now adding pub markers...');
      setMapCreated(true);
      
      // Add initial markers
      setTimeout(() => {
        updateMapMarkers();
      }, 100);
      
    } catch (error) {
      setMapStatus(`Error creating map: ${error}`);
      console.error('Error creating map:', error);
    }
  }, [googleAvailable, mapDiv, updateMapMarkers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading map page...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="bg-black text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              🗺️ London Pubs Map
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Interactive map showing all {pubs.length} pubs in our database
            </p>
            <div className="mt-4 text-sm text-gray-400">
              Click on any pub marker to see details
            </div>
          </div>
        </div>
      </section>

      {/* Area Filter */}
      <section className="py-4 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="area-filter" className="text-sm font-medium text-gray-700">
                  Filter by Borough:
                </label>
                <select
                  id="area-filter"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-[#08d78c]"
                >
                  <option value="all">All Boroughs ({pubs.length} pubs)</option>
                  {Array.from(new Set(pubs.map(pub => pub.area).filter(Boolean))).sort().map(area => (
                    <option key={area} value={area}>
                      {area} ({pubs.filter(pub => pub.area === area).length} pubs)
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <label htmlFor="rating-filter" className="text-sm font-medium text-gray-700">
                  Minimum Rating:
                </label>
                <select
                  id="rating-filter"
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-[#08d78c]"
                >
                  <option value="0">Any Rating</option>
                  <option value="3.0">3.0+</option>
                  <option value="3.5">3.5+</option>
                  <option value="4.0">4.0+</option>
                  <option value="4.1">4.1+</option>
                  <option value="4.2">4.2+</option>
                  <option value="4.3">4.3+</option>
                  <option value="4.4">4.4+</option>
                  <option value="4.5">4.5+</option>
                  <option value="4.6">4.6+</option>
                  <option value="4.7">4.7+</option>
                  <option value="4.8">4.8+</option>
                  <option value="4.9">4.9+</option>
                  <option value="5.0">5.0</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredPubs.length} of {pubs.length} pubs
            </div>
          </div>
        </div>
      </section>

      {/* Amenity Filter */}
      <section className="py-4 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Filter by Features & Amenities</h3>
              <div className="text-sm text-gray-600">
                {selectedAmenities.size > 0 && `Selected: ${selectedAmenities.size} amenity${selectedAmenities.size !== 1 ? 'ies' : 'y'}`}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Music */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  🎵 Music
                </h4>
                <div className="space-y-2">
                  {['DJs', 'Jukebox', 'Karaoke', 'Live Music'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Drinks */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  🍸 Drinks
                </h4>
                <div className="space-y-2">
                  {['Cocktails', 'Craft Beer', 'Craft Ales', 'Draught', 'Non-Alcoholic', 'Real Ale', 'Spirits', 'Taproom', 'Wine'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Food */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  🍔 Food
                </h4>
                <div className="space-y-2">
                  {['Bar Snacks', 'Bottomless Brunch', 'Bring Your Own Food', 'Burgers', 'Chips', 'English Breakfast', 'Fish and Chips', 'Gluten-Free Options', 'Kids Menu', 'Outdoor Food Service', 'Pie', 'Pizza', 'Sandwiches', 'Steak', 'Street Food Vendor', 'Sunday Roast', 'Thai', 'Vegetarian Options', 'Wings'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Outdoor Space */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  🌳 Outdoor Space
                </h4>
                <div className="space-y-2">
                  {['Beer Garden', 'Heating', 'In the Sun', 'Large Space (20+ People)', 'Outdoor Viewing', 'Outside Bar', 'River View', 'Rooftop', 'Small Space (<20 People)', 'Street Seating', 'Under Cover'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sport Viewing */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  📺 Sport Viewing
                </h4>
                <div className="space-y-2">
                  {['Amazon Sports', 'Outdoor Viewing', 'Six Nations', 'Sky Sports', 'TNT Sports', 'Terrestrial TV'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Accessibility */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  ♿ Accessibility
                </h4>
                <div className="space-y-2">
                  {['Car Park', 'Child Friendly', 'Dance Floor', 'Disabled Access', 'Dog Friendly', 'Open Past Midnight', 'Open Past Midnight (Weekends)', 'Table Booking'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Affordability */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  💷 Affordability
                </h4>
                <div className="space-y-2">
                  {['Bargain', 'Premium', 'The Norm'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Activities */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  🎯 Activities
                </h4>
                <div className="space-y-2">
                  {['Beer Pong', 'Billiards', 'Board Games', 'Darts', 'Game Machines', 'Ping Pong', 'Pool Table', 'Pub Quiz', 'Shuffleboard', 'Slot Machines', 'Table Football'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comfort */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  💺 Comfort
                </h4>
                <div className="space-y-2">
                  {['Booths', 'Fireplace', 'Sofas', 'Stools at the Bar'].map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.has(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {selectedAmenities.size > 0 && (
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setSelectedAmenities(new Set())}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Clear All Amenity Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Map Controls (like test page) */}
      <section className="py-4 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3">Map Controls</h2>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded border">
                <div><strong>Status:</strong> {mapStatus}</div>
                <div><strong>Google Available:</strong> {googleAvailable ? 'Yes' : 'No'}</div>
                <div><strong>Map Created:</strong> {mapCreated ? 'Yes' : 'No'}</div>
                <div><strong>Filtered Pubs:</strong> {filteredPubs.filter(pub => pub._internal?.lat && pub._internal?.lng).length} with coordinates</div>
                <div><strong>Active Markers:</strong> {currentMarkers.length}</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={testGoogleMapsAPI}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Load Google Maps API
                </button>
                {googleAvailable && !mapCreated && (
                  <button 
                    onClick={createMap}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Create Map
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                First load the Google Maps API, then create the map.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Container */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[700px] w-full rounded-lg overflow-hidden shadow-lg">
            <div 
              ref={setMapDiv}
              className="h-full w-full bg-gray-100 border-2 border-dashed border-gray-300"
            >
              {!googleAvailable && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-4">🗺️</div>
                    <div className="text-lg font-medium mb-2">Map Area</div>
                    <div className="text-sm text-gray-600">
                      Click "Load Google Maps API" to start
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-[#08d78c] mb-2">
                {filteredPubs.filter(pub => pub._internal?.lat && pub._internal?.lng).length}
              </div>
              <div className="text-gray-600">Filtered Pubs with Coordinates</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-[#08d78c] mb-2">
                {filteredPubs.length}
              </div>
              <div className="text-gray-600">Filtered Pubs Total</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-[#08d78c] mb-2">
                {pubs.filter(pub => pub._internal?.lat && pub._internal?.lng).length}
              </div>
              <div className="text-gray-600">All Pubs with Coordinates</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-[#08d78c] mb-2">
                {Math.round((pubs.filter(pub => pub._internal?.lat && pub._internal?.lng).length / pubs.length) * 100)}%
              </div>
              <div className="text-gray-600">Total Coverage</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
} 
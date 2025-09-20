'use client';

import { useState, useEffect } from 'react';
import { pubData } from '@/data/pubData';
import { Pub } from '@/data/types';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';

export default function MapTestPage() {
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapStatus, setMapStatus] = useState<string>('Initializing...');
  const [googleAvailable, setGoogleAvailable] = useState<boolean>(false);
  const [mapDiv, setMapDiv] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('MapTestPage: Component mounted');
    console.log('MapTestPage: Total pubs in pubData:', pubData.length);
    
    // Take first 10 pubs for testing
    const testPubs = pubData.slice(0, 10);
    console.log('MapTestPage: Test pubs:', testPubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      area: pub.area,
      hasLatLng: !!(pub._internal?.lat && pub._internal?.lng),
      lat: pub._internal?.lat,
      lng: pub._internal?.lng
    })));

    setPubs(testPubs);
    setLoading(false);
  }, []);

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

  const createSimpleMap = () => {
    if (!googleAvailable || !mapDiv) {
      setMapStatus('Cannot create map: Google Maps not available or map div not ready');
      return;
    }

    try {
      setMapStatus('Creating simple map with pub markers...');
      
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

      // Add pub markers
      const pubsWithCoords = pubs.filter(pub => pub._internal?.lat && pub._internal?.lng);
      setMapStatus(`Adding ${pubsWithCoords.length} pub markers...`);

      // Keep track of the current info window to close it when opening a new one
      let currentInfoWindow: google.maps.InfoWindow | null = null;

      pubsWithCoords.forEach(pub => {
        const marker = new google.maps.Marker({
          position: { 
            lat: pub._internal!.lat!, 
            lng: pub._internal!.lng! 
          },
          map: map,
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
          
          infoWindow.open(map, marker);
          currentInfoWindow = infoWindow;
        });
      });

      // Fit bounds to show all markers
      if (pubsWithCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        pubsWithCoords.forEach(pub => {
                  bounds.extend({ 
          lat: pub._internal!.lat!, 
          lng: pub._internal!.lng! 
        });
        });
        map.fitBounds(bounds);
      }

      setMapStatus(`Map created successfully with ${pubsWithCoords.length} pub markers!`);
      
    } catch (error) {
      setMapStatus(`Error creating map: ${error}`);
      console.error('Error creating map:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading map test page...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">🗺️ Map Test Page</h1>
          <p className="text-gray-600 mt-2">
            Testing map functionality with {pubs.length} pubs
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Debug Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Total Pubs:</strong> {pubData.length}
            </div>
            <div>
              <strong>Test Pubs:</strong> {pubs.length}
            </div>
            <div>
              <strong>With Coordinates:</strong> {pubs.filter(pub => pub._internal?.lat && pub._internal?.lng).length}
            </div>
            <div>
              <strong>Without Coordinates:</strong> {pubs.filter(pub => !pub._internal?.lat || !pub._internal?.lng).length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Google Maps API Test</h2>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded border">
              <div><strong>Status:</strong> {mapStatus}</div>
              <div><strong>Google Available:</strong> {googleAvailable ? 'Yes' : 'No'}</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={testGoogleMapsAPI}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test Google Maps API
              </button>
              {googleAvailable && (
                <button 
                  onClick={createSimpleMap}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Create Simple Map
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              This will test if the Google Maps API can be loaded and create a basic map.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Simple Map Test</h2>
            <p className="text-sm text-gray-600">
              Basic map display to test Google Maps functionality
            </p>
          </div>
          
          <div 
            ref={setMapDiv}
            className="h-[600px] w-full bg-gray-100 border-2 border-dashed border-gray-300"
          >
            {!googleAvailable && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-4">🗺️</div>
                  <div className="text-lg font-medium mb-2">Map Area</div>
                  <div className="text-sm text-gray-600">
                    Click "Test Google Maps API" to load the map
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-lg font-semibold mb-3">Pub Data Sample</h2>
          <div className="space-y-2 text-sm">
            {pubs.slice(0, 3).map(pub => (
              <div key={pub.id} className="p-3 bg-gray-50 rounded border">
                <div><strong>Name:</strong> {pub.name}</div>
                <div><strong>ID:</strong> {pub.id}</div>
                <div><strong>Area:</strong> {pub.area}</div>
                <div><strong>Lat:</strong> {pub._internal?.lat || 'N/A'}</div>
                <div><strong>Lng:</strong> {pub._internal?.lng || 'N/A'}</div>
                <div><strong>Has Coordinates:</strong> {!!(pub._internal?.lat && pub._internal?.lng) ? 'Yes' : 'No'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
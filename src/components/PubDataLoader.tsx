'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pubData } from '@/data/pubData';
import { Pub } from '@/data/types';
import PubResultCard from '@/components/PubResultCard';
import FilterDrawer from '@/components/FilterDrawer';
import FilterChips from '@/components/FilterChips';
import RandomPicker from '@/components/RandomPicker';
import { generatePubSlug } from '@/utils/slugUtils';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';
import { isPubOpenNow, getCurrentUKTimeString } from '@/utils/openingHours';
import { Filter, Search, MapIcon, List } from 'lucide-react';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export default function PubDataLoader() {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [openingFilter, setOpeningFilter] = useState<string>('');
  
  // UI state
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pubsPerPage = 12; // Show 12 pubs per page (3x4 grid on desktop)
  
  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentInfoWindow, setCurrentInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Parse URL parameters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      const amenitiesParam = urlParams.get('amenities');
      if (amenitiesParam) {
        const amenities = amenitiesParam.split(',').map(a => a.trim()).filter(Boolean);
        setSelectedAmenities(amenities);
      }
      
      const areaParam = urlParams.get('area');
      if (areaParam) {
        setSelectedArea(areaParam);
      }
      
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setSearchTerm(searchParam);
      }
    }
  }, []);

  // Filter options
  const areas = useMemo(() => {
    const uniqueAreas = [...new Set(pubData.map(pub => pub.area).filter(Boolean))];
    return ['All Areas', ...uniqueAreas.sort()];
  }, []);

  // Amenities organized by category
  const amenitiesByCategory = useMemo(() => {
    return {
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
  }, []);

  // Filter pubs based on all criteria
  const filteredPubs = useMemo(() => {
    let filtered = pubData;

    // Text search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pub => 
        pub.name.toLowerCase().includes(searchLower) ||
        pub.description?.toLowerCase().includes(searchLower) ||
        pub.area?.toLowerCase().includes(searchLower) ||
        pub.address?.toLowerCase().includes(searchLower)
      );
    }

    // Area filter
    if (selectedArea && selectedArea !== 'All Areas') {
      filtered = filtered.filter(pub => pub.area === selectedArea);
    }

    // Amenities filter
    if (selectedAmenities.length > 0) {
      filtered = filtered.filter(pub => {
        return selectedAmenities.every(amenity => 
          pub.amenities?.includes(amenity) || pub.features?.includes(amenity)
        );
      });
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(pub => (pub.rating || 0) >= minRating);
    }

    // Opening hours filter
    if (openingFilter && openingFilter !== 'Any Time') {
      if (openingFilter === 'Open Now') {
        filtered = filtered.filter(pub => isPubOpenNow(pub.openingHours));
      }
    }

    // Sort by rating (best first)
    filtered.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [searchTerm, selectedArea, selectedAmenities, minRating, openingFilter]);

  // Get pubs for current page
  const displayedPubs = useMemo(() => {
    const startIndex = (currentPage - 1) * pubsPerPage;
    const endIndex = startIndex + pubsPerPage;
    return filteredPubs.slice(startIndex, endIndex);
  }, [filteredPubs, currentPage, pubsPerPage]);

  const totalPages = Math.ceil(filteredPubs.length / pubsPerPage);
  const hasMore = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  // Initialize map when view mode changes to map
  useEffect(() => {
    if (viewMode === 'map' && mapDivRef.current && !map) {
      const timer = setTimeout(async () => {
        if (mapDivRef.current && document.contains(mapDivRef.current) && !map) {
          try {
            if (typeof google === 'undefined' || !google.maps) {
              await loadGoogleMaps();
            }
            if (mapDivRef.current && document.contains(mapDivRef.current) && !map) {
              createMap();
            }
          } catch (error) {
            console.error('Failed to load Google Maps:', error);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [viewMode, map]);

  const createMap = () => {
    if (!mapDivRef.current || map) return;

    try {
      if (!document.contains(mapDivRef.current)) {
        console.warn('Map div no longer in DOM, skipping map creation');
        return;
      }

      const newMap = new google.maps.Map(mapDivRef.current, {
        center: { lat: 51.5074, lng: -0.1278 },
        zoom: 11,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      setMap(newMap);
    } catch (error) {
      console.error('Error creating map:', error);
    }
  };

  // Cleanup markers
  useEffect(() => {
    return () => {
      try {
        if (markersRef.current.length > 0) {
          markersRef.current.forEach(marker => {
            try {
              if (marker && typeof marker.setMap === 'function' && marker.getMap()) {
                marker.setMap(null);
              }
            } catch (error) {
              console.warn('Error cleaning up marker:', error);
            }
          });
          markersRef.current = [];
        }
        
        if (currentInfoWindow && typeof currentInfoWindow.close === 'function') {
          try {
            currentInfoWindow.close();
          } catch (error) {
            console.warn('Error closing info window:', error);
          }
        }
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, [currentInfoWindow]);

  // Add markers to map
  useEffect(() => {
    if (map && displayedPubs.length > 0) {
      try {
        if (markersRef.current.length > 0) {
          markersRef.current.forEach(marker => {
            try {
              if (marker && marker.getMap() === map) {
                marker.setMap(null);
              }
            } catch (error) {
              console.warn('Error clearing marker:', error);
            }
          });
          markersRef.current = [];
        }
        
        const pubsWithCoords = displayedPubs.filter(pub => pub._internal?.lat && pub._internal?.lng);
        
        if (pubsWithCoords.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          
          pubsWithCoords.forEach(pub => {
            try {
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

              markersRef.current.push(marker);

              marker.addListener('click', () => {
                try {
                  if (currentInfoWindow) {
                    currentInfoWindow.close();
                  }

                  const infoWindow = new google.maps.InfoWindow({
                    content: `
                      <div style="padding: 12px; min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1f2937;">${pub.name}</h3>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; margin-bottom: 12px;">
                          <span style="font-size: 14px; color: #6b7280;">Rating:</span>
                          <span style="font-size: 16px; font-weight: 600; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 12px;">${pub.rating || 'N/A'}</span>
                        </div>
                        <a href="/pubs/${generatePubSlug(pub.name, pub.id)}" style="display: block; width: 100%; background: #08d78c; color: white; text-align: center; padding: 8px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Pub</a>
                      </div>
                    `
                  });
                  
                  infoWindow.open(map, marker);
                  setCurrentInfoWindow(infoWindow);
                } catch (error) {
                  console.error('Error handling marker click:', error);
                }
              });

              bounds.extend({ 
                lat: pub._internal!.lat!, 
                lng: pub._internal!.lng! 
              });
            } catch (error) {
              console.error('Error creating marker for pub:', pub.name, error);
            }
          });

          try {
            map.fitBounds(bounds);
          } catch (error) {
            console.warn('Error fitting bounds:', error);
          }
        }
      } catch (error) {
        console.error('Error updating map markers:', error);
      }
    }
  }, [map, displayedPubs, currentInfoWindow]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, selectedAmenities, minRating, openingFilter]);

  // Handler functions
  const handleAmenityToggle = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
    } else {
      setSelectedAmenities(prev => [...prev, amenity]);
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedArea('');
    setSelectedAmenities([]);
    setMinRating(0);
    setOpeningFilter('');
    setCurrentPage(1);
  };

  const handleViewPub = useCallback((pub: Pub) => {
    window.open(`/pubs/${generatePubSlug(pub.name, pub.id)}`, '_blank');
  }, []);

  return (
    <>
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search and Essential Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            {/* Search Bar */}
            <div className="md:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pubs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                />
              </div>
            </div>

            {/* Area Dropdown */}
            <div className="md:col-span-3">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent appearance-none bg-white"
              >
                {areas.map((area) => (
                  <option key={area} value={area}>
                    {area === 'All Areas' ? '📍 All Areas' : `📍 ${area}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Rating */}
            <div className="md:col-span-2">
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent appearance-none bg-white"
              >
                <option value={0}>⭐ Any Rating</option>
                <option value={4.5}>⭐ 4.5+</option>
                <option value={4.0}>⭐ 4.0+</option>
                <option value={3.5}>⭐ 3.5+</option>
              </select>
            </div>

            {/* Filters Button */}
            <div className="md:col-span-2">
              <button
                onClick={() => setShowFilterDrawer(true)}
                className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Filters
                {selectedAmenities.length > 0 && (
                  <span className="bg-[#08d78c] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {selectedAmenities.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <FilterChips
            selectedArea={selectedArea}
            selectedAmenities={selectedAmenities}
            minRating={minRating}
            openingFilter={openingFilter}
            onRemoveArea={() => setSelectedArea('')}
            onRemoveAmenity={(amenity) => setSelectedAmenities(prev => prev.filter(a => a !== amenity))}
            onRemoveRating={() => setMinRating(0)}
            onRemoveOpening={() => setOpeningFilter('')}
            onClearAll={handleClearAllFilters}
          />
        </div>
      </div>

      {/* Results Summary Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{filteredPubs.length}</span> pubs found
              {filteredPubs.length !== pubData.length && (
                <span className="text-gray-500 ml-1">
                  (filtered from {pubData.length} total)
                </span>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-[#08d78c] text-white shadow-md'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'map'
                    ? 'bg-[#08d78c] text-white shadow-md'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <section className="py-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {viewMode === 'list' ? (
            <>
              {filteredPubs.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <AnimatePresence mode="popLayout">
                      {displayedPubs.map((pub) => (
                        <PubResultCard
                          key={pub.id}
                          pub={{
                            id: pub.id,
                            name: pub.name,
                            area: pub.area,
                            rating: pub.rating,
                            reviewCount: pub.reviewCount,
                            type: pub.type,
                            amenities: pub.amenities || [],
                            address: pub.address,
                            description: pub.description,
                            _internal: pub._internal
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={!hasPrevious}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={!hasMore}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <div className="text-6xl mb-6">🍺</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No pubs found</h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your filters or search terms
                  </p>
                  <button
                    onClick={handleClearAllFilters}
                    className="px-6 py-3 bg-[#08d78c] hover:bg-[#06b875] text-white font-semibold rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="h-[calc(100vh-300px)] min-h-[500px] w-full rounded-lg overflow-hidden shadow-lg">
              <div 
                ref={mapDivRef}
                className="h-full w-full bg-gray-100"
                style={{ isolation: 'isolate' }}
              >
                {!map && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-4">🗺️</div>
                      <div className="text-lg font-medium mb-2">Loading Map...</div>
                      <div className="text-sm text-gray-600">
                        Please wait while the map loads
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Floating Spin the Wheel Button */}
      {filteredPubs.length > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowRandomPicker(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#08d78c] to-[#06b875] hover:from-[#06b875] hover:to-[#05a066] text-white rounded-full shadow-2xl flex items-center justify-center text-3xl z-40 group"
          title="Spin the Wheel - Random Pub"
        >
          🎡
          <div className="absolute -top-12 right-0 bg-black text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Feeling indecisive? Spin!
          </div>
        </motion.button>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        amenitiesByCategory={amenitiesByCategory}
        selectedAmenities={selectedAmenities}
        onAmenityToggle={handleAmenityToggle}
        onClearAll={() => setSelectedAmenities([])}
        onApply={() => setShowFilterDrawer(false)}
      />

      {/* Random Picker Modal */}
      <RandomPicker
        isOpen={showRandomPicker}
        onClose={() => setShowRandomPicker(false)}
        filters={{
          area: selectedArea === 'All Areas' ? undefined : selectedArea,
          amenities: selectedAmenities,
          openNow: openingFilter === 'Open Now',
          minRating: minRating > 0 ? minRating : 3.5,
        }}
        onViewPub={handleViewPub}
      />
    </>
  );
}

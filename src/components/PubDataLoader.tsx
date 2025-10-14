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
import { isPubOpenNow } from '@/utils/openingHours';
import { Filter, Search, MapIcon, List, Loader2, AlertCircle } from 'lucide-react';
import { useUrlState } from '@/hooks/useUrlState';
import { useMapLoader } from '@/hooks/useMapLoader';
import { useMapPins } from '@/hooks/useMapPins';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export default function PubDataLoader() {
  // URL state management
  const urlState = useUrlState();
  const {
    state: {
      view,
      searchTerm,
      selectedArea,
      selectedAmenities,
      minRating,
      openingFilter,
    },
    setView,
    setSearchTerm,
    setSelectedArea,
    setSelectedAmenities,
    setMinRating,
    setOpeningFilter,
  } = urlState;

  // UI state
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  
  // Pagination state (for list view)
  const [currentPage, setCurrentPage] = useState(1);
  const pubsPerPage = 12;
  
  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);

  // Load map only when view is 'map'
  const { isLoaded: isMapLoaded, error: mapLoadError } = useMapLoader(view === 'map');

  // Prepare filters for API
  const filters = useMemo(() => ({
    searchTerm,
    selectedArea: selectedArea === 'All Areas' ? undefined : selectedArea,
    selectedAmenities,
    minRating,
    openingFilter: openingFilter === 'Any Time' ? undefined : openingFilter,
  }), [searchTerm, selectedArea, selectedAmenities, minRating, openingFilter]);

  // Use map pins hook (only active when map is loaded)
  const { loading: pinsLoading, error: pinsError, totalPubs: mapTotalPubs, markerCount } = useMapPins(
    view === 'map' ? map : null,
    filters
  );

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

  // Filter pubs for list view (client-side)
  const filteredPubs = useMemo(() => {
    let filtered = pubData;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pub => 
        pub.name.toLowerCase().includes(searchLower) ||
        pub.description?.toLowerCase().includes(searchLower) ||
        pub.area?.toLowerCase().includes(searchLower) ||
        pub.address?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedArea && selectedArea !== 'All Areas') {
      filtered = filtered.filter(pub => pub.area === selectedArea);
      }

      if (selectedAmenities.length > 0) {
        filtered = filtered.filter(pub => {
        return selectedAmenities.every(amenity => 
            pub.amenities?.includes(amenity) || pub.features?.includes(amenity)
          );
        });
      }

    if (minRating > 0) {
      filtered = filtered.filter(pub => (pub.rating || 0) >= minRating);
      }

    if (openingFilter && openingFilter !== 'Any Time') {
      if (openingFilter === 'Open Now') {
        filtered = filtered.filter(pub => isPubOpenNow(pub.openingHours));
      }
    }

    // Sort by rating
    filtered.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [searchTerm, selectedArea, selectedAmenities, minRating, openingFilter]);

  // Pagination for list view
  const displayedPubs = useMemo(() => {
    const startIndex = (currentPage - 1) * pubsPerPage;
    const endIndex = startIndex + pubsPerPage;
    return filteredPubs.slice(startIndex, endIndex);
  }, [filteredPubs, currentPage, pubsPerPage]);

  const totalPages = Math.ceil(filteredPubs.length / pubsPerPage);
  const hasMore = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  // Initialize map when loaded and view is map
  useEffect(() => {
    if (view === 'map' && isMapLoaded && mapDivRef.current && !mapInitializedRef.current) {
      const timer = setTimeout(() => {
        if (mapDivRef.current && !map) {
          try {
            // Monochrome map style
            const monoStyle = [
              { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
              { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
              {
                featureType: "administrative.land_parcel",
                elementType: "labels.text.fill",
                stylers: [{ color: "#bdbdbd" }],
              },
              {
                featureType: "poi",
                elementType: "geometry",
                stylers: [{ color: "#eeeeee" }],
              },
              {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#757575" }],
              },
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#ffffff" }],
              },
              {
                featureType: "road.arterial",
                elementType: "labels.text.fill",
                stylers: [{ color: "#757575" }],
              },
              {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [{ color: "#dadada" }],
              },
              {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [{ color: "#616161" }],
              },
              {
                featureType: "transit",
                elementType: "geometry",
                stylers: [{ color: "#e5e5e5" }],
              },
              {
                featureType: "transit",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#c9c9c9" }],
              },
              {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9e9e9e" }],
              },
            ];

            const newMap = new window.google.maps.Map(mapDivRef.current, {
              center: { lat: 51.5074, lng: -0.1278 }, // London center
              zoom: 11,
              styles: monoStyle,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              gestureHandling: 'greedy', // Allow smooth panning
            });

            setMap(newMap);
            mapInitializedRef.current = true;
            console.log('Map initialized successfully');
          } catch (error) {
            console.error('Error creating map:', error);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [view, isMapLoaded, map]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, selectedAmenities, minRating, openingFilter]);

  // Handler functions
  const handleAmenityToggle = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
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
            onRemoveAmenity={(amenity) => setSelectedAmenities(selectedAmenities.filter(a => a !== amenity))}
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
              {view === 'list' ? (
                <>
                  <span className="font-semibold">{filteredPubs.length}</span> pubs found
                {filteredPubs.length !== pubData.length && (
                    <span className="text-gray-500 ml-1">
                    (filtered from {pubData.length} total)
                  </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-semibold">{markerCount}</span> pubs visible on map
                  {mapTotalPubs > markerCount && (
                    <span className="text-gray-500 ml-1">
                      (total: {mapTotalPubs} pubs)
                    </span>
                  )}
                </>
                )}
              </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
                <button 
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  view === 'list'
                    ? 'bg-[#08d78c] text-white shadow-md'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  view === 'map'
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
          {view === 'list' ? (
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
            <div className="relative">
              {/* Map Container */}
              <div className="h-[calc(100vh-300px)] min-h-[500px] w-full rounded-lg overflow-hidden shadow-lg relative">
                {mapLoadError ? (
                  <div className="h-full flex items-center justify-center bg-red-50">
                    <div className="text-center p-8">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Map</h3>
                      <p className="text-red-700 mb-4">{mapLoadError.message}</p>
                      <p className="text-sm text-red-600">
                        Please ensure NEXT_PUBLIC_GMAPS_BROWSER_KEY is set in your .env.local file
                      </p>
                    </div>
                  </div>
                ) : !isMapLoaded ? (
                  <div className="h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-[#08d78c] animate-spin mx-auto mb-4" />
                      <div className="text-lg font-medium mb-2">Loading Map...</div>
                      <div className="text-sm text-gray-600">
                        Downloading Google Maps
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      ref={mapDivRef}
                      className="h-full w-full"
                      style={{ isolation: 'isolate' }}
                    />
                    
                    {/* Loading Overlay */}
                    {pinsLoading && (
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#08d78c]" />
                        <span className="text-sm font-medium">Loading pubs...</span>
                      </div>
                    )}

                    {/* Error Overlay */}
                    {pinsError && (
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700">Error loading pins</span>
                      </div>
                    )}

                    {/* Map Info */}
                    <div className="absolute bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-3">
                      <div className="text-xs text-gray-600">
                        Showing <span className="font-semibold text-gray-900">{markerCount}</span> pubs
                        {mapTotalPubs > 500 && (
                          <div className="mt-1 text-amber-700">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            All pubs visible
                          </div>
                        )}
                      </div>
                    </div>
                  </>
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

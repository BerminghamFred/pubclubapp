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
import { Filter, Search, MapIcon, List, Loader2, AlertCircle, MapPin, X } from 'lucide-react';
import { useUrlState } from '@/hooks/useUrlState';
import { useMapLoader } from '@/hooks/useMapLoader';
import { useMapPins } from '@/hooks/useMapPins';
import { MapSidebar } from './MapSidebar';
import { MapCanvas } from './MapCanvas';
import { ResultDrawer } from './ResultDrawer';
import { useMapUrlState } from '@/hooks/useMapUrlState';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export default function PubDataLoader() {
  // URL state management for list view (original)
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

  // Map-specific state management
  const mapState = useMapUrlState();
  const {
    listOpen,
    filters: mapFilters,
    updateListOpen,
    updateFilters: updateMapFilters
  } = mapState;

  // State for map data
  const [mapPubs, setMapPubs] = useState<any[]>([]);
  const [mapTotal, setMapTotal] = useState(0);

  // Get unique areas for the dropdown
  const areas = useMemo(() => {
    const uniqueAreas = Array.from(new Set(pubData.map(pub => pub.area).filter(Boolean)));
    return uniqueAreas.sort();
  }, []);

  // Handle map data updates
  const handleMarkersUpdate = useCallback((markers: any[]) => {
    setMapPubs(markers);
  }, []);

  const handleTotalUpdate = useCallback((total: number) => {
    setMapTotal(total);
  }, []);

  // UI state
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'not-requested'>('not-requested');
  const [sortRefreshTrigger, setSortRefreshTrigger] = useState(0);
  
  // Pagination state (for list view)
  const [currentPage, setCurrentPage] = useState(1);
  const pubsPerPage = 12;
  
  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);

  // Load map only when view is 'map'
  const { isLoaded: isMapLoaded, error: mapLoadError } = useMapLoader(view === 'map' as const);

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
    view === 'map' as const ? map : null,
    filters
  );

  // Filter options (for list view)
  const listAreas = useMemo(() => {
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

  // Distance calculation using Haversine formula
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Filter pubs for list view (client-side)
  const filteredPubs = useMemo(() => {
    console.log('filteredPubs useMemo recalculating, userLocation:', userLocation, 'sortRefreshTrigger:', sortRefreshTrigger);
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

    // Sort by proximity first (if user location is available), then by rating
    filtered.sort((a, b) => {
      // If user has shared location, sort by proximity first
      if (userLocation && a._internal?.lat && a._internal?.lng && b._internal?.lat && b._internal?.lng) {
        const distanceA = calculateDistance(userLocation.lat, userLocation.lng, a._internal.lat, a._internal.lng);
        const distanceB = calculateDistance(userLocation.lat, userLocation.lng, b._internal.lat, b._internal.lng);
        
        // Always sort by distance first when location is available (closer pubs first)
        const distanceDiff = distanceA - distanceB;
        if (Math.abs(distanceDiff) > 0.001) { // Small threshold to handle floating point precision
          return distanceDiff;
        }
      }
      
      // Then sort by rating (only if distances are very similar or no location)
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    });

    // Debug log when location-based sorting is active
    if (userLocation && filtered.length > 0) {
      console.log('Sorted pubs by proximity from user location:', userLocation);
      console.log('First 5 pubs after sorting:', filtered.slice(0, 5).map(p => ({
        name: p.name,
        rating: p.rating,
        hasCoords: !!(p._internal?.lat && p._internal?.lng),
        distance: p._internal?.lat && p._internal?.lng ? 
          calculateDistance(userLocation.lat, userLocation.lng, p._internal.lat, p._internal.lng) : null
      })));
    }

    return filtered;
  }, [searchTerm, selectedArea, selectedAmenities, minRating, openingFilter, userLocation, calculateDistance, sortRefreshTrigger]);

  // Pagination for list view
  const displayedPubs = useMemo(() => {
    console.log('displayedPubs recalculating, currentPage:', currentPage, 'filteredPubs length:', filteredPubs.length, 'sortRefreshTrigger:', sortRefreshTrigger);
    const startIndex = (currentPage - 1) * pubsPerPage;
    const endIndex = startIndex + pubsPerPage;
    const result = filteredPubs.slice(startIndex, endIndex);
    console.log('displayedPubs result:', result.slice(0, 3).map(p => ({ name: p.name, rating: p.rating })));
    return result;
  }, [filteredPubs, currentPage, pubsPerPage, sortRefreshTrigger]);

  const totalPages = Math.ceil(filteredPubs.length / pubsPerPage);
  const hasMore = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  // Initialize map when loaded and view is map
  useEffect(() => {
    if (view === 'map' as const && isMapLoaded && mapDivRef.current && !mapInitializedRef.current) {
      const timer = setTimeout(() => {
        if (mapDivRef.current && !map) {
          try {
            const newMap = new window.google.maps.Map(mapDivRef.current, {
              center: { lat: 51.5074, lng: -0.1278 }, // London center
              zoom: 11,
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

  // Reset to first page when filters change or location is obtained
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, selectedAmenities, minRating, openingFilter, userLocation]);

  // Force refresh when user location is set
  useEffect(() => {
    if (userLocation && view === 'list') {
      console.log('User location changed, forcing page refresh');
      // Force a re-render by temporarily changing and resetting the page
      setCurrentPage(2);
      setTimeout(() => setCurrentPage(1), 0);
    }
  }, [userLocation, view]);

  // Prevent body scrolling when in map view
  useEffect(() => {
    if (view === 'map') {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [view]);

  // Load saved location on component mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('pub-club-user-location');
    const savedPermission = localStorage.getItem('pub-club-location-permission') as 'granted' | 'denied' | 'not-requested' | null;
    
    if (savedLocation && savedPermission === 'granted') {
      try {
        const locationData = JSON.parse(savedLocation);
        if (locationData.lat && locationData.lng) {
          // Check if location is fresh (less than 30 minutes old)
          const locationAge = Date.now() - (locationData.timestamp || 0);
          const thirtyMinutes = 30 * 60 * 1000;
          
          if (locationAge < thirtyMinutes) {
            console.log('Loading saved user location:', locationData);
            setUserLocation({ lat: locationData.lat, lng: locationData.lng });
            setLocationPermission('granted');
          } else {
            console.log('Saved location is too old, removing from storage');
            localStorage.removeItem('pub-club-user-location');
            localStorage.removeItem('pub-club-location-permission');
          }
        }
      } catch (error) {
        console.error('Error parsing saved location:', error);
        localStorage.removeItem('pub-club-user-location');
        localStorage.removeItem('pub-club-location-permission');
      }
    } else if (savedPermission === 'denied') {
      setLocationPermission('denied');
    }
  }, []);

  // Save location to localStorage when it changes
  useEffect(() => {
    if (userLocation && locationPermission === 'granted') {
      const locationData = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        timestamp: Date.now()
      };
      localStorage.setItem('pub-club-user-location', JSON.stringify(locationData));
      localStorage.setItem('pub-club-location-permission', 'granted');
      console.log('Saved user location to localStorage:', locationData);
    } else if (locationPermission === 'denied') {
      localStorage.setItem('pub-club-location-permission', 'denied');
      localStorage.removeItem('pub-club-user-location');
    }
  }, [userLocation, locationPermission]);

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

  // Request user location
  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Location obtained, updating state...', { latitude, longitude });
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationPermission('granted');
        setShowLocationPopup(false);
        setCurrentPage(1);
        setSortRefreshTrigger(prev => {
          console.log('Triggering sort refresh, prev value:', prev);
          return prev + 1;
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationPermission('denied');
        setShowLocationPopup(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  // Show location popup on first visit to list view
  useEffect(() => {
    if (view === 'list' && locationPermission === 'not-requested' && !showLocationPopup) {
      // Check if we've already asked before (using sessionStorage) OR if user has already made a choice (localStorage)
      const hasAskedBefore = sessionStorage.getItem('location-popup-shown');
      const hasMadeChoice = localStorage.getItem('pub-club-location-permission');
      
      if (!hasAskedBefore && !hasMadeChoice) {
        setShowLocationPopup(true);
        sessionStorage.setItem('location-popup-shown', 'true');
      }
    }
  }, [view, locationPermission, showLocationPopup]);

  // If in map view, use the new full-screen map layout
  if (view === 'map' as const) {
    return (
      <>
        {/* Fixed viewport container */}
        <main
          id="mapViewport"
          className="fixed left-0 right-0 top-[var(--header-h,64px)] bottom-0 grid grid-cols-1 lg:grid-cols-[360px_1fr] bg-white"
        >
          {/* Map Sidebar */}
          <aside
            id="filtersRail"
            className="hidden lg:block h-full overflow-y-auto overscroll-contain bg-white/92 backdrop-blur-sm border-r"
          >
            <MapSidebar
              filters={mapFilters}
              onFiltersChange={updateMapFilters}
              areas={areas}
            />
          </aside>

          {/* Map Pane */}
          <section
            id="mapPane"
            className="relative h-full w-full overflow-hidden"
          >
            <div id="map" className="absolute inset-0">
              <MapCanvas
                filters={mapFilters}
                onMarkersUpdate={handleMarkersUpdate}
                onTotalUpdate={handleTotalUpdate}
                isMapLoaded={isMapLoaded}
                mapLoadError={mapLoadError}
                onSwitchToListView={() => setView('list')}
              />
            </div>

            {/* Floating Action Buttons */}
            {/* Spin the Wheel Button */}
            <button
              onClick={() => setShowRandomPicker(true)}
              className="fixed bottom-6 right-6 bg-[#08d78c] text-white p-4 rounded-full shadow-lg hover:bg-[#07c47a] transition-colors z-20"
              title="Spin the Wheel"
            >
              <span className="text-2xl">🎡</span>
            </button>

            {/* Toggle List Button */}
            <button
              onClick={() => updateListOpen(!listOpen)}
              className="fixed bottom-6 right-20 bg-white text-gray-700 p-4 rounded-full shadow-lg hover:bg-gray-50 transition-colors z-20 border border-gray-200"
              title={listOpen ? "Hide List" : "Show List"}
            >
              <List className="w-5 h-5" />
            </button>
          </section>

          {/* Result Drawer */}
          <ResultDrawer
            isOpen={listOpen}
            onClose={() => updateListOpen(false)}
            pubs={mapPubs}
            total={mapTotal}
          />
        </main>

        {/* Random Picker Modal */}
        <RandomPicker
          isOpen={showRandomPicker}
          onClose={() => setShowRandomPicker(false)}
          filters={{
            area: mapFilters.selectedArea !== 'All Areas' ? mapFilters.selectedArea : undefined,
            amenities: mapFilters.selectedAmenities,
            openNow: mapFilters.openingFilter === 'Open Now',
            minRating: mapFilters.minRating > 0 ? mapFilters.minRating : undefined,
          }}
          onViewPub={handleViewPub}
        />
      </>
    );
  }

  // Original List View (unchanged)
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
                {listAreas.map((area) => (
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
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{filteredPubs.length}</span> pubs found
                    {userLocation && (
                      <button 
                        onClick={requestUserLocation}
                        className="flex items-center gap-1 px-2 py-1 bg-[#08d78c] hover:bg-[#06b875] text-white text-xs rounded-full transition-colors cursor-pointer"
                        title="Refresh location"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Sorted by distance</span>
                      </button>
                    )}
                  </div>
                  {filteredPubs.length !== pubData.length && (
                    <span className="text-gray-500 ml-1">
                      (filtered from {pubData.length} total)
                    </span>
                  )}
                </>
              ) : null}
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
                  (view as 'list' | 'map') === 'map'
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

      {/* Location Sharing Popup */}
      {showLocationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#08d78c] rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Find Pubs Near You</h3>
                    <p className="text-sm text-gray-600">Get better results</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLocationPopup(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Share your location to see pubs sorted by distance from you, making it easier to find the closest ones.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Your privacy matters:</strong> We only use your location to sort results. No location data is stored or shared.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLocationPopup(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={requestUserLocation}
                  className="flex-1 px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] text-white rounded-lg font-medium transition-colors"
                >
                  Share Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 

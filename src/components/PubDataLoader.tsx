'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pub } from '@/data/types';
import { usePubs } from '@/hooks/usePubs';
import PubResultCard from '@/components/PubResultCard';
import FilterDrawer from '@/components/FilterDrawer';
import MobileFilterDrawer from '@/components/MobileFilterDrawer';
import FilterChips from '@/components/FilterChips';
import RandomPicker from '@/components/RandomPicker';
import { generatePubSlug } from '@/utils/slugUtils';
import { isPubOpenNow } from '@/utils/openingHours';
import { Filter, Search, MapIcon, List, Loader2, AlertCircle, MapPin, X } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { SearchSuggestion } from '@/utils/searchUtils';
import { FiltersButton } from '@/components/FiltersButton';
import { useUrlState } from '@/hooks/useUrlState';
import { useMapLoader } from '@/hooks/useMapLoader';
import { useMapPins } from '@/hooks/useMapPins';
import { MapSidebar } from './MapSidebar';
import { MapCanvas } from './MapCanvas';
import { ResultDrawer } from './ResultDrawer';
import { useMapUrlState } from '@/hooks/useMapUrlState';
import { useAnalytics } from '@/lib/analytics-client';
import { useSession } from 'next-auth/react';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export default function PubDataLoader() {
  const DEFAULT_AREA = 'All Areas';
  const DEFAULT_OPENING = 'Any Time';
  const { trackSearch, trackFilterUsage } = useAnalytics();
  const { data: session } = useSession();

  // Fetch all pubs from API (replaces pubData import)
  const { pubs: allPubs, loading: pubsLoading, error: pubsError } = usePubs({ enabled: true });

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
    updateUrl,
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

  const hasActiveMapFilters = useMemo(() => {
    return (
      !!mapFilters.searchTerm ||
      (mapFilters.selectedArea && mapFilters.selectedArea !== DEFAULT_AREA) ||
      mapFilters.selectedAmenities.length > 0 ||
      mapFilters.minRating > 0 ||
      (mapFilters.openingFilter && mapFilters.openingFilter !== DEFAULT_OPENING)
    );
  }, [mapFilters, DEFAULT_AREA, DEFAULT_OPENING]);

  const handleMapUpdateFilters = useCallback(
    (updates: Partial<typeof mapFilters>) => {
      updateMapFilters({
        ...mapFilters,
        ...updates,
      });
    },
    [mapFilters, updateMapFilters]
  );

  const handleMapRemoveArea = useCallback(() => {
    handleMapUpdateFilters({ selectedArea: DEFAULT_AREA });
  }, [handleMapUpdateFilters, DEFAULT_AREA]);

  const handleMapRemoveAmenity = useCallback(
    (amenity: string) => {
      handleMapUpdateFilters({
        selectedAmenities: mapFilters.selectedAmenities.filter((a) => a !== amenity),
      });
    },
    [handleMapUpdateFilters, mapFilters.selectedAmenities]
  );

  const handleMapRemoveRating = useCallback(() => {
    handleMapUpdateFilters({ minRating: 0 });
  }, [handleMapUpdateFilters]);

  const handleMapRemoveOpening = useCallback(() => {
    handleMapUpdateFilters({ openingFilter: DEFAULT_OPENING });
  }, [handleMapUpdateFilters, DEFAULT_OPENING]);

  const handleMapRemoveSearchTerm = useCallback(() => {
    handleMapUpdateFilters({ searchTerm: '' });
  }, [handleMapUpdateFilters]);

  const handleMapClearAll = useCallback(() => {
    handleMapUpdateFilters({
      searchTerm: '',
      selectedArea: DEFAULT_AREA,
      selectedAmenities: [],
      minRating: 0,
      openingFilter: DEFAULT_OPENING,
    });
  }, [handleMapUpdateFilters, DEFAULT_AREA, DEFAULT_OPENING]);

  // State for map data
  const [mapPubs, setMapPubs] = useState<any[]>([]);
  const [mapTotal, setMapTotal] = useState(0);

  // Get unique areas for the dropdown
  const areas = useMemo(() => {
    if (!allPubs.length) return [];
    const uniqueAreas = Array.from(new Set(allPubs.map(pub => pub.area).filter(Boolean)));
    return uniqueAreas.sort();
  }, [allPubs]);

  // Handle map data updates
  const handleMarkersUpdate = useCallback((markers: any[]) => {
    setMapPubs(markers);
  }, []);

  const handleTotalUpdate = useCallback((total: number) => {
    setMapTotal(total);
  }, []);

  // UI state
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [animateShimmer, setAnimateShimmer] = useState(true);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'not-requested'>('not-requested');
  const [sortRefreshTrigger, setSortRefreshTrigger] = useState(0);
  
  // SearchBar state
  const [searchSelections, setSearchSelections] = useState<SearchSuggestion[]>([]);
  
  // Load more state (for list view)
  const [itemsToShow, setItemsToShow] = useState(12);
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
    if (!allPubs.length) return ['All Areas'];
    const uniqueAreas = [...new Set(allPubs.map(pub => pub.area).filter(Boolean))];
    return ['All Areas', ...uniqueAreas.sort()];
  }, [allPubs]);

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

  // Filter pubs for list view (client-side) with partial matching support
  // Calculate active filters count for partial matching
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedArea && selectedArea !== 'All Areas') count++;
    if (selectedAmenities.length > 0) count += selectedAmenities.length;
    if (minRating > 0) count++;
    if (openingFilter && openingFilter !== 'Any Time') count++;
    if (searchSelections.length > 0) count += searchSelections.length;
    return count;
  }, [selectedArea, selectedAmenities, minRating, openingFilter, searchSelections]);

  // Helper function to check which filters a pub matches
  const checkPubFilters = useCallback((pub: Pub) => {
    const matches: string[] = [];
    const missing: string[] = [];

    // Check area filter
    if (selectedArea && selectedArea !== 'All Areas') {
      if (pub.area === selectedArea) {
        matches.push(`area:${selectedArea}`);
      } else {
        missing.push(`📍 ${selectedArea}`);
      }
    }

    // Check amenity filters
    selectedAmenities.forEach(amenity => {
      if (pub.amenities?.includes(amenity) || pub.features?.includes(amenity)) {
        matches.push(`amenity:${amenity}`);
      } else {
        missing.push(amenity);
      }
    });

    // Check rating filter
    if (minRating > 0) {
      if ((pub.rating || 0) >= minRating) {
        matches.push(`rating:${minRating}`);
      } else {
        missing.push(`⭐ ${minRating}+ Rating`);
      }
    }

    // Check opening filter
    if (openingFilter && openingFilter !== 'Any Time') {
      if (openingFilter === 'Open Now' && isPubOpenNow(pub.openingHours)) {
        matches.push(`opening:${openingFilter}`);
      } else if (openingFilter === 'Open Now') {
        missing.push(`🕒 ${openingFilter}`);
      }
    }

    // Check search selections
    searchSelections.forEach(selection => {
      let matched = false;
      switch (selection.type) {
        case 'area':
          if (pub.area === selection.data.area) {
            matched = true;
            matches.push(`search:area:${selection.data.area}`);
          } else {
            missing.push(selection.text);
          }
          break;
        case 'amenity':
          if (pub.amenities?.includes(selection.data.amenity) || pub.features?.includes(selection.data.amenity)) {
            matched = true;
            matches.push(`search:amenity:${selection.data.amenity}`);
          } else {
            missing.push(selection.text);
          }
          break;
        case 'pub':
          if (pub.name.toLowerCase().includes(selection.data.pub.toLowerCase())) {
            matched = true;
            matches.push(`search:pub:${selection.data.pub}`);
          } else {
            missing.push(selection.text);
          }
          break;
      }
    });

    return { matches, missing, matchCount: matches.length, totalFilters: activeFiltersCount };
  }, [selectedArea, selectedAmenities, minRating, openingFilter, searchSelections, activeFiltersCount]);

  const filteredPubs = useMemo(() => {
    console.log('filteredPubs useMemo recalculating, userLocation:', userLocation, 'sortRefreshTrigger:', sortRefreshTrigger);
    
    // Use pubs from API instead of pubData
    if (pubsLoading || !allPubs.length) {
      return [];
    }
    
    let filtered = allPubs;

    // First, apply text search if present (this is always required)
    if (searchTerm && searchSelections.length === 0) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pub => 
        pub.name.toLowerCase().includes(searchLower) ||
        pub.description?.toLowerCase().includes(searchLower) ||
        pub.area?.toLowerCase().includes(searchLower) ||
        pub.address?.toLowerCase().includes(searchLower)
      );
    }

    // If no filters are active, just return filtered results (text search only)
    if (activeFiltersCount === 0) {
      // Sort by proximity first (if user location is available), then by rating
      filtered.sort((a, b) => {
        if (userLocation && a._internal?.lat && a._internal?.lng && b._internal?.lat && b._internal?.lng) {
          const distanceA = calculateDistance(userLocation.lat, userLocation.lng, a._internal.lat, a._internal.lng);
          const distanceB = calculateDistance(userLocation.lat, userLocation.lng, b._internal.lat, b._internal.lng);
          const distanceDiff = distanceA - distanceB;
          if (Math.abs(distanceDiff) > 0.001) {
            return distanceDiff;
          }
        }
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
        return a.name.localeCompare(b.name);
      });
      return filtered;
    }

    // Try exact matching first (all filters must match)
    let exactMatches = filtered.filter(pub => {
      const { matchCount, totalFilters } = checkPubFilters(pub);
      return matchCount === totalFilters && totalFilters > 0;
    });

    // If we have exact matches, use them (no need to show match info for exact matches)
    if (exactMatches.length > 0) {
      filtered = exactMatches;
      // Sort exact matches by proximity first, then by rating
      filtered.sort((a, b) => {
        if (userLocation && a._internal?.lat && a._internal?.lng && b._internal?.lat && b._internal?.lng) {
          const distanceA = calculateDistance(userLocation.lat, userLocation.lng, a._internal.lat, a._internal.lng);
          const distanceB = calculateDistance(userLocation.lat, userLocation.lng, b._internal.lat, b._internal.lng);
          const distanceDiff = distanceA - distanceB;
          if (Math.abs(distanceDiff) > 0.001) {
            return distanceDiff;
          }
        }
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
        return a.name.localeCompare(b.name);
      });
    } else {
      // No exact matches - use partial matching
      // Calculate match scores for all pubs
      const pubsWithScores = filtered.map(pub => {
        const filterInfo = checkPubFilters(pub);
        return {
          ...pub,
          _filterMatch: filterInfo.matchCount,
          _filterTotal: filterInfo.totalFilters,
          _missingFilters: filterInfo.missing,
        };
      });

      // Filter out pubs with 0 matches (only show pubs that match at least one filter)
      filtered = pubsWithScores
        .filter(pub => pub._filterMatch > 0)
        .sort((a, b) => {
          // Sort by match count (highest first)
          if (b._filterMatch !== a._filterMatch) {
            return b._filterMatch - a._filterMatch;
          }
          // If match counts are equal, sort by proximity (if location available)
          if (userLocation && a._internal?.lat && a._internal?.lng && b._internal?.lat && b._internal?.lng) {
            const distanceA = calculateDistance(userLocation.lat, userLocation.lng, a._internal.lat, a._internal.lng);
            const distanceB = calculateDistance(userLocation.lat, userLocation.lng, b._internal.lat, b._internal.lng);
            const distanceDiff = distanceA - distanceB;
            if (Math.abs(distanceDiff) > 0.001) {
              return distanceDiff;
            }
          }
          // Then by rating
          if (b.rating !== a.rating) return b.rating - a.rating;
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return a.name.localeCompare(b.name);
        });
    }

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
  }, [allPubs, searchSelections, searchTerm, selectedArea, selectedAmenities, minRating, openingFilter, userLocation, calculateDistance, sortRefreshTrigger, activeFiltersCount, checkPubFilters]);

  // Load more for list view - show all pubs up to itemsToShow
  const displayedPubs = useMemo(() => {
    console.log('displayedPubs recalculating, itemsToShow:', itemsToShow, 'filteredPubs length:', filteredPubs.length, 'sortRefreshTrigger:', sortRefreshTrigger);
    const result = filteredPubs.slice(0, itemsToShow);
    console.log('displayedPubs result:', result.slice(0, 3).map(p => ({ name: p.name, rating: p.rating })));
    return result;
  }, [filteredPubs, itemsToShow, sortRefreshTrigger]);

  const hasMore = itemsToShow < filteredPubs.length;
  const remainingCount = filteredPubs.length - itemsToShow;

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

  // Track search events when pubs are loaded/filtered (not just when search term changes)
  const lastTrackedSearchHash = useRef<string>('');
  
  useEffect(() => {
    // Create a hash of the current filter/search state to track when pubs are actually loaded
    const searchQuery = searchTerm?.trim() || (searchSelections.length > 0 
      ? searchSelections.map(s => s.type === 'pub' ? s.data.pub : s.type === 'area' ? s.data.area : s.data.amenity).join(', ')
      : '');
    
    // Build a hash of all active filters
    const filtersHash = [
      searchQuery || 'no-search',
      selectedArea !== 'All Areas' ? `area:${selectedArea}` : '',
      selectedAmenities.length > 0 ? `amenities:${selectedAmenities.sort().join(',')}` : '',
      minRating > 0 ? `rating:${minRating}` : '',
      openingFilter !== 'Any Time' ? `opening:${openingFilter}` : '',
      filteredPubs.length > 0 ? `results:${filteredPubs.length}` : 'no-results',
    ].filter(Boolean).join('|');
    
    // Only track if the filter/search state has changed (meaning pubs were loaded/filtered)
    if (filtersHash && filtersHash !== lastTrackedSearchHash.current) {
      lastTrackedSearchHash.current = filtersHash;
      
      // Build a readable query string for tracking
      const queryParts: string[] = [];
      if (searchQuery) queryParts.push(searchQuery);
      if (selectedArea !== 'All Areas') queryParts.push(`Area: ${selectedArea}`);
      if (selectedAmenities.length > 0) queryParts.push(`${selectedAmenities.length} amenities`);
      if (minRating > 0) queryParts.push(`Rating: ${minRating}+`);
      if (openingFilter !== 'Any Time') queryParts.push(openingFilter);
      
      const query = queryParts.length > 0 ? queryParts.join(', ') : 'All pubs';
      
      trackSearch({
        userId: session?.user?.id,
        query: query,
        resultsCount: filteredPubs.length,
      });
    }
  }, [filteredPubs.length, searchTerm, searchSelections, selectedArea, selectedAmenities, minRating, openingFilter, session?.user?.id, trackSearch]);

  // Track filter usage only when filters are actually applied (not on every render)
  // Use refs to track previous values and only track transitions from "not set" to "set"
  const prevSelectedArea = useRef<string | undefined>(undefined);
  const prevSelectedAmenities = useRef<string[]>([]);
  const prevMinRating = useRef<number>(0);
  const prevOpeningFilter = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Track area filter only when it changes from "not set" or "All Areas" to a specific area
    if (selectedArea && selectedArea !== 'All Areas' && selectedArea !== prevSelectedArea.current) {
      trackFilterUsage({
        filterKey: `area:${selectedArea}`,
      });
      prevSelectedArea.current = selectedArea;
    } else if ((!selectedArea || selectedArea === 'All Areas') && prevSelectedArea.current) {
      // Reset when filter is cleared
      prevSelectedArea.current = undefined;
    }
  }, [selectedArea, trackFilterUsage]);

  useEffect(() => {
    // Track amenity filters only when new amenities are added (not removed)
    const newAmenities = selectedAmenities.filter(a => !prevSelectedAmenities.current.includes(a));
    newAmenities.forEach(amenity => {
      trackFilterUsage({
        filterKey: `amenity:${amenity}`,
      });
    });
    prevSelectedAmenities.current = [...selectedAmenities];
  }, [selectedAmenities, trackFilterUsage]);

  useEffect(() => {
    // Track rating filter only when it increases from 0 or changes to a higher value
    if (minRating > 0 && minRating !== prevMinRating.current) {
      trackFilterUsage({
        filterKey: `minRating:${minRating}`,
      });
      prevMinRating.current = minRating;
    } else if (minRating === 0 && prevMinRating.current > 0) {
      // Reset when filter is cleared
      prevMinRating.current = 0;
    }
  }, [minRating, trackFilterUsage]);

  useEffect(() => {
    // Track opening hours filter only when it changes from "Any Time" or undefined to a specific value
    if (openingFilter && openingFilter !== 'Any Time' && openingFilter !== prevOpeningFilter.current) {
      trackFilterUsage({
        filterKey: `opening:${openingFilter}`,
      });
      prevOpeningFilter.current = openingFilter;
    } else if ((!openingFilter || openingFilter === 'Any Time') && prevOpeningFilter.current) {
      // Reset when filter is cleared
      prevOpeningFilter.current = undefined;
    }
  }, [openingFilter, trackFilterUsage]);

  // Reset to first page when filters change or location is obtained
  useEffect(() => {
    setItemsToShow(12); // Reset to initial count when filters change
  }, [searchSelections, searchTerm, selectedArea, selectedAmenities, minRating, openingFilter, userLocation]);

  // Force refresh when user location is set
  useEffect(() => {
    if (userLocation && view === 'list') {
      console.log('User location changed, forcing refresh');
      // Reset to initial count
      setItemsToShow(12);
      setSortRefreshTrigger(prev => prev + 1);
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

  // Re-trigger shimmer every 6s (mobile filter button)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    const id = setInterval(() => setAnimateShimmer((v) => !v), 6000);
    return () => clearInterval(id);
  }, []);

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
  const handleSearchSelections = (selections: SearchSuggestion[]) => {
    setSearchSelections(selections);
  };

  const handleRemoveSearchSelection = (selectionId: string) => {
    setSearchSelections(selections => selections.filter(s => s.id !== selectionId));
  };

  const handleAmenityToggle = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleClearAllFilters = () => {
    // Use updateUrl to clear all filters in one batch operation
    updateUrl({
      searchTerm: '',
      selectedArea: 'All Areas',
      selectedAmenities: [],
      minRating: 0,
      openingFilter: '',
    });
    setSearchSelections([]);
    setItemsToShow(12); // Reset to initial count
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
        setItemsToShow(12); // Reset to initial count
        setSortRefreshTrigger(prev => {
          console.log('Triggering sort refresh, prev value:', prev);
          return prev + 1;
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        setLocationPermission('denied');
        setShowLocationPopup(false);
        alert('Unable to get your location. Please check your browser permissions and try again.');
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
          className="fixed left-0 right-0 top-0 md:top-24 bottom-0 grid grid-cols-1 lg:grid-cols-[360px_1fr] bg-white"
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

            {/* Desktop filter summary */}
            <div className="hidden lg:flex absolute top-4 left-4 right-4 z-30">
              <div className="flex w-full flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-5 py-2 text-sm text-gray-700 shadow-md backdrop-blur-sm">
                <span className="text-sm font-medium text-gray-600">Active filters:</span>
                {hasActiveMapFilters ? (
                  <>
                    <AnimatePresence>
                      {mapFilters.searchTerm && (
                        <motion.button
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          onClick={handleMapRemoveSearchTerm}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-200"
                        >
                          <span>🔍 {mapFilters.searchTerm}</span>
                          <X className="h-3.5 w-3.5" />
                        </motion.button>
                      )}

                      {mapFilters.selectedArea && mapFilters.selectedArea !== DEFAULT_AREA && (
                        <motion.button
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          onClick={handleMapRemoveArea}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-200"
                        >
                          <span>📍 {mapFilters.selectedArea}</span>
                          <X className="h-3.5 w-3.5" />
                        </motion.button>
                      )}

                      {mapFilters.minRating > 0 && (
                        <motion.button
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          onClick={handleMapRemoveRating}
                          className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 transition-colors hover:bg-yellow-200"
                        >
                          <span>⭐ {mapFilters.minRating}+ Rating</span>
                          <X className="h-3.5 w-3.5" />
                        </motion.button>
                      )}

                      {mapFilters.openingFilter && mapFilters.openingFilter !== DEFAULT_OPENING && (
                        <motion.button
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          onClick={handleMapRemoveOpening}
                          className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 transition-colors hover:bg-purple-200"
                        >
                          <span>🕒 {mapFilters.openingFilter}</span>
                          <X className="h-3.5 w-3.5" />
                        </motion.button>
                      )}

                      {mapFilters.selectedAmenities.map((amenity) => (
                        <motion.button
                          key={amenity}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          onClick={() => handleMapRemoveAmenity(amenity)}
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200"
                        >
                          <span>{amenity}</span>
                          <X className="h-3.5 w-3.5" />
                        </motion.button>
                      ))}
                    </AnimatePresence>

                    <button
                      onClick={handleMapClearAll}
                      className="text-xs font-medium text-red-600 underline transition-colors hover:text-red-700"
                    >
                      Clear all
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">None selected</span>
                )}
              </div>
            </div>

            {/* Floating Action Buttons */}
            {/* Mobile Filters Button */}
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMobileFilterDrawer(true)}
              className="fixed top-12 right-4 bg-gradient-to-br from-[#08d78c] to-[#06b875] hover:from-[#06b875] hover:to-[#05a066] text-white shadow-2xl rounded-full px-5 py-3 flex items-center gap-2 z-40 md:hidden btn-shimmer overflow-hidden"
              title="Filters"
            >
              <Filter className="w-5 h-5" />
              <span className="font-semibold text-sm">Filters</span>
              
              {/* Shimmer overlay */}
              <span
                className={`
                  pointer-events-none absolute inset-0
                  before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.55),transparent)]
                  before:w-[60%] before:translate-x-[-120%]
                  ${animateShimmer ? "animate-shimmer" : ""}
                `}
                aria-hidden="true"
              />
            </motion.button>

            {/* Desktop Spin the Wheel Button */}
            <button
              onClick={() => setShowRandomPicker(true)}
              className="fixed bottom-6 right-6 bg-[#08d78c] text-white p-4 rounded-full shadow-lg hover:bg-[#07c47a] transition-colors z-20 hidden md:block"
              title="Spin the Wheel"
            >
              <span className="text-2xl">🎡</span>
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

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          isOpen={showMobileFilterDrawer}
          onClose={() => setShowMobileFilterDrawer(false)}
          amenitiesByCategory={amenitiesByCategory}
          selectedAmenities={mapFilters.selectedAmenities}
          onAmenityToggle={(amenity) => {
            const isSelected = mapFilters.selectedAmenities.includes(amenity);
            const newAmenities = isSelected
              ? mapFilters.selectedAmenities.filter(a => a !== amenity)
              : [...mapFilters.selectedAmenities, amenity];
            updateMapFilters({ ...mapFilters, selectedAmenities: newAmenities });
          }}
          onClearAll={() => updateMapFilters({
            ...mapFilters,
            selectedAmenities: [],
            selectedArea: 'All Areas',
            minRating: 0,
            openingFilter: 'Any Time',
          })}
          areas={areas}
          selectedArea={mapFilters.selectedArea}
          onAreaChange={(area) => updateMapFilters({ ...mapFilters, selectedArea: area })}
          minRating={mapFilters.minRating}
          onRatingChange={(rating) => updateMapFilters({ ...mapFilters, minRating: rating })}
          openingFilter={mapFilters.openingFilter}
          onRemoveArea={() => updateMapFilters({ ...mapFilters, selectedArea: 'All Areas' })}
          onRemoveRating={() => updateMapFilters({ ...mapFilters, minRating: 0 })}
          onRemoveOpening={() => updateMapFilters({ ...mapFilters, openingFilter: 'Any Time' })}
          onSearch={(selections) => {
            // Handle search for map view
            console.log('Map view search:', selections);
          }}
        />
      </>
    );
  }

  // Original List View (unchanged)
  return (
    <>
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search and Essential Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            {/* Search Bar */}
            <div className="md:col-span-5">
              <SearchBar
                placeholder="Search by features, area, or pub name"
                onSearch={handleSearchSelections}
                selections={searchSelections}
                variant="default"
              />
            </div>

            {/* Area Dropdown */}
            <div className="md:col-span-3">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent appearance-none bg-white"
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
                className="w-full px-3 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent appearance-none bg-white"
              >
                <option value={0}>⭐ Any Rating</option>
                <option value={4.5}>⭐ 4.5+</option>
                <option value={4.0}>⭐ 4.0+</option>
                <option value={3.5}>⭐ 3.5+</option>
              </select>
            </div>

            {/* Filters Button */}
            <div className="md:col-span-2">
              <FiltersButton onClick={() => setShowFilterDrawer(true)} />
            </div>
          </div>

          {/* Filter Chips */}
          <FilterChips
            selectedArea={selectedArea}
            selectedAmenities={selectedAmenities}
            minRating={minRating}
            openingFilter={openingFilter}
            searchSelections={searchSelections}
            onRemoveArea={() => setSelectedArea('')}
            onRemoveAmenity={(amenity) => setSelectedAmenities(selectedAmenities.filter(a => a !== amenity))}
            onRemoveRating={() => setMinRating(0)}
            onRemoveOpening={() => setOpeningFilter('')}
            onRemoveSearchSelection={handleRemoveSearchSelection}
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
                    {activeFiltersCount > 0 && filteredPubs.length > 0 && (filteredPubs[0] as any)?._filterMatch !== undefined && (filteredPubs[0] as any)._filterMatch < (filteredPubs[0] as any)._filterTotal && (
                      <span className="text-sm text-amber-600 font-medium">
                        (showing partial matches)
                      </span>
                    )}
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
                  {filteredPubs.length !== allPubs.length && (
                    <span className="text-gray-500 ml-1">
                      (filtered from {allPubs.length} total)
                    </span>
                  )}
                </>
              ) : null}
              </div>

            {/* Sort by Distance and View Mode Toggles */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Sort by Distance Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Sort by distance button clicked');
                  requestUserLocation();
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  userLocation
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                }`}
                title={userLocation ? 'Already sorted by distance' : 'Sort by distance to you'}
              >
                <MapPin className="w-4 h-4" />
                <span>{userLocation ? 'Sorted' : 'Sort by distance'}</span>
              </button>

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
      </div>

      {/* Results Content */}
      <section className="py-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {view === 'list' ? (
            <>
              {pubsLoading ? (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading pubs...</h3>
                  <p className="text-gray-600">Fetching pub data from the database</p>
                </div>
              ) : filteredPubs.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" key={`grid-${selectedArea}-${selectedAmenities.join(',')}-${minRating}-${openingFilter}-${searchTerm}`}>
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
                            _internal: pub._internal as { place_id?: string; photo_name?: string; photo_reference?: string; photo_url?: string; lat?: number; lng?: number; } | undefined,
                            _filterMatch: (pub as any)._filterMatch,
                            _filterTotal: (pub as any)._filterTotal,
                            _missingFilters: (pub as any)._missingFilters
                          }}
                  />
                ))}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="flex items-center justify-center mt-8">
                      <button
                        onClick={() => setItemsToShow(prev => Math.min(prev + pubsPerPage, filteredPubs.length))}
                        className="px-6 py-3 bg-[#08d78c] text-black rounded-lg font-medium hover:bg-[#06b875] transition-colors shadow-md hover:shadow-lg"
                      >
                        Load More {remainingCount > 0 && `(${remainingCount} remaining)`}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <div className="text-6xl mb-6">🍺</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {activeFiltersCount > 0 ? 'No pubs match all filters' : 'No pubs found'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {activeFiltersCount > 0 
                      ? `We couldn't find any pubs matching all ${activeFiltersCount} selected filters. Try removing some filters to see more results.`
                      : 'Try adjusting your filters or search terms'}
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

      {/* Mobile Filters Button (replaces Spin Wheel on mobile) */}
      {/* Mobile Filters Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowMobileFilterDrawer(true)}
        className="fixed top-12 left-4 bg-gradient-to-br from-[#08d78c] to-[#06b875] hover:from-[#06b875] hover:to-[#05a066] text-white shadow-2xl rounded-full px-5 py-3 flex items-center gap-2 z-40 md:hidden btn-shimmer overflow-hidden"
        title="Filters"
      >
        <Filter className="w-5 h-5" />
        <span className="font-semibold text-sm">Filters</span>
        
        {/* Shimmer overlay */}
        <span
          className={`
            pointer-events-none absolute inset-0
            before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.55),transparent)]
            before:w-[60%] before:translate-x-[-120%]
            ${animateShimmer ? "animate-shimmer" : ""}
          `}
          aria-hidden="true"
        />
      </motion.button>

      {/* Desktop Spin Wheel Button */}
      {filteredPubs.length > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowRandomPicker(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#08d78c] to-[#06b875] hover:from-[#06b875] hover:to-[#05a066] text-white rounded-full shadow-2xl flex items-center justify-center text-3xl z-40 group hidden md:flex"
          title="Spin the Wheel - Random Pub"
        >
          🎡
          <div className="absolute -top-12 right-0 bg-black text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Feeling indecisive? Spin!
          </div>
        </motion.button>
      )}

      {/* Filter Drawer (Desktop) */}
      <FilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        amenitiesByCategory={amenitiesByCategory}
        selectedAmenities={selectedAmenities}
        onAmenityToggle={handleAmenityToggle}
        onClearAll={() => setSelectedAmenities([])}
        onApply={() => setShowFilterDrawer(false)}
      />

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showMobileFilterDrawer}
        onClose={() => setShowMobileFilterDrawer(false)}
        amenitiesByCategory={amenitiesByCategory}
        selectedAmenities={selectedAmenities}
        onAmenityToggle={handleAmenityToggle}
        onClearAll={handleClearAllFilters}
        areas={listAreas}
        selectedArea={selectedArea}
        onAreaChange={setSelectedArea}
        minRating={minRating}
        onRatingChange={setMinRating}
        openingFilter={openingFilter}
        searchSelections={searchSelections}
        onSearch={handleSearchSelections}
        onRemoveArea={() => setSelectedArea('')}
        onRemoveRating={() => setMinRating(0)}
        onRemoveOpening={() => setOpeningFilter('')}
        onRemoveSearchSelection={handleRemoveSearchSelection}
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
          // Include search selections in filters
          searchSelections: searchSelections,
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

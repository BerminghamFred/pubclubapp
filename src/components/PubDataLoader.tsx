'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { pubData } from '@/data/pubData';
import { Pub } from '@/data/types';
import PubCard from '@/components/PubCard';
import RandomPicker from '@/components/RandomPicker';
import { generatePubSlug } from '@/utils/slugUtils';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';
import { isPubOpenNow, getCurrentUKTimeString, getCurrentUKDayName } from '@/utils/openingHours';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export default function PubDataLoader() {
  // TEMPORARY DEBUG: Log the first few pubs to see their structure
  useEffect(() => {
    console.log('=== TEMPORARY DEBUG ===');
    console.log('First 3 pubs from pubData:', pubData.slice(0, 3).map(pub => ({
      id: pub.id,
      name: pub.name,
      hasAmenities: !!pub.amenities,
      amenities: pub.amenities,
      hasFeatures: !!pub.features,
      features: pub.features,
      // Check if TNT Sports exists anywhere in the pub object
      hasTntSports: pub.amenities?.includes('TNT Sports') || pub.features?.includes('TNT Sports'),
      // Log all properties to see what's actually there
      allProperties: Object.keys(pub),
      // Check for any property that contains TNT Sports
      anyPropertyWithTntSports: Object.entries(pub).filter(([key, value]) => {
        if (Array.isArray(value)) {
          return value.includes('TNT Sports');
        }
        return false;
      })
    })));
    
    // Check how many pubs actually have TNT Sports in any array property
    const pubsWithTntSports = pubData.filter(pub => {
      return Object.values(pub).some(value => {
        if (Array.isArray(value)) {
          return value.includes('TNT Sports');
        }
        return false;
      });
    });
    console.log('Pubs with TNT Sports in any array property:', pubsWithTntSports.length);
    console.log('Sample pubs with TNT Sports:', pubsWithTntSports.slice(0, 3).map(pub => ({
      id: pub.id,
      name: pub.name,
      propertiesWithTntSports: Object.entries(pub).filter(([key, value]) => {
        if (Array.isArray(value)) {
          return value.includes('TNT Sports');
        }
        return false;
      }).map(([key, value]) => key)
    })));
  }, []);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [amenitySearchTerm, setAmenitySearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [openingFilter, setOpeningFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Parse URL parameters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Parse amenities parameter
      const amenitiesParam = urlParams.get('amenities');
      if (amenitiesParam) {
        const amenities = amenitiesParam.split(',').map(a => a.trim()).filter(Boolean);
        setSelectedAmenities(amenities);
        console.log('Set amenities from URL:', amenities);
      }
      
      // Parse area parameter
      const areaParam = urlParams.get('area');
      if (areaParam) {
        setSelectedArea(areaParam);
        console.log('Set area from URL:', areaParam);
      }
      
      // Parse search parameter
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setSearchTerm(searchParam);
        console.log('Set search term from URL:', searchParam);
      }
    }
  }, []);
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pubsPerPage = 100;
  
  // Map state
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentInfoWindow, setCurrentInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Random picker state
  const [showRandomPicker, setShowRandomPicker] = useState(false);

  // Filter options - dynamically generated from pubData
  const areas = useMemo(() => {
    const uniqueAreas = [...new Set(pubData.map(pub => pub.area).filter(Boolean))];
    return ['All Areas', ...uniqueAreas.sort()];
  }, []);

  // Get all unique amenities from pub data
  const allAmenities = useMemo(() => {
    const amenitiesSet = new Set<string>();
    let pubsWithAmenities = 0;
    let totalPubs = 0;
    
    pubData.forEach(pub => {
      totalPubs++;
      if (pub.amenities && pub.amenities.length > 0) {
        pubsWithAmenities++;
        pub.amenities.forEach((amenity: string) => amenitiesSet.add(amenity));
      }
    });
    
    console.log('=== AMENITIES DEBUG ===');
    console.log('Total pubs:', totalPubs);
    console.log('Pubs with amenities:', pubsWithAmenities);
    console.log('Found amenities in pub data:', Array.from(amenitiesSet));
    
    // Debug: Show structure of first few pubs
    console.log('First 3 pubs structure:', pubData.slice(0, 3).map(pub => ({
      id: pub.id,
      name: pub.name,
      hasAmenities: !!pub.amenities,
      amenitiesCount: pub.amenities ? pub.amenities.length : 0,
      amenities: pub.amenities,
      hasFeatures: !!pub.features,
      featuresCount: pub.features ? pub.features.length : 0,
      features: pub.features
    })));
    
    // Debug: Check for TNT Sports specifically
    const tntSportsPubs = pubData.filter(pub => 
      pub.amenities?.includes('TNT Sports') || pub.features?.includes('TNT Sports')
    );
    console.log('Pubs with TNT Sports (amenities):', pubData.filter(pub => pub.amenities?.includes('TNT Sports')).length);
    console.log('Pubs with TNT Sports (features):', pubData.filter(pub => pub.features?.includes('TNT Sports')).length);
    console.log('Total pubs with TNT Sports:', tntSportsPubs.length);
    
    return Array.from(amenitiesSet).sort();
  }, []);

  // Comprehensive amenities list organized by category
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

  // Get all amenities from the comprehensive list for filtering
  const allAvailableAmenities = useMemo(() => {
    const allAmenitiesSet = new Set<string>();
    Object.values(amenitiesByCategory).forEach(categoryAmenities => {
      categoryAmenities.forEach(amenity => allAmenitiesSet.add(amenity));
    });
    return Array.from(allAmenitiesSet).sort();
  }, [amenitiesByCategory]);

  // Initialize map when view mode changes to map
  useEffect(() => {
    if (viewMode === 'map' && mapDivRef.current && !map) {
      // Small delay to ensure DOM is stable
      const timer = setTimeout(async () => {
        if (mapDivRef.current && document.contains(mapDivRef.current) && !map) {
          const initializeMap = async () => {
            try {
              if (typeof google === 'undefined' || !google.maps) {
                // Load Google Maps API if not available
                await loadGoogleMaps();
              }
              // Double-check DOM stability before creating map
              if (mapDivRef.current && document.contains(mapDivRef.current) && !map) {
                createMap();
              }
            } catch (error) {
              console.error('Failed to load Google Maps:', error);
            }
          };

          await initializeMap();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [viewMode, map]);

  const createMap = () => {
    if (!mapDivRef.current || map) return;

    try {
      // Ensure the div is still in the DOM
      if (!document.contains(mapDivRef.current)) {
        console.warn('Map div no longer in DOM, skipping map creation');
        return;
      }

      const newMap = new google.maps.Map(mapDivRef.current, {
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

      setMap(newMap);
    } catch (error) {
      console.error('Error creating map:', error);
    }
  };



  // Cleanup markers when component unmounts or map changes
  useEffect(() => {
    return () => {
      try {
        // Safely clean up all markers
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
        
        // Close any open info window
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

  // Filter amenities based on search term
  const filteredAmenitiesByCategory = useMemo(() => {
    if (!amenitySearchTerm) return amenitiesByCategory;
    
    const filtered: Record<string, string[]> = {};
    Object.entries(amenitiesByCategory).forEach(([category, amenities]) => {
      const filteredAmenities = amenities.filter(amenity => 
        amenity.toLowerCase().includes(amenitySearchTerm.toLowerCase())
      );
      if (filteredAmenities.length > 0) {
        filtered[category] = filteredAmenities;
      }
    });
    return filtered;
  }, [amenitiesByCategory, amenitySearchTerm]);

  const features = ['Live Music', 'Outdoor Seating', 'Food Served', 'Sports TV', 'Real Ale', 'Cocktails', 'Wine Bar', 'Quiz Night', 'Karaoke', 'Board Games', 'Darts', 'Pool Table', 'Garden', 'Terrace', 'Fireplace', 'Dog Friendly', 'Child Friendly', 'Wheelchair Accessible'];
  const openingFilters = ['Any Time', 'Open Now', 'Late Night (After 11pm)', 'Early Bird (Before 6pm)', 'Weekend Only', 'Breakfast Available'];
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'rating', label: 'Rating' },
    { value: 'reviewCount', label: 'Popularity' },
    { value: 'area', label: 'Area' },
    { value: 'type', label: 'Type' }
  ];

  // Filter presets


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


      // Features filter
    if (selectedFeatures.length > 0) {
      filtered = filtered.filter(pub => 
        selectedFeatures.every(feature => 
          pub.features?.includes(feature)
        )
      );
      }

      // Amenities filter
      if (selectedAmenities.length > 0) {
        console.log('=== FILTERING DEBUG ===');
        console.log('Selected amenities:', selectedAmenities);
        console.log('Pubs before amenities filter:', filtered.length);
        
        const beforeFilter = filtered.length;
        filtered = filtered.filter(pub => {
          // Check both amenities and features fields - ALL selected amenities must be present
          const hasAllAmenities = selectedAmenities.every(amenity => 
            pub.amenities?.includes(amenity) || pub.features?.includes(amenity)
          );
          if (selectedAmenities.includes('TNT Sports')) {
            console.log(`Pub "${pub.name}" - hasAmenities: ${!!pub.amenities}, amenities:`, pub.amenities, 'hasFeatures: ${!!pub.features}, features:', pub.features, 'has ALL amenities:', hasAllAmenities);
          }
          return hasAllAmenities;
        });
        
        console.log('Pubs after amenities filter:', filtered.length);
        console.log('Filtered out:', beforeFilter - filtered.length);
      }

      // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(pub => (pub.rating || 0) >= minRating);
      }


    // Opening hours filter
    if (openingFilter && openingFilter !== 'Any Time') {
      if (openingFilter === 'Open Now') {
        filtered = filtered.filter(pub => {
          return isPubOpenNow(pub.openingHours);
        });
      } else if (openingFilter === 'Late Night (After 11pm)') {
        filtered = filtered.filter(pub => {
          // For now, just return pubs that are generally open late
          // This could be enhanced with more sophisticated logic
          return pub.openingHours?.includes('11:00 PM') || pub.openingHours?.includes('12:00 AM');
        });
      } else if (openingFilter === 'Early Bird (Before 6pm)') {
        filtered = filtered.filter(pub => {
          // Pubs that open early (before 6pm typically means they open early)
          return pub.openingHours?.includes('11:00 AM') || pub.openingHours?.includes('12:00');
        });
      } else if (openingFilter === 'Weekend Only') {
        const currentDay = getCurrentUKDayName();
        const isWeekend = currentDay === 'Saturday' || currentDay === 'Sunday';
        if (!isWeekend) {
          filtered = []; // No results on weekdays for weekend-only filter
        }
      } else if (openingFilter === 'Breakfast Available') {
        filtered = filtered.filter(pub => {
          // Pubs that open early (likely serve breakfast)
          return pub.openingHours?.includes('11:00 AM') || pub.openingHours?.includes('12:00');
        });
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Pub];
      let bValue: any = b[sortBy as keyof Pub];
      
      // Handle nested properties
      if (sortBy === 'rating') {
        aValue = a.rating || 0;
        bValue = b.rating || 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [searchTerm, selectedArea, selectedFeatures, selectedAmenities, minRating, openingFilter, sortBy, sortOrder]);

  // Get all pubs up to the current page (accumulative)
  const displayedPubs = useMemo(() => {
    const endIndex = currentPage * pubsPerPage;
    return filteredPubs.slice(0, endIndex);
  }, [filteredPubs, currentPage, pubsPerPage]);

  // Add markers to the map when pubs change
  useEffect(() => {
    if (map && displayedPubs.length > 0) {
      try {
        // Safely clear existing markers
        if (markersRef.current.length > 0) {
          markersRef.current.forEach(marker => {
            try {
              // Check if marker is still valid and attached to the map
              if (marker && marker.getMap() === map) {
                marker.setMap(null);
              }
            } catch (error) {
              console.warn('Error clearing marker:', error);
            }
          });
          markersRef.current = [];
        }
        
        // Add new markers
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

              // Store marker for cleanup
              markersRef.current.push(marker);

              // Add click listener
              marker.addListener('click', () => {
                try {
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

          // Fit bounds to show all markers
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
  }, [map, displayedPubs, currentInfoWindow, amenitiesByCategory]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredPubs.length / pubsPerPage);
  const hasMore = currentPage < totalPages;

  // Load more pubs
  const loadMore = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, amenitySearchTerm, selectedArea, selectedFeatures, selectedAmenities, minRating, openingFilter, sortBy, sortOrder]);

  // Handle pub click on map
  const handlePubClick = useCallback((pub: any) => {
    // Find the full pub data from the filtered pubs
    const fullPub = filteredPubs.find(p => p.id === pub.id);
    if (fullPub) {
      setSelectedPub(fullPub);
    }
  }, [filteredPubs]);

  // Random picker handlers
  const handleViewPub = useCallback((pub: Pub) => {
    window.open(`/pubs/${generatePubSlug(pub.name, pub.id)}`, '_blank');
  }, []);


  return (
    <>
      {/* Header */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Perfect Pub
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Discover London's best pubs with our optimized search. Fast filtering, loads 100 pubs at a time, and interactive maps.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Search Bar */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Pubs
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                placeholder="Search by name, description, area, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>



          {/* View Mode Toggle */}
          <div className="mb-6" data-view-mode-section>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              View Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  viewMode === 'list'
                    ? 'bg-[#08d78c] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                📋 List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  viewMode === 'map'
                    ? 'bg-[#08d78c] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                🗺️ Map View
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Area Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area
                </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              >
                {areas.map((area) => (
                    <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>


            {/* Rating Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={4.0}>4.0+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                  <option value={3.0}>3.0+ Stars</option>
              </select>
            </div>


              {/* Opening Hours Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Hours
                  <span className="text-xs text-gray-500 ml-2">
                    (Current UK time: {getCurrentUKTimeString()})
                  </span>
                </label>
                <select
                  value={openingFilter}
                  onChange={(e) => setOpeningFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                >
                  {openingFilters.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                >
                  {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
              </div>
              </div>
            </div>
            </div>
          </div>

          {/* Amenities Search */}
          <div className="mb-6 max-w-4xl mx-auto">
            <label htmlFor="amenity-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Amenities
            </label>
            <input
              type="text"
              id="amenity-search"
              placeholder="Search for specific amenities..."
              value={amenitySearchTerm}
              onChange={(e) => setAmenitySearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
            />
          </div>

          {/* Amenities Categories */}
          <div className="mb-6 max-w-4xl mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Amenities
            </label>
            {Object.entries(filteredAmenitiesByCategory).map(([category, amenities]) => (
              <div key={category} className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">{category}</h4>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                <button
                  key={amenity}
                      onClick={() => {
                        if (selectedAmenities.includes(amenity)) {
                          setSelectedAmenities(prev => prev.filter(a => a !== amenity));
                        } else {
                          setSelectedAmenities(prev => [...prev, amenity]);
                        }
                      }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                    selectedAmenities.includes(amenity)
                          ? 'bg-[#08d78c] text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
              </div>
            ))}
          </div>

          {/* Results Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{displayedPubs.length}</span> of{' '}
                <span className="font-medium">{filteredPubs.length}</span> pubs
                {filteredPubs.length !== pubData.length && (
                  <span className="ml-2">
                    (filtered from {pubData.length} total)
                  </span>
                )}
              </div>
            <div className="flex items-center gap-4">
                {selectedAmenities.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{selectedAmenities.length}</span> amenities selected
                  </div>
                )}
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setAmenitySearchTerm('');
                    setSelectedArea('');
                    setSelectedFeatures([]);
                    setSelectedAmenities([]);
                    setMinRating(0);
                    setOpeningFilter('');
                    setSortBy('name');
                    setSortOrder('asc');
                    setCurrentPage(1);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All Filters
              </button>
            </div>
            </div>
          </div>

          {/* Spin the Wheel Button */}
          {filteredPubs.length > 0 && (
            <div className="mb-6 text-center">
              <button
                onClick={() => setShowRandomPicker(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#08d78c] to-[#06b875] hover:from-[#06b875] hover:to-[#05a066] text-white font-bold text-lg rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                🎡 Spin the Wheel
                <span className="text-sm opacity-90">
                  ({filteredPubs.length} pubs)
                </span>
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Let us pick a random pub from your current filters!
              </p>
            </div>
          )}
      </section>

      {/* Results */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {displayedPubs.map((pub) => (
                  <PubCard
                    key={pub.id}
                    pub={{
                      id: pub.id,
                      name: pub.name,
                      borough: pub.area,
                      lat: pub._internal?.lat || 0,
                      lng: pub._internal?.lng || 0,
                      rating: pub.rating,
                      type: pub.type,
                      features: pub.features,
                      amenities: pub.amenities || [],
                      address: pub.address,
                      description: pub.description,
                      reviewCount: pub.reviewCount,
                      phone: pub.phone,
                      website: pub.website,
                      openingHours: pub.openingHours,
                      photoUrl: pub._internal?.photo_url
                    }}
                    onPubClick={handlePubClick}
                  />
                ))}
              </div>
          ) : viewMode === 'map' ? (
            <div className="h-[600px] w-full" key="map-container">
              <div 
                ref={mapDivRef}
                className="h-full w-full bg-gray-100 border-2 border-dashed border-gray-300"
                style={{ isolation: 'isolate' }}
              >
                {!map && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl mb-4">🗺️</div>
                      <div className="text-lg font-medium mb-2">Loading Map...</div>
                      <div className="text-sm text-gray-600">
                        Please wait while the map loads
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

              {/* Load More Button */}
          {viewMode === 'list' && hasMore && (
            <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                className="px-6 py-3 bg-[#08d78c] hover:bg-[#06b876] text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    Load More Pubs ({filteredPubs.length - displayedPubs.length} remaining)
                  </button>
                </div>
              )}

          {/* No Results */}
          {filteredPubs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🍺</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No pubs found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or search terms
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setAmenitySearchTerm('');
                  setSelectedArea('');
                  setSelectedFeatures([]);
                  setSelectedAmenities([]);
                  setMinRating(0);
                  setOpeningFilter('');
                  setSortBy('name');
                  setSortOrder('asc');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-[#08d78c] hover:bg-[#06b876] text-white font-medium rounded-lg transition-colors duration-200"
              >
                Clear All Filters
              </button>
              </div>
          )}
        </div>
      </section>

      {/* Random Picker Modal */}
      <RandomPicker
        isOpen={showRandomPicker}
        onClose={() => setShowRandomPicker(false)}
        filters={{
          area: selectedArea === 'All Areas' ? undefined : selectedArea,
          amenities: selectedAmenities,
          openNow: openingFilter === 'Open Now',
          minRating: minRating > 0 ? minRating : 3.5, // Default to 3.5+ rating
        }}
        onViewPub={handleViewPub}
      />
    </>
  );
} 
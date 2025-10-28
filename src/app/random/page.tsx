'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import RandomPicker from '@/components/RandomPicker';
import { Pub } from '@/data/types';
import { generatePubSlug } from '@/utils/slugUtils';
import FilterDrawer from '@/components/FilterDrawer';
import FilterChips from '@/components/FilterChips';
import { FiltersButton } from '@/components/FiltersButton';
import { pubData } from '@/data/pubData';

function RandomPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Parse query parameters
  const area = searchParams.get('area') || undefined;
  const amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || [];
  const openNow = searchParams.get('open_now') === '1';
  const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : 3.5;
  const auto = searchParams.get('auto') === '1';

  // Local filter state for UI controls
  const [selectedArea, setSelectedArea] = useState(area || 'All Areas');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(amenities);
  const [openingFilter, setOpeningFilter] = useState(openNow ? 'Open Now' : '');
  const [ratingFilter, setRatingFilter] = useState(minRating);

  // Amenities organized by category
  const amenitiesByCategory = useMemo(() => {
    return {
      '🎵 Music': ['DJs', 'Jukebox', 'Karaoke', 'Live Music'],
      '🍸 Drinks': ['Cocktails', 'Craft Beer', 'Craft Ales', 'Draught', 'Non-Alcoholic', 'Real Ale', 'Spirits', 'Taproom', 'Wine'],
      '🍔 Food': ['Bar Snacks', 'Bottomless Brunch', 'Bring Your Own Food', 'Burgers', 'Chips', 'English Breakfast', 'Fish and Chips', 'Gluten-Free Options', 'Kids Menu', 'Outdoor Food Service', 'Pie', 'Pizza', 'Sandwiches', 'Steak', 'Street Food Vendor', 'Sunday Roast', 'Thai', 'Vegetarian Options', 'Wings'],
      '🌳 Outdoor Space': ['Beer Garden', 'Heating', 'In the Sun', 'Large Space (20+ People)', 'Outdoor Viewing', 'Outside Bar', 'River View', 'Rooftop', 'Small Space (<20 People)', 'Street Seating', 'Under Cover'],
      '🏠 Atmosphere': ['Child Friendly', 'Cosy', 'Dog Friendly', 'Fireplace', 'Historic', 'Modern', 'Quiet', 'Traditional', 'Trendy', 'Vintage'],
      '🎮 Entertainment': ['Arcade Games', 'Board Games', 'Darts', 'Pool Table', 'Quiz Night', 'Sports TV', 'TV'],
      '🚗 Practical': ['Accessible', 'Car Park', 'Near Station', 'Wifi']
    };
  }, []);

  // Handle amenity toggle
  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  // Auto-spin on first load if auto=1
  useEffect(() => {
    if (auto) {
      setShowRandomPicker(true);
    }
  }, [auto]);

  const handleViewPub = (pub: Pub) => {
    window.open(`/pubs/${generatePubSlug(pub.name, pub.id)}`, '_blank');
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              🎡 Random Pub Picker
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Let us surprise you with a random pub from London's best selection!
            </p>
            
            {/* Filter Controls */}
            <div className="mt-8 max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">
                  Customize Your Random Selection
                </h3>
                
                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Area Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Area</label>
                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent bg-gray-700 text-white"
                    >
                      <option value="All Areas">All Areas</option>
                      <option value="Central London">Central London</option>
                      <option value="East London">East London</option>
                      <option value="West London">West London</option>
                      <option value="North London">North London</option>
                      <option value="South London">South London</option>
                      <option value="City of London">City of London</option>
                      <option value="Camden">Camden</option>
                      <option value="Islington">Islington</option>
                      <option value="Hackney">Hackney</option>
                      <option value="Tower Hamlets">Tower Hamlets</option>
                      <option value="Westminster">Westminster</option>
                      <option value="Kensington and Chelsea">Kensington and Chelsea</option>
                      <option value="Hammersmith and Fulham">Hammersmith and Fulham</option>
                      <option value="Wandsworth">Wandsworth</option>
                      <option value="Lambeth">Lambeth</option>
                      <option value="Southwark">Southwark</option>
                      <option value="Lewisham">Lewisham</option>
                      <option value="Greenwich">Greenwich</option>
                      <option value="Bromley">Bromley</option>
                      <option value="Croydon">Croydon</option>
                      <option value="Sutton">Sutton</option>
                      <option value="Merton">Merton</option>
                      <option value="Kingston upon Thames">Kingston upon Thames</option>
                      <option value="Richmond upon Thames">Richmond upon Thames</option>
                      <option value="Hounslow">Hounslow</option>
                      <option value="Ealing">Ealing</option>
                      <option value="Brent">Brent</option>
                      <option value="Harrow">Harrow</option>
                      <option value="Hillingdon">Hillingdon</option>
                      <option value="Barnet">Barnet</option>
                      <option value="Enfield">Enfield</option>
                      <option value="Waltham Forest">Waltham Forest</option>
                      <option value="Redbridge">Redbridge</option>
                      <option value="Newham">Newham</option>
                      <option value="Barking and Dagenham">Barking and Dagenham</option>
                      <option value="Havering">Havering</option>
                    </select>
                  </div>

                  {/* Rating Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Rating</label>
                    <select
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent bg-gray-700 text-white"
                    >
                      <option value={0}>⭐ Any Rating</option>
                      <option value={4.5}>⭐ 4.5+</option>
                      <option value={4.0}>⭐ 4.0+</option>
                      <option value={3.5}>⭐ 3.5+</option>
                    </select>
                  </div>

                  {/* Opening Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Opening</label>
                    <select
                      value={openingFilter}
                      onChange={(e) => setOpeningFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent bg-gray-700 text-white"
                    >
                      <option value="">Any Time</option>
                      <option value="Open Now">Open Now</option>
                    </select>
                  </div>

                  {/* Filters Button */}
                  <div className="flex items-end">
                    <FiltersButton onClick={() => setShowFilterDrawer(true)} />
                  </div>
                </div>

                {/* Filter Chips */}
                <FilterChips
                  selectedArea={selectedArea}
                  selectedAmenities={selectedAmenities}
                  minRating={ratingFilter}
                  openingFilter={openingFilter}
                  onRemoveArea={() => setSelectedArea('All Areas')}
                  onRemoveAmenity={(amenity) => setSelectedAmenities(selectedAmenities.filter(a => a !== amenity))}
                  onRemoveRating={() => setRatingFilter(0)}
                  onRemoveOpening={() => setOpeningFilter('')}
                  onClearAll={() => {
                    setSelectedArea('All Areas');
                    setSelectedAmenities([]);
                    setRatingFilter(0);
                    setOpeningFilter('');
                  }}
                />
                </div>
              </div>

            {/* Spin Button */}
            <div className="mt-8">
              <button
                onClick={() => setShowRandomPicker(true)}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#08d78c] to-[#06b875] hover:from-[#06b875] hover:to-[#05a066] text-black font-bold text-xl rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                🎡 Spin the Wheel
              </button>
              <p className="text-sm text-gray-400 mt-3">
                Get a random pub recommendation based on your preferences
              </p>
            </div>

            {/* Back to Find Pubs */}
            <div className="mt-6">
              <a
                href="/pubs"
                className="text-[#08d78c] hover:text-[#06b875] text-sm font-medium"
              >
                ← Back to Find Pubs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              How it Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#08d78c] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Smart Filtering
                </h3>
                <p className="text-gray-600">
                  We respect your area, amenity, and rating preferences to find the perfect match.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#08d78c] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚖️</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Fair Selection
                </h3>
                <p className="text-gray-600">
                  Higher-rated pubs get a slight boost, but every pub has a fair chance to be selected.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#08d78c] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Repeats
                </h3>
                <p className="text-gray-600">
                  We avoid showing the same pub multiple times in your current session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        amenitiesByCategory={amenitiesByCategory}
        selectedAmenities={selectedAmenities}
        onAmenityToggle={handleAmenityToggle}
        onClearAll={() => {
          setSelectedArea('All Areas');
          setSelectedAmenities([]);
          setRatingFilter(0);
          setOpeningFilter('');
        }}
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
          minRating: ratingFilter > 0 ? ratingFilter : undefined,
        }}
        onViewPub={handleViewPub}
      />
    </div>
  );
}

export default function RandomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <section className="bg-black text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-12 bg-gray-700 rounded w-96 mx-auto mb-4"></div>
                <div className="h-6 bg-gray-600 rounded w-2/3 mx-auto mb-8"></div>
                <div className="h-12 bg-gray-700 rounded w-48 mx-auto"></div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Content Skeleton */}
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-6"></div>
                <div className="grid md:grid-cols-3 gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    }>
      <RandomPageContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Filters {
  searchTerm: string;
  selectedArea: string;
  minRating: number;
  openingFilter: string;
  selectedAmenities: string[];
}

interface MapSidebarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  areas: string[];
}

// Use the exact same amenity categories as the list view
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

export function MapSidebar({ filters, onFiltersChange, areas }: MapSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['🎵 Music', '🍸 Drinks', '🍔 Food']) // Start with popular categories expanded
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.selectedAmenities.includes(amenity)
      ? filters.selectedAmenities.filter(a => a !== amenity)
      : [...filters.selectedAmenities, amenity];
    
    updateFilter('selectedAmenities', newAmenities);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: '',
      selectedArea: 'All Areas',
      minRating: 0,
      openingFilter: 'Any Time',
      selectedAmenities: []
    });
  };

  const hasActiveFilters = filters.searchTerm || 
    filters.selectedArea !== 'All Areas' || 
    filters.minRating > 0 || 
    filters.openingFilter !== 'Any Time' || 
    filters.selectedAmenities.length > 0;

  return (
    <aside className="flex flex-col h-full bg-white/95 backdrop-blur-sm border-r border-gray-200">
      {/* Search Box */}
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          placeholder="🔍 Search pubs..."
          value={filters.searchTerm}
          onChange={(e) => updateFilter('searchTerm', e.target.value)}
          className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#08d78c] focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* Compact Controls Row */}
      <div className="p-4 space-y-3 border-b border-gray-100">
        {/* Area Dropdown */}
        <select
          value={filters.selectedArea}
          onChange={(e) => updateFilter('selectedArea', e.target.value)}
          className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#08d78c] focus:border-transparent outline-none text-sm"
        >
          <option value="All Areas">📍 All Areas</option>
          {areas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>

        {/* Rating Dropdown */}
        <select
          value={filters.minRating}
          onChange={(e) => updateFilter('minRating', Number(e.target.value))}
          className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#08d78c] focus:border-transparent outline-none text-sm"
        >
          <option value={0}>⭐ Any Rating</option>
          <option value={4}>⭐ 4+ Stars</option>
          <option value={4.5}>⭐ 4.5+ Stars</option>
        </select>

        {/* Opening Hours Dropdown */}
        <select
          value={filters.openingFilter}
          onChange={(e) => updateFilter('openingFilter', e.target.value)}
          className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#08d78c] focus:border-transparent outline-none text-sm"
        >
          <option value="Any Time">🕒 Any Time</option>
          <option value="Open Now">🕒 Open Now</option>
        </select>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Amenity Categories */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6">
          {Object.entries(amenitiesByCategory).map(([category, amenities]) => (
            <div key={category} className="border-b border-gray-100 pb-6 last:border-b-0">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded-lg transition-colors mb-3"
              >
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">{category.split(' ')[0]}</span>
                  <span>{category.split(' ').slice(1).join(' ')}</span>
                </h3>
                {expandedCategories.has(category) ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {expandedCategories.has(category) && (
                <div className="grid grid-cols-1 gap-2">
                  {amenities.map(amenity => {
                    const isSelected = filters.selectedAmenities.includes(amenity);
                    
                    return (
                      <button
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-4 py-3 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#08d78c] text-white shadow-md transform scale-[1.02]'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{amenity}</span>
                          {isSelected && (
                            <span className="text-white">✓</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Row */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3 mb-3">
          <button
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => {/* Filters auto-apply on change */}}
            className="flex-1 px-6 py-3 bg-[#08d78c] hover:bg-[#06b875] text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            Apply Filters
          </button>
        </div>
        
        {/* Active Filters Count */}
        <div className="text-sm text-gray-600 text-center">
          {filters.selectedAmenities.length + 
           (filters.searchTerm ? 1 : 0) + 
           (filters.selectedArea !== 'All Areas' ? 1 : 0) + 
           (filters.minRating > 0 ? 1 : 0) + 
           (filters.openingFilter !== 'Any Time' ? 1 : 0)} filter{(filters.selectedAmenities.length + 
           (filters.searchTerm ? 1 : 0) + 
           (filters.selectedArea !== 'All Areas' ? 1 : 0) + 
           (filters.minRating > 0 ? 1 : 0) + 
           (filters.openingFilter !== 'Any Time' ? 1 : 0)) !== 1 ? 's' : ''} selected
        </div>
      </div>
    </aside>
  );
}

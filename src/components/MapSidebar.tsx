'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { AMENITY_FILTERS } from '@/data/amenityData';

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

// Category icons and grouping
const categoryIcons = {
  'Food & Dining': '🍔',
  'Drinks & Beer': '🍺',
  'Entertainment': '🎵',
  'Sports & Games': '⚽',
  'Outdoor & Space': '🌳',
  'Special Features': '⭐'
};

// Group amenities by category with proper mapping
function groupAmenitiesByCategory() {
  const categories: Record<string, string[]> = {};
  
  // Define explicit mappings for each amenity
  const amenityCategories: Record<string, string> = {
    'sunday-roast': 'Food & Dining',
    'bottomless-brunch': 'Food & Dining',
    'beer-garden': 'Outdoor & Space',
    'dog-friendly': 'Special Features',
    'cocktails': 'Drinks & Beer',
    'real-ale-craft-beer': 'Drinks & Beer',
    'live-music': 'Entertainment',
    'pub-quiz': 'Entertainment',
    'sky-sports': 'Sports & Games',
    'pool-table-darts': 'Sports & Games'
  };
  
  AMENITY_FILTERS.forEach(amenity => {
    const category = amenityCategories[amenity.slug] || 'Special Features';
    
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(amenity.slug);
  });
  
  return categories;
}

export function MapSidebar({ filters, onFiltersChange, areas }: MapSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Food & Dining', 'Drinks & Beer', 'Entertainment']) // Start with popular categories expanded
  );

  const amenityCategories = groupAmenitiesByCategory();

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
        <div className="space-y-2">
          {Object.entries(amenityCategories).map(([category, amenities]) => (
            <div key={category} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-3 py-3 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                  <span>{categoryIcons[category as keyof typeof categoryIcons] || '📍'}</span>
                  {category}
                </span>
                {expandedCategories.has(category) ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                )}
              </button>
              
              {expandedCategories.has(category) && (
                <div className="px-3 py-3 space-y-2 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    {amenities.map(amenity => {
                      const amenityInfo = AMENITY_FILTERS.find(a => a.slug === amenity);
                      const isSelected = filters.selectedAmenities.includes(amenity);
                      
                      return (
                        <label
                          key={amenity}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAmenity(amenity)}
                            className="rounded border-gray-300 text-[#08d78c] focus:ring-[#08d78c]"
                          />
                          <span className="text-gray-700 leading-tight">
                            {amenityInfo?.title || amenity.replace(/-/g, ' ')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Row */}
      <div className="p-4 border-t border-gray-100 bg-white/90">
        <div className="flex gap-3">
          <button
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => {/* Filters auto-apply on change */}}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#08d78c] rounded-lg hover:bg-[#07c47a] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </aside>
  );
}

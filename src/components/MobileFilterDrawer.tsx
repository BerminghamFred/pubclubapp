'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import FilterChips from '@/components/FilterChips';
import { SearchSuggestion } from '@/utils/searchUtils';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  amenitiesByCategory: Record<string, string[]>;
  selectedAmenities: string[];
  onAmenityToggle: (amenity: string) => void;
  onClearAll: () => void;
  
  // New props for enhanced filtering
  areas: string[];
  selectedArea: string;
  onAreaChange: (area: string) => void;
  minRating: number;
  onRatingChange: (rating: number) => void;
  openingFilter?: string;
  searchSelections?: SearchSuggestion[];
  onSearch: (selections: SearchSuggestion[]) => void;
  onRemoveArea: () => void;
  onRemoveRating: () => void;
  onRemoveOpening: () => void;
  onRemoveSearchSelection?: (selectionId: string) => void;
}

export default function MobileFilterDrawer({
  isOpen,
  onClose,
  amenitiesByCategory,
  selectedAmenities,
  onAmenityToggle,
  onClearAll,
  areas,
  selectedArea,
  onAreaChange,
  minRating,
  onRatingChange,
  openingFilter,
  searchSelections = [],
  onSearch,
  onRemoveArea,
  onRemoveRating,
  onRemoveOpening,
  onRemoveSearchSelection,
}: MobileFilterDrawerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[90] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              
              {/* Active Filters Chips */}
              <div className="mt-3">
                <FilterChips
                  selectedArea={selectedArea}
                  selectedAmenities={selectedAmenities}
                  minRating={minRating}
                  openingFilter={openingFilter}
                  searchSelections={searchSelections}
                  onRemoveArea={onRemoveArea}
                  onRemoveAmenity={onAmenityToggle}
                  onRemoveRating={onRemoveRating}
                  onRemoveOpening={onRemoveOpening}
                  onRemoveSearchSelection={onRemoveSearchSelection}
                  onClearAll={onClearAll}
                />
              </div>
            </div>

            {/* Filter Content */}
            <div className="p-6 space-y-6">
              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-3">Search</h3>
                <SearchBar
                  placeholder="Quick search by features, area, or pub name..."
                  onSearch={onSearch}
                  variant="default"
                />
              </motion.div>

              {/* Area Dropdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-3">📍 Area</h3>
                <select
                  value={selectedArea}
                  onChange={(e) => onAreaChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent appearance-none bg-white text-base"
                >
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area === 'All Areas' ? 'All Areas' : area}
                    </option>
                  ))}
                </select>
              </motion.div>

              {/* Min Rating */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-3">⭐ Rating</h3>
                <select
                  value={minRating}
                  onChange={(e) => onRatingChange(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent appearance-none bg-white text-base"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4.5}>4.5+</option>
                  <option value={4.0}>4.0+</option>
                  <option value={3.5}>3.5+</option>
                </select>
              </motion.div>

              {/* Filter Categories */}
              {Object.entries(amenitiesByCategory).map(([category, amenities], index) => {
                const isExpanded = expandedCategories.has(category);
                return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  className="border-b border-gray-100 pb-6 last:border-b-0"
                >
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full font-semibold text-lg text-gray-900 mb-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.split(' ')[0]}</span>
                      <span>{category.split(' ').slice(1).join(' ')}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-2">
                          {amenities.map((amenity) => {
                            const isSelected = selectedAmenities.includes(amenity);
                            return (
                              <button
                                key={amenity}
                                onClick={() => onAmenityToggle(amenity)}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-[#08d78c] hover:bg-[#06b875] text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


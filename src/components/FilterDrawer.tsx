'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  amenitiesByCategory: Record<string, string[]>;
  selectedAmenities: string[];
  onAmenityToggle: (amenity: string) => void;
  onClearAll: () => void;
  onApply: () => void;
}

export default function FilterDrawer({
  isOpen,
  onClose,
  amenitiesByCategory,
  selectedAmenities,
  onAmenityToggle,
  onClearAll,
  onApply
}: FilterDrawerProps) {
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
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-full sm:w-[400px] md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto"
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {selectedAmenities.length} filter{selectedAmenities.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={onClearAll}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Filter Categories */}
            <div className="p-6 space-y-6">
              {Object.entries(amenitiesByCategory).map(([category, amenities]) => {
                const isExpanded = expandedCategories.has(category);
                return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
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
                      const key = String(amenity).trim().toLowerCase();
                      const isSelected = selectedAmenities.some(
                        (a) => String(a).trim().toLowerCase() === key
                      );
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
                onClick={() => {
                  onApply();
                  onClose();
                }}
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


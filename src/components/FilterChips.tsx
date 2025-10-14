'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FilterChipsProps {
  selectedArea?: string;
  selectedAmenities: string[];
  minRating: number;
  openingFilter?: string;
  onRemoveArea: () => void;
  onRemoveAmenity: (amenity: string) => void;
  onRemoveRating: () => void;
  onRemoveOpening: () => void;
  onClearAll: () => void;
}

export default function FilterChips({
  selectedArea,
  selectedAmenities,
  minRating,
  openingFilter,
  onRemoveArea,
  onRemoveAmenity,
  onRemoveRating,
  onRemoveOpening,
  onClearAll
}: FilterChipsProps) {
  const hasFilters = 
    (selectedArea && selectedArea !== 'All Areas') ||
    selectedAmenities.length > 0 ||
    minRating > 0 ||
    (openingFilter && openingFilter !== 'Any Time');

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-600">Active filters:</span>
      
      <AnimatePresence>
        {/* Area Filter */}
        {selectedArea && selectedArea !== 'All Areas' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={onRemoveArea}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full text-sm font-medium transition-colors group"
          >
            <span>📍 {selectedArea}</span>
            <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}

        {/* Rating Filter */}
        {minRating > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={onRemoveRating}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-sm font-medium transition-colors group"
          >
            <span>⭐ {minRating}+ Rating</span>
            <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}

        {/* Opening Filter */}
        {openingFilter && openingFilter !== 'Any Time' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={onRemoveOpening}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-full text-sm font-medium transition-colors group"
          >
            <span>🕒 {openingFilter}</span>
            <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}

        {/* Amenity Filters */}
        {selectedAmenities.map((amenity) => (
          <motion.button
            key={amenity}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onRemoveAmenity(amenity)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#08d78c]/20 hover:bg-[#08d78c]/30 text-[#08d78c] rounded-full text-sm font-medium transition-colors group"
          >
            <span>{amenity}</span>
            <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Clear All Button */}
      <button
        onClick={onClearAll}
        className="text-sm text-red-600 hover:text-red-700 font-medium underline ml-2"
      >
        Clear all
      </button>
    </div>
  );
}


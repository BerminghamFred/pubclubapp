'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { SearchSuggestion } from '@/utils/searchUtils';

interface FilterChipsProps {
  selectedArea?: string;
  selectedAmenities: string[];
  minRating: number;
  openingFilter?: string;
  searchSelections?: SearchSuggestion[];
  onRemoveArea: () => void;
  onRemoveAmenity: (amenity: string) => void;
  onRemoveRating: () => void;
  onRemoveOpening: () => void;
  onRemoveSearchSelection?: (selectionId: string) => void;
  onClearAll: () => void;
}

export default function FilterChips({
  selectedArea,
  selectedAmenities,
  minRating,
  openingFilter,
  searchSelections = [],
  onRemoveArea,
  onRemoveAmenity,
  onRemoveRating,
  onRemoveOpening,
  onRemoveSearchSelection,
  onClearAll
}: FilterChipsProps) {
  const hasFilters = 
    (selectedArea && selectedArea !== 'All Areas') ||
    selectedAmenities.length > 0 ||
    minRating > 0 ||
    (openingFilter && openingFilter !== 'Any Time') ||
    searchSelections.length > 0;

  if (!hasFilters) return null;

  // Case-insensitive unique (keep first) so "Beer Garden" and "beer garden" show as one chip
  const uniqueAmenities = Array.from(
    new Map(
      selectedAmenities
        .map((a) => String(a).trim())
        .filter(Boolean)
        .map((a) => [a.toLowerCase(), a])
    ).values()
  );

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

        {/* SearchBar Selection Filters (exclude amenities; those are shown from selectedAmenities below) */}
        {searchSelections
          .filter((s) => s.type !== 'amenity')
          .map((selection) => (
          <motion.button
            key={selection.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onRemoveSearchSelection?.(selection.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors group ${selection.color}`}
          >
            <span>{selection.text}</span>
            <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </motion.button>
        ))}

        {/* Amenity Filters (display unique only; remove removes all matching) */}
        {uniqueAmenities.map((amenity) => (
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


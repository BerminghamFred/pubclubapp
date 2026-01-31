'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

interface Filters {
  searchTerm: string;
  selectedArea: string;
  minRating: number;
  openingFilter: string;
  selectedAmenities: string[];
}

interface MapUrlState {
  view: 'list' | 'map';
  listOpen: boolean;
  filters: Filters;
  updateView: (view: 'list' | 'map') => void;
  updateListOpen: (open: boolean) => void;
  updateFilters: (filters: Filters) => void;
}

const DEFAULT_AREA = 'All Areas';
const DEFAULT_OPENING = 'Any Time';

const decodeFiltersParam = (filtersParam: string | null) => {
  if (!filtersParam) return null;

  try {
    const decoded =
      filtersParam.includes('%') ? decodeURIComponent(filtersParam) : filtersParam;
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error parsing filters from URL:', error);
    return null;
  }
};

/** Dedupe by trimmed lowercase (keep first occurrence) so amenities never duplicate in UI. */
function normalizeAmenities(arr: string[] | undefined): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  return arr
    .map((a) => String(a).trim())
    .filter(Boolean)
    .filter((a) => {
      const key = a.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const normalizeFilters = (filters: Filters): Filters => ({
  searchTerm: filters.searchTerm || '',
  selectedArea: filters.selectedArea || DEFAULT_AREA,
  minRating: filters.minRating || 0,
  openingFilter: filters.openingFilter || DEFAULT_OPENING,
  selectedAmenities: normalizeAmenities(filters.selectedAmenities),
});

export function useMapUrlState(): MapUrlState {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current URL state
  const view = (searchParams.get('view') as 'list' | 'map') || 'list';
  const listOpen = searchParams.get('list') === 'open';

  const filters: Filters = useMemo(() => {
    const parsedFilters = decodeFiltersParam(searchParams.get('filters'));
    if (parsedFilters) {
      return normalizeFilters({
        searchTerm: parsedFilters.searchTerm ?? '',
        selectedArea: parsedFilters.selectedArea ?? DEFAULT_AREA,
        minRating: parsedFilters.minRating ?? 0,
        openingFilter: parsedFilters.openingFilter ?? DEFAULT_OPENING,
        selectedAmenities: parsedFilters.selectedAmenities ?? [],
      });
    }

    const amenitiesFromUrl = normalizeAmenities(searchParams.get('amenities')?.split(','));
    return normalizeFilters({
      searchTerm: searchParams.get('search') || '',
      selectedArea: searchParams.get('area') || DEFAULT_AREA,
      minRating: Number(searchParams.get('rating')) || 0,
      openingFilter: searchParams.get('opening') || DEFAULT_OPENING,
      selectedAmenities: amenitiesFromUrl,
    });
  }, [searchParams]);

  // Update URL with new state
  const updateUrl = useCallback((updates: Record<string, any>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else if (typeof value === 'object') {
        params.set(key, encodeURIComponent(JSON.stringify(value)));
      } else {
        params.set(key, String(value));
      }
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [router, searchParams]);

  const updateView = useCallback((newView: 'list' | 'map') => {
    updateUrl({ view: newView });
  }, [updateUrl]);

  const updateListOpen = useCallback((open: boolean) => {
    updateUrl({ list: open ? 'open' : null });
  }, [updateUrl]);

  const updateFilters = useCallback((newFilters: Filters) => {
    const normalized = normalizeFilters(newFilters);

    updateUrl({
      search: normalized.searchTerm || null,
      area:
        normalized.selectedArea && normalized.selectedArea !== DEFAULT_AREA
          ? normalized.selectedArea
          : null,
      amenities:
        normalized.selectedAmenities.length > 0
          ? normalized.selectedAmenities.join(',')
          : null,
      rating: normalized.minRating > 0 ? String(normalized.minRating) : null,
      opening:
        normalized.openingFilter && normalized.openingFilter !== DEFAULT_OPENING
          ? normalized.openingFilter
          : null,
      filters: normalized,
    });
  }, [updateUrl]);

  return {
    view,
    listOpen,
    filters,
    updateView,
    updateListOpen,
    updateFilters
  };
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UrlState {
  view: 'list' | 'map';
  searchTerm: string;
  selectedArea: string;
  selectedAmenities: string[];
  minRating: number;
  openingFilter: string;
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
    console.error('Failed to parse filters param', error);
    return null;
  }
};

/** Dedupe by trimmed lowercase (keep first occurrence) so "Beer Garden" and "beer garden" don't show twice. */
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

const normalizeState = (state: UrlState): UrlState => ({
  view: state.view,
  searchTerm: state.searchTerm || '',
  selectedArea: state.selectedArea || DEFAULT_AREA,
  selectedAmenities: normalizeAmenities(state.selectedAmenities),
  minRating: state.minRating || 0,
  openingFilter: state.openingFilter || DEFAULT_OPENING,
});

const buildStateFromSearchParams = (
  searchParams: ReturnType<typeof useSearchParams>
): UrlState => {
  const amenitiesFromUrl = normalizeAmenities(
    searchParams.get('amenities')?.split(',')
  );
  const baseState: UrlState = {
    view: (searchParams.get('view') as 'list' | 'map') || 'list',
    searchTerm: searchParams.get('search') || '',
    selectedArea: searchParams.get('area') || DEFAULT_AREA,
    selectedAmenities: amenitiesFromUrl,
    minRating: Number(searchParams.get('rating')) || 0,
    openingFilter: searchParams.get('opening') || DEFAULT_OPENING,
  };

  const filtersParam = decodeFiltersParam(searchParams.get('filters'));
  if (filtersParam) {
    const mergedAmenities = normalizeAmenities(
      filtersParam.selectedAmenities ?? baseState.selectedAmenities
    );
    return normalizeState({
      ...baseState,
      searchTerm: filtersParam.searchTerm ?? baseState.searchTerm,
      selectedArea: filtersParam.selectedArea ?? baseState.selectedArea,
      selectedAmenities: mergedAmenities,
      minRating: filtersParam.minRating ?? baseState.minRating,
      openingFilter: filtersParam.openingFilter ?? baseState.openingFilter,
    });
  }

  return normalizeState(baseState);
};

const buildFiltersPayload = (state: UrlState) => ({
  searchTerm: state.searchTerm || '',
  selectedArea: state.selectedArea || DEFAULT_AREA,
  selectedAmenities: state.selectedAmenities || [],
  minRating: state.minRating || 0,
  openingFilter: state.openingFilter || DEFAULT_OPENING,
});

export function useUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [state, setState] = useState<UrlState>(() =>
    buildStateFromSearchParams(searchParams)
  );

  // Update URL when state changes
  const updateUrl = useCallback((newState: Partial<UrlState>) => {
    const merged = normalizeState({ ...state, ...newState });
    const params = new URLSearchParams();

    if (merged.view !== 'list') params.set('view', merged.view);
    if (merged.searchTerm) params.set('search', merged.searchTerm);
    if (merged.selectedArea && merged.selectedArea !== DEFAULT_AREA) {
      params.set('area', merged.selectedArea);
    }
    if (merged.selectedAmenities.length > 0) {
      params.set('amenities', merged.selectedAmenities.join(','));
    }
    if (merged.minRating > 0) params.set('rating', merged.minRating.toString());
    if (merged.openingFilter && merged.openingFilter !== DEFAULT_OPENING) {
      params.set('opening', merged.openingFilter);
    }

    const filtersPayload = buildFiltersPayload(merged);
    params.set('filters', encodeURIComponent(JSON.stringify(filtersPayload)));

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/pubs';
    
    // Use shallow routing to avoid full page reload
    router.replace(newUrl, { scroll: false });
    
    setState(merged);
  }, [state, router]);

  // Sync with URL on mount and URL changes
  useEffect(() => {
    setState(buildStateFromSearchParams(searchParams));
  }, [searchParams]);

  return {
    state,
    updateUrl,
    setView: (view: 'list' | 'map') => updateUrl({ view }),
    setSearchTerm: (searchTerm: string) => updateUrl({ searchTerm }),
    setSelectedArea: (selectedArea: string) => updateUrl({ selectedArea }),
    setSelectedAmenities: (selectedAmenities: string[]) => updateUrl({ selectedAmenities }),
    setMinRating: (minRating: number) => updateUrl({ minRating }),
    setOpeningFilter: (openingFilter: string) => updateUrl({ openingFilter }),
  };
}


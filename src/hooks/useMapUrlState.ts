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

export function useMapUrlState(): MapUrlState {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current URL state
  const view = (searchParams.get('view') as 'list' | 'map') || 'list';
  const listOpen = searchParams.get('list') === 'open';

  const filters: Filters = useMemo(() => {
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        return JSON.parse(decodeURIComponent(filtersParam));
      } catch (e) {
        console.error('Error parsing filters from URL:', e);
      }
    }
    
    // Default filters
    return {
      searchTerm: '',
      selectedArea: 'All Areas',
      minRating: 0,
      openingFilter: 'Any Time',
      selectedAmenities: []
    };
  }, [searchParams]);

  // Update URL with new state
  const updateUrl = useCallback((updates: Record<string, any>) => {
    const params = new URLSearchParams(searchParams);
    
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
    updateUrl({ filters: newFilters });
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

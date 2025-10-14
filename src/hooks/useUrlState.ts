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

export function useUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [state, setState] = useState<UrlState>({
    view: (searchParams.get('view') as 'list' | 'map') || 'list',
    searchTerm: searchParams.get('search') || '',
    selectedArea: searchParams.get('area') || '',
    selectedAmenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
    minRating: Number(searchParams.get('rating')) || 0,
    openingFilter: searchParams.get('opening') || '',
  });

  // Update URL when state changes
  const updateUrl = useCallback((newState: Partial<UrlState>) => {
    const params = new URLSearchParams();
    
    const merged = { ...state, ...newState };
    
    if (merged.view !== 'list') params.set('view', merged.view);
    if (merged.searchTerm) params.set('search', merged.searchTerm);
    if (merged.selectedArea && merged.selectedArea !== 'All Areas') params.set('area', merged.selectedArea);
    if (merged.selectedAmenities.length > 0) params.set('amenities', merged.selectedAmenities.join(','));
    if (merged.minRating > 0) params.set('rating', merged.minRating.toString());
    if (merged.openingFilter && merged.openingFilter !== 'Any Time') params.set('opening', merged.openingFilter);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/pubs';
    
    // Use shallow routing to avoid full page reload
    router.replace(newUrl, { scroll: false });
    
    setState(merged);
  }, [state, router]);

  // Sync with URL on mount and URL changes
  useEffect(() => {
    const urlState: UrlState = {
      view: (searchParams.get('view') as 'list' | 'map') || 'list',
      searchTerm: searchParams.get('search') || '',
      selectedArea: searchParams.get('area') || '',
      selectedAmenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
      minRating: Number(searchParams.get('rating')) || 0,
      openingFilter: searchParams.get('opening') || '',
    };
    setState(urlState);
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


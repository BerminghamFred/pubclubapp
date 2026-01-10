/**
 * React hook for fetching pubs from the API
 * 
 * This hook provides a unified interface for components to fetch pub data
 * from the database via the API, replacing direct imports from pubData.ts
 */

import { useState, useEffect } from 'react';
import { Pub } from '@/data/types';

interface UsePubsOptions {
  filters?: {
    area?: string;
    type?: string;
    amenities?: string[];
    searchTerm?: string;
    bbox?: { west: number; south: number; east: number; north: number };
  };
  enabled?: boolean; // Allow disabling the fetch
}

interface UsePubsResult {
  pubs: Pub[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all pubs with optional filters
 */
export function usePubs(options: UsePubsOptions = {}): UsePubsResult {
  const { filters, enabled = true } = options;
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPubs = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters?.searchTerm) {
        params.set('filters', JSON.stringify({
          searchTerm: filters.searchTerm,
          selectedArea: filters.area,
          selectedAmenities: filters.amenities || [],
        }));
      } else if (filters?.area || filters?.amenities?.length) {
        params.set('filters', JSON.stringify({
          selectedArea: filters.area,
          selectedAmenities: filters.amenities || [],
        }));
      }

      if (filters?.bbox) {
        params.set('bbox', `${filters.bbox.west},${filters.bbox.south},${filters.bbox.east},${filters.bbox.north}`);
      }

      // Fetch from API
      const response = await fetch(`/api/pubs/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pubs: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to Pub format
      const transformedPubs: Pub[] = data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        area: item.area || '',
        type: item.type || 'Traditional',
        features: item.features || item.amenities || [],
        rating: item.rating || 0,
        reviewCount: item.reviewCount || 0,
        address: item.address || '',
        phone: item.phone,
        website: item.website,
        openingHours: item.openingHours || '',
        amenities: item.amenities || [],
        _internal: item._internal || {
          place_id: item.placeId,
          lat: item.lat,
          lng: item.lng,
          photo_url: item.photo,
          photo_name: item.photoName,
        }
      }));

      setPubs(transformedPubs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching pubs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPubs();
  }, [filters?.area, filters?.type, filters?.amenities?.join(','), filters?.searchTerm, enabled]);

  return {
    pubs,
    loading,
    error,
    refetch: fetchPubs,
  };
}

/**
 * Hook to fetch a single pub by ID
 */
export function usePub(id: string | null): {
  pub: Pub | null;
  loading: boolean;
  error: Error | null;
} {
  const [pub, setPub] = useState<Pub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchPub = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/pubs/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pub: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.pub) {
          setPub(data.pub);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error fetching pub:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPub();
  }, [id]);

  return { pub, loading, error };
}


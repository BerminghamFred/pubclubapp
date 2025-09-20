import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';

export interface PubSearchParams {
  search?: string;
  borough?: string;
  type?: string;
  features?: string[];
  minRating?: number;
  priceRange?: string;
  openingFilter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface PubSearchResult {
  id: string;
  name: string;
  borough: string;
  lat: number;
  lng: number;
  rating: number;
  type: string;
  features: string[];
  address: string;
  _summary?: {
    hasPhoto: boolean;
    hasWebsite: boolean;
    hasPhone: boolean;
  };
}

export interface PubSearchResponse {
  pubs: PubSearchResult[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search') || '';
    const borough = searchParams.get('borough') || '';
    const type = searchParams.get('type') || '';
    const features = searchParams.get('features')?.split(',').filter(Boolean) || [];
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const priceRange = searchParams.get('priceRange') || '';
    const openingFilter = searchParams.get('openingFilter') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '2000'), 2000); // Max 2000 per page, default 2000
    
    // Parse map bounds if provided
    let bounds: PubSearchParams['bounds'] | undefined;
    const boundsParam = searchParams.get('bounds');
    if (boundsParam) {
      try {
        bounds = JSON.parse(boundsParam);
      } catch (e) {
        // Invalid bounds, ignore
      }
    }

    // Apply filters
    let filteredPubs = pubData.filter(pub => {
      // Search text filter
      if (search && !pub.name.toLowerCase().includes(search.toLowerCase()) && 
          !pub.description.toLowerCase().includes(search.toLowerCase()) &&
          !pub.address.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Borough filter
      if (borough && pub.area !== borough) {
        return false;
      }

      // Type filter
      if (type && pub.type !== type) {
        return false;
      }

      // Features filter
      if (features.length > 0 && !features.every(feature => pub.features.includes(feature))) {
        return false;
      }

      // Rating filter
      if (pub.rating < minRating) {
        return false;
      }

      // Price range filter (simplified logic)
      if (priceRange && priceRange !== 'Any Price') {
        const rating = pub.rating;
        if (priceRange === 'Budget (£)' && rating >= 4) return false;
        if (priceRange === 'Mid-Range (££)' && (rating < 4 || rating >= 4.5)) return false;
        if (priceRange === 'Premium (£££)' && (rating < 4.5 || rating >= 4.8)) return false;
        if (priceRange === 'Luxury (££££)' && rating < 4.8) return false;
      }

      // Opening hours filter (simplified)
      if (openingFilter && openingFilter !== 'Any Time') {
        // Basic check - in production you'd want more sophisticated logic
        if (openingFilter === 'Late Night (After 11pm)' && 
            !pub.openingHours.includes('11:00 PM') && !pub.openingHours.includes('12:00 AM')) {
          return false;
        }
      }

      // Map bounds filter
      if (bounds && pub._internal?.lat && pub._internal?.lng) {
        const lat = pub._internal.lat;
        const lng = pub._internal.lng;
        if (lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    filteredPubs.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];
      
      if (sortBy === 'rating') {
        aValue = a.rating;
        bValue = b.rating;
      } else if (sortBy === 'reviewCount') {
        aValue = a.reviewCount;
        bValue = b.reviewCount;
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = filteredPubs.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPubs = filteredPubs.slice(startIndex, endIndex);

    // Transform to lightweight response
    const pubs: PubSearchResult[] = paginatedPubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      borough: pub.area,
      lat: pub._internal?.lat || 0,
      lng: pub._internal?.lng || 0,
      rating: pub.rating,
      type: pub.type,
      features: pub.features,
      address: pub.address,
      _summary: {
        hasPhoto: !!pub._internal?.photo_url,
        hasWebsite: !!pub.website,
        hasPhone: !!pub.phone
      }
    }));

    const response: PubSearchResponse = {
      pubs,
      total,
      page,
      totalPages,
      hasMore: page < totalPages
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Pub search error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to search pubs' 
    }, { status: 500 });
  }
} 
/**
 * Centralized service for all pub database operations
 * 
 * This service provides a unified interface for:
 * - Reading pubs from the database
 * - Transforming database models to the Pub interface format
 * - Searching and filtering pubs
 * - CRUD operations
 */

import { prisma } from '@/lib/prisma';
import { Pub } from '@/data/types';

/**
 * Convert amenity name (e.g., "Food Served") to key (e.g., "food-served")
 */
function amenityNameToKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Transform a database Pub model to the Pub interface format
 */
export function transformDbPubToPubFormat(dbPub: any): Pub {
  // Get amenities from PubAmenity relations
  // Use label (full name) for filtering compatibility, fallback to key if label not available
  const amenities = dbPub.amenities?.map((pa: any) => pa.amenity?.label || pa.amenity?.key) || [];
  
  // Combine features array and amenities
  const allFeatures = [
    ...(dbPub.features || []),
    ...amenities
  ];
  
  return {
    id: dbPub.placeId || dbPub.id, // Use placeId as primary identifier, fallback to DB ID
    name: dbPub.name,
    description: dbPub.description || '',
    area: dbPub.borough?.name || dbPub.city?.name || '',
    type: dbPub.type || 'Traditional',
    features: allFeatures,
    rating: dbPub.rating || 0,
    reviewCount: dbPub.reviewCount || 0,
    address: dbPub.address || '',
    phone: dbPub.phone || undefined,
    website: dbPub.website || undefined,
    openingHours: dbPub.openingHours || '',
    amenities: amenities,
    manager_email: dbPub.managerEmail || undefined,
    manager_password: dbPub.managerPassword || undefined,
    last_updated: dbPub.lastUpdated?.toISOString() || undefined,
    updated_by: dbPub.updatedBy || undefined,
    _internal: {
      place_id: dbPub.placeId || undefined,
      lat: dbPub.lat || undefined,
      lng: dbPub.lng || undefined,
      photo_url: dbPub.photoUrl || undefined,
      photo_name: dbPub.photoName || undefined,
    }
  };
}

/**
 * Get all pubs with optional filters
 */
export async function getAllPubs(filters?: {
  area?: string;
  type?: string;
  amenities?: string[];
  searchTerm?: string;
  bbox?: { west: number; south: number; east: number; north: number };
}) {
  const where: any = {};
  
  // Area filter (borough or city)
  if (filters?.area && filters.area !== 'All Areas') {
    where.OR = [
      { borough: { name: filters.area } },
      { city: { name: filters.area } }
    ];
  }
  
  // Type filter
  if (filters?.type) {
    where.type = filters.type;
  }
  
  // Search term
  if (filters?.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    where.OR = [
      ...(where.OR || []),
      { name: { contains: searchLower, mode: 'insensitive' } },
      { description: { contains: searchLower, mode: 'insensitive' } },
      { address: { contains: searchLower, mode: 'insensitive' } },
    ];
  }
  
  // Amenities filter
  // Convert amenity names to keys for database query (database stores keys, UI uses names)
  if (filters?.amenities && filters.amenities.length > 0) {
    const amenityKeys = filters.amenities.map(amenityNameToKey);
    where.amenities = {
      some: {
        amenity: {
          OR: [
            { key: { in: amenityKeys } },
            { label: { in: filters.amenities } } // Also check by label in case it's already a key
          ]
        }
      }
    };
  }
  
  // Bounding box filter
  if (filters?.bbox) {
    where.lat = {
      gte: filters.bbox.south,
      lte: filters.bbox.north
    };
    where.lng = {
      gte: filters.bbox.west,
      lte: filters.bbox.east
    };
  }
  
  const pubs = await prisma.pub.findMany({
    where,
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  return pubs.map(transformDbPubToPubFormat);
}

/**
 * Get pub by database ID or Place ID
 */
export async function getPubById(id: string): Promise<Pub | null> {
  // Try to find by Place ID first
  let dbPub = await prisma.pub.findUnique({
    where: { placeId: id },
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  // If not found, try by database ID
  if (!dbPub) {
    dbPub = await prisma.pub.findUnique({
      where: { id },
      include: {
        city: true,
        borough: true,
        amenities: {
          include: {
            amenity: true
          }
        }
      }
    });
  }
  
  if (!dbPub) {
    return null;
  }
  
  return transformDbPubToPubFormat(dbPub);
}

/**
 * Get pub by Google Place ID
 */
export async function getPubByPlaceId(placeId: string): Promise<Pub | null> {
  const dbPub = await prisma.pub.findUnique({
    where: { placeId },
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  if (!dbPub) {
    return null;
  }
  
  return transformDbPubToPubFormat(dbPub);
}

/**
 * Get pub by slug
 */
export async function getPubBySlug(slug: string): Promise<Pub | null> {
  const dbPub = await prisma.pub.findUnique({
    where: { slug },
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  if (!dbPub) {
    return null;
  }
  
  return transformDbPubToPubFormat(dbPub);
}

/**
 * Search pubs with query and filters
 */
export async function searchPubs(
  query?: string,
  filters?: {
    area?: string;
    type?: string;
    amenities?: string[];
    bbox?: { west: number; south: number; east: number; north: number };
  }
) {
  const searchFilters: any = {};
  
  // Search query
  if (query) {
    const searchLower = query.toLowerCase();
    searchFilters.OR = [
      { name: { contains: searchLower, mode: 'insensitive' } },
      { description: { contains: searchLower, mode: 'insensitive' } },
      { address: { contains: searchLower, mode: 'insensitive' } },
    ];
  }
  
  // Area filter
  if (filters?.area && filters.area !== 'All Areas') {
    searchFilters.OR = [
      ...(searchFilters.OR || []),
      { borough: { name: filters.area } },
      { city: { name: filters.area } }
    ];
  }
  
  // Type filter
  if (filters?.type) {
    searchFilters.type = filters.type;
  }
  
  // Amenities filter
  // Convert amenity names to keys for database query (database stores keys, UI uses names)
  if (filters?.amenities && filters.amenities.length > 0) {
    const amenityKeys = filters.amenities.map(amenityNameToKey);
    searchFilters.amenities = {
      some: {
        amenity: {
          OR: [
            { key: { in: amenityKeys } },
            { label: { in: filters.amenities } } // Also check by label in case it's already a key
          ]
        }
      }
    };
  }
  
  // Bounding box filter
  if (filters?.bbox) {
    searchFilters.lat = {
      gte: filters.bbox.south,
      lte: filters.bbox.north
    };
    searchFilters.lng = {
      gte: filters.bbox.west,
      lte: filters.bbox.east
    };
  }
  
  const pubs = await prisma.pub.findMany({
    where: searchFilters,
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  return pubs.map(transformDbPubToPubFormat);
}

/**
 * Get pubs by area slug
 */
export async function getPubsByArea(areaSlug: string) {
  const pubs = await prisma.pub.findMany({
    where: {
      OR: [
        { borough: { name: areaSlug } },
        { city: { name: areaSlug } }
      ]
    },
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  return pubs.map(transformDbPubToPubFormat);
}

/**
 * Create a new pub
 */
export async function createPub(data: {
  name: string;
  address?: string;
  description?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  type?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  photoName?: string;
  cityId?: number;
  boroughId?: number;
  features?: string[];
  amenities?: string[];
  managerEmail?: string;
  managerPassword?: string;
}) {
  // Generate slug from name
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Ensure slug is unique
  let uniqueSlug = slug;
  let counter = 1;
  while (await prisma.pub.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  // Generate placeId if not provided
  const placeId = data.placeId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create pub
  const dbPub = await prisma.pub.create({
    data: {
      name: data.name,
      slug: uniqueSlug,
      placeId: placeId,
      address: data.address,
      description: data.description,
      phone: data.phone,
      website: data.website,
      openingHours: data.openingHours,
      type: data.type,
      lat: data.lat,
      lng: data.lng,
      photoUrl: data.photoUrl,
      photoName: data.photoName,
      cityId: data.cityId,
      boroughId: data.boroughId,
      features: data.features || [],
      managerEmail: data.managerEmail,
      managerPassword: data.managerPassword,
    },
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  // Create amenity associations
  if (data.amenities && data.amenities.length > 0) {
    for (const amenityKey of data.amenities) {
      // Find or create amenity
      let amenity = await prisma.amenity.findUnique({
        where: { key: amenityKey }
      });
      
      if (!amenity) {
        amenity = await prisma.amenity.create({
          data: {
            key: amenityKey,
            label: amenityKey
          }
        });
      }
      
      // Link to pub
      await prisma.pubAmenity.create({
        data: {
          pubId: dbPub.id,
          amenityId: amenity.id,
          value: true
        }
      });
    }
  }
  
  return transformDbPubToPubFormat(dbPub);
}

/**
 * Update a pub
 */
export async function updatePub(
  id: string,
  data: Partial<{
    name: string;
    address: string;
    description: string;
    phone: string;
    website: string;
    openingHours: string;
    type: string;
    placeId: string;
    lat: number;
    lng: number;
    photoUrl: string;
    photoName: string;
    cityId: number;
    boroughId: number;
    features: string[];
    amenities: string[];
    managerEmail: string;
    managerPassword: string;
  }>
) {
  // Find pub by ID or Place ID
  let dbPub = await prisma.pub.findUnique({
    where: { placeId: id }
  });
  
  if (!dbPub) {
    dbPub = await prisma.pub.findUnique({
      where: { id }
    });
  }
  
  if (!dbPub) {
    throw new Error('Pub not found');
  }
  
  // Update slug if name changed
  let slug = dbPub.slug;
  if (data.name && data.name !== dbPub.name) {
    slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure unique
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.pub.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
    slug = uniqueSlug;
  }
  
  // Prepare update data - filter out undefined values
  const updateData: any = {
    slug,
  };
  
  // Only include fields that are actually provided
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.openingHours !== undefined) updateData.openingHours = data.openingHours;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.placeId !== undefined) updateData.placeId = data.placeId;
  if (data.lat !== undefined) updateData.lat = data.lat;
  if (data.lng !== undefined) updateData.lng = data.lng;
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
  if (data.photoName !== undefined) updateData.photoName = data.photoName;
  if (data.cityId !== undefined) updateData.cityId = data.cityId;
  if (data.boroughId !== undefined) updateData.boroughId = data.boroughId;
  if (data.features !== undefined) updateData.features = data.features;
  if (data.managerEmail !== undefined) updateData.managerEmail = data.managerEmail;
  if (data.managerPassword !== undefined) updateData.managerPassword = data.managerPassword;
  
  // Update pub
  await prisma.pub.update({
    where: { id: dbPub.id },
    data: updateData,
  });
  
  // Update amenities if provided
  if (data.amenities !== undefined) {
    // Delete existing amenities
    await prisma.pubAmenity.deleteMany({
      where: { pubId: dbPub.id }
    });
    
    // Create new amenities
    for (const amenityKey of data.amenities) {
      let amenity = await prisma.amenity.findUnique({
        where: { key: amenityKey }
      });
      
      if (!amenity) {
        amenity = await prisma.amenity.create({
          data: {
            key: amenityKey,
            label: amenityKey
          }
        });
      }
      
      await prisma.pubAmenity.create({
        data: {
          pubId: dbPub.id,
          amenityId: amenity.id,
          value: true
        }
      });
    }
  }
  
  // Reload with updated amenities
  const finalPub = await prisma.pub.findUnique({
    where: { id: dbPub.id },
    include: {
      city: true,
      borough: true,
      amenities: {
        include: {
          amenity: true
        }
      }
    }
  });
  
  return transformDbPubToPubFormat(finalPub!);
}

/**
 * Delete a pub
 */
export async function deletePub(id: string) {
  // Find pub by ID or Place ID
  let dbPub = await prisma.pub.findUnique({
    where: { placeId: id }
  });
  
  if (!dbPub) {
    dbPub = await prisma.pub.findUnique({
      where: { id }
    });
  }
  
  if (!dbPub) {
    throw new Error('Pub not found');
  }
  
  await prisma.pub.delete({
    where: { id: dbPub.id }
  });
  
  return true;
}



import { prisma } from './prisma'

export interface PageViewEvent {
  userId?: string
  sessionId: string
  pubId?: string
  areaSlug?: string
  ref?: string
  utm?: any
  device?: string
}

export interface SearchEvent {
  userId?: string
  sessionId: string
  query: string
  cityId?: number
  boroughId?: number
  resultsCount?: number
}

export interface FilterUsageEvent {
  sessionId: string
  filterKey: string
  cityId?: number
  boroughId?: number
}

export interface CtaClickEvent {
  sessionId: string
  pubId: string
  type: 'book' | 'call' | 'website' | 'spin' | 'spin_view_pub'
}

export interface HomepageTileEvent {
  sessionId: string
  slotId: string
  type: 'impression' | 'click'
  title?: string
  amenity?: string
  city?: string
  href?: string
}

// Event tracking functions
export async function trackPageView(event: PageViewEvent) {
  try {
    console.log('[Analytics DB] Creating page view event:', event)
    
    // If pubId is provided, try to resolve it to database ID (in case it's a placeId)
    let databasePubId: string | null = null;
    if (event.pubId) {
      // Try to find pub by placeId first
      const pubByPlaceId = await prisma.pub.findUnique({
        where: { placeId: event.pubId },
        select: { id: true }
      });
      
      if (pubByPlaceId) {
        databasePubId = pubByPlaceId.id;
      } else {
        // Try to find by database ID (in case it's already a database ID)
        const pubById = await prisma.pub.findUnique({
          where: { id: event.pubId },
          select: { id: true }
        });
        
        if (pubById) {
          databasePubId = pubById.id;
        }
      }
    }
    
    const result = await prisma.eventPageView.create({
      data: {
        userId: event.userId,
        sessionId: event.sessionId,
        pubId: databasePubId || event.pubId, // Use database ID if found, otherwise use original
        areaSlug: event.areaSlug,
        ref: event.ref,
        utm: event.utm,
        device: event.device,
      }
    })
    console.log('[Analytics DB] Page view created:', result.id, 'with pubId:', databasePubId || event.pubId)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track page view:', error)
    throw error
  }
}

// Batch create page view events with skipDuplicates
export async function trackPageViewBatch(events: PageViewEvent[]) {
  try {
    if (events.length === 0) return []
    
    console.log('[Analytics DB] Creating page view events batch:', events.length)
    
    // Resolve all pubIds to database IDs
    const pubIdMap = new Map<string, string | null>();
    const uniquePubIds = [...new Set(events.map(e => e.pubId).filter(Boolean))];
    
    // Batch lookup all unique pubIds
    for (const pubId of uniquePubIds) {
      if (!pubId) continue;
      
      // Try to find pub by placeId first
      const pubByPlaceId = await prisma.pub.findUnique({
        where: { placeId: pubId },
        select: { id: true }
      });
      
      if (pubByPlaceId) {
        pubIdMap.set(pubId, pubByPlaceId.id);
      } else {
        // Try to find by database ID (in case it's already a database ID)
        const pubById = await prisma.pub.findUnique({
          where: { id: pubId },
          select: { id: true }
        });
        
        if (pubById) {
          pubIdMap.set(pubId, pubById.id);
        } else {
          // Not found in database, use original ID
          pubIdMap.set(pubId, null);
        }
      }
    }
    
    const result = await prisma.eventPageView.createMany({
      data: events.map(event => ({
        userId: event.userId,
        sessionId: event.sessionId,
        pubId: event.pubId ? (pubIdMap.get(event.pubId) || event.pubId) : null,
        areaSlug: event.areaSlug,
        ref: event.ref,
        utm: event.utm,
        device: event.device,
      })),
      skipDuplicates: true,
    })
    console.log('[Analytics DB] Page view events batch created:', result.count)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track page view batch:', error)
    throw error
  }
}

export async function trackSearch(event: SearchEvent) {
  try {
    console.log('[Analytics DB] Creating search event:', event)
    const result = await prisma.eventSearch.create({
      data: {
        userId: event.userId,
        sessionId: event.sessionId,
        query: event.query,
        cityId: event.cityId,
        boroughId: event.boroughId,
        resultsCount: event.resultsCount,
      }
    })
    console.log('[Analytics DB] Search event created:', result.id)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track search:', error)
    throw error
  }
}

export async function trackFilterUsage(event: FilterUsageEvent) {
  try {
    console.log('[Analytics DB] Creating filter usage event:', event)
    const result = await prisma.eventFilterUsage.create({
      data: {
        sessionId: event.sessionId,
        filterKey: event.filterKey,
        cityId: event.cityId,
        boroughId: event.boroughId,
      }
    })
    console.log('[Analytics DB] Filter usage event created:', result.id)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track filter usage:', error)
    throw error
  }
}

// Batch create filter usage events with skipDuplicates
export async function trackFilterUsageBatch(events: FilterUsageEvent[]) {
  try {
    if (events.length === 0) return []
    
    console.log('[Analytics DB] Creating filter usage events batch:', events.length)
    const result = await prisma.eventFilterUsage.createMany({
      data: events.map(event => ({
        sessionId: event.sessionId,
        filterKey: event.filterKey,
        cityId: event.cityId,
        boroughId: event.boroughId,
      })),
      skipDuplicates: true,
    })
    console.log('[Analytics DB] Filter usage events batch created:', result.count)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track filter usage batch:', error)
    throw error
  }
}

export async function trackCtaClick(event: CtaClickEvent) {
  try {
    await prisma.eventCtaClick.create({
      data: {
        sessionId: event.sessionId,
        pubId: event.pubId,
        type: event.type,
      }
    })
  } catch (error) {
    console.error('Failed to track CTA click:', error)
  }
}

export async function trackHomepageTile(event: HomepageTileEvent) {
  try {
    console.log('[Analytics DB] Creating homepage tile event:', event)
    const result = await prisma.eventHomepageTile.create({
      data: {
        sessionId: event.sessionId,
        slotId: event.slotId,
        type: event.type,
        title: event.title,
        amenity: event.amenity,
        city: event.city,
        href: event.href,
      }
    })
    console.log('[Analytics DB] Homepage tile event created:', result.id)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track homepage tile:', error)
    throw error
  }
}

// Batch create homepage tile events with skipDuplicates for impressions
export async function trackHomepageTileBatch(events: HomepageTileEvent[]) {
  try {
    if (events.length === 0) return []
    
    console.log('[Analytics DB] Creating homepage tile events batch:', events.length)
    const result = await prisma.eventHomepageTile.createMany({
      data: events.map(event => ({
        sessionId: event.sessionId,
        slotId: event.slotId,
        type: event.type,
        title: event.title,
        amenity: event.amenity,
        city: event.city,
        href: event.href,
      })),
      skipDuplicates: true,
    })
    console.log('[Analytics DB] Homepage tile events batch created:', result.count)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track homepage tile batch:', error)
    throw error
  }
}

// Analytics query functions
export async function getPubViews(from: Date, to: Date, pubId?: string) {
  const where: any = {
    ts: {
      gte: from,
      lte: to,
    }
  }
  
  if (pubId) {
    where.pubId = pubId
  }

  return await prisma.eventPageView.groupBy({
    by: ['pubId'],
    where,
    _count: {
      pubId: true,
    },
    orderBy: {
      _count: {
        pubId: 'desc',
      }
    },
    take: 100,
  })
}

export async function getSearchCounts(from: Date, to: Date, cityId?: number, boroughId?: number) {
  const where: any = {
    ts: {
      gte: from,
      lte: to,
    }
  }

  if (cityId) where.cityId = cityId
  if (boroughId) where.boroughId = boroughId

  return await prisma.eventSearch.groupBy({
    by: ['ts'],
    where,
    _count: {
      id: true,
    },
    orderBy: {
      ts: 'asc',
    }
  })
}

export async function getFilterUsage(from: Date, to: Date, cityId?: number, boroughId?: number) {
  const where: any = {
    ts: {
      gte: from,
      lte: to,
    }
  }

  if (cityId) where.cityId = cityId
  if (boroughId) where.boroughId = boroughId

  return await prisma.eventFilterUsage.groupBy({
    by: ['filterKey'],
    where,
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      }
    }
  })
}

export async function getManagerStatus() {
  return await prisma.pub.findMany({
    select: {
      id: true,
      name: true,
      logins: {
        select: {
          loggedInAt: true,
        },
        orderBy: {
          loggedInAt: 'desc',
        },
        take: 1,
      },
    }
  })
}

export async function getHighPotentialPubs(threshold: number = 500, from?: Date, to?: Date) {
  const startDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const endDate = to || new Date()

  const pubViews = await getPubViews(startDate, endDate)
  
  const highPotentialPubs = await prisma.pub.findMany({
    where: {
      id: {
        in: pubViews
          .filter(pv => pv._count.pubId >= threshold)
          .map(pv => pv.pubId!)
      }
    },
    include: {
      city: true,
      borough: true,
    },
    orderBy: {
      name: 'asc',
    }
  })

  return highPotentialPubs.map(pub => {
    const views = pubViews.find(pv => pv.pubId === pub.id)?._count.pubId || 0
    return {
      ...pub,
      monthlyViews: views,
    }
  })
}

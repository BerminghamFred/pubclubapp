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
  type: 'book' | 'call' | 'website'
}

// Event tracking functions
export async function trackPageView(event: PageViewEvent) {
  try {
    console.log('[Analytics DB] Creating page view event:', event)
    const result = await prisma.eventPageView.create({
      data: {
        userId: event.userId,
        sessionId: event.sessionId,
        pubId: event.pubId,
        areaSlug: event.areaSlug,
        ref: event.ref,
        utm: event.utm,
        device: event.device,
      }
    })
    console.log('[Analytics DB] Page view created:', result.id)
    return result
  } catch (error) {
    console.error('[Analytics DB] Failed to track page view:', error)
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

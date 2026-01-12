export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPubViews, getSearchCounts, getFilterUsage, getHighPotentialPubs } from '@/lib/analytics'
import { pubData } from '@/data/pubData'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const cityId = searchParams.get('cityId')
    const boroughId = searchParams.get('boroughId')

    // Default to last 30 days if no date range provided
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to) : new Date()

    // Build where clause for city/borough filtering
    const pageViewWhere: any = {
      ts: { gte: fromDate, lte: toDate }
    }
    const searchWhere: any = {
      ts: { gte: fromDate, lte: toDate }
    }
    const filterWhere: any = {
      ts: { gte: fromDate, lte: toDate }
    }

    // Apply city/borough filters if provided
    const cityIdFilter = cityId ? parseInt(cityId) : null
    const boroughIdFilter = boroughId ? parseInt(boroughId) : null

    // Query real analytics data
    const totalViews = await prisma.eventPageView.count({
      where: pageViewWhere
    })

    const totalSearches = await prisma.eventSearch.count({
      where: searchWhere
    })

    // Get unique pubs viewed
    const uniquePubsViewedResult = await prisma.eventPageView.findMany({
      where: {
        ...pageViewWhere,
        pubId: { not: null }
      },
      select: { pubId: true },
      distinct: ['pubId']
    })
    const uniquePubsViewed = uniquePubsViewedResult.length

    // Get active managers (managers who logged in within last 90 days)
    const managerLoginCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const activeManagersLogins = await prisma.managerLogin.findMany({
      where: {
        loggedInAt: { gte: managerLoginCutoff },
        managerId: { not: null }
      },
      select: { managerId: true },
      distinct: ['managerId']
    })
    const activeManagers = activeManagersLogins.length

    // Get views by day - fetch all and group by date
    const allViews = await prisma.eventPageView.findMany({
      where: pageViewWhere,
      select: { ts: true }
    })

    // Get searches by day - fetch all and group by date
    const allSearches = await prisma.eventSearch.findMany({
      where: searchWhere,
      select: { ts: true }
    })

    // Get filter usage
    const filterUsageRaw = await getFilterUsage(fromDate, toDate, cityIdFilter || undefined, boroughIdFilter || undefined)
    
    // Format filter usage for display
    const filtersTop = filterUsageRaw.map(item => ({
      key: item.filterKey,
      uses: item._count.id
    }))

    // Get high potential pubs
    const highPotentialPubs = await getHighPotentialPubs(500, fromDate, toDate)

    // Get spin the wheel metrics
    const spinEvents = await prisma.eventCtaClick.findMany({
      where: {
        type: 'spin',
        ts: { gte: fromDate, lte: toDate }
      },
      select: { ts: true, type: true }
    })
    const totalSpins = spinEvents.length

    const spinViewPubEvents = await prisma.eventCtaClick.findMany({
      where: {
        type: 'spin_view_pub',
        ts: { gte: fromDate, lte: toDate }
      },
      select: { ts: true, type: true }
    })
    const totalSpinViewPubClicks = spinViewPubEvents.length

    // Debug logging
    console.log('[Analytics API] Spin the Wheel Metrics:', {
      totalSpins,
      totalSpinViewPubClicks,
      dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      sampleSpinEvents: spinEvents.slice(0, 3),
      sampleViewPubEvents: spinViewPubEvents.slice(0, 3)
    })

    // Calculate conversion rate (view pub clicks / spins * 100)
    const spinConversionRate = totalSpins > 0 
      ? ((totalSpinViewPubClicks / totalSpins) * 100).toFixed(1)
      : '0.0'

    // Get homepage tile metrics (with error handling for before Prisma generate)
    let homepageTileImpressions = 0;
    let homepageTileClicks = 0;
    let topTilesByClicks: any[] = [];
    
    try {
      homepageTileImpressions = await prisma.eventHomepageTile.count({
        where: {
          type: 'impression',
          ts: { gte: fromDate, lte: toDate }
        }
      });

      homepageTileClicks = await prisma.eventHomepageTile.count({
        where: {
          type: 'click',
          ts: { gte: fromDate, lte: toDate }
        }
      });

      topTilesByClicks = await prisma.eventHomepageTile.groupBy({
        by: ['slotId', 'title'],
        where: {
          type: 'click',
          ts: { gte: fromDate, lte: toDate }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });
    } catch (error) {
      // Model doesn't exist yet - will work after Prisma generate
      console.warn('[Analytics API] Homepage tile events not available yet:', error);
    }

    // Calculate homepage tile click-through rate
    const homepageTileCTR = homepageTileImpressions > 0
      ? ((homepageTileClicks / homepageTileImpressions) * 100).toFixed(2)
      : '0.00'

    // Format views by day - aggregate by date (not timestamp)
    const viewsByDayMap = new Map<string, number>()
    allViews.forEach(item => {
      const dateStr = item.ts.toISOString().split('T')[0]
      viewsByDayMap.set(dateStr, (viewsByDayMap.get(dateStr) || 0) + 1)
    })

    // Format searches by day
    const searchesByDayMap = new Map<string, number>()
    allSearches.forEach(item => {
      const dateStr = item.ts.toISOString().split('T')[0]
      searchesByDayMap.set(dateStr, (searchesByDayMap.get(dateStr) || 0) + 1)
    })

    // Generate chart data for the date range
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))
    const viewsByDayFormatted: Array<{ date: string; views: number }> = []
    const searchesByDayFormatted: Array<{ date: string; searches: number }> = []

    for (let i = 0; i <= days; i++) {
      const date = new Date(fromDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      viewsByDayFormatted.push({
        date: dateStr,
        views: viewsByDayMap.get(dateStr) || 0,
      })
      
      searchesByDayFormatted.push({
        date: dateStr,
        searches: searchesByDayMap.get(dateStr) || 0,
      })
    }

    return NextResponse.json({
      totalViews,
      totalSearches,
      uniquePubsViewed,
      activeManagers,
      filtersTop,
      viewsByDay: viewsByDayFormatted,
      searchesByDay: searchesByDayFormatted,
      highPotentialPubs: highPotentialPubs.slice(0, 10), // Top 10
      spinTheWheel: {
        totalSpins,
        totalViewPubClicks: totalSpinViewPubClicks,
        conversionRate: parseFloat(spinConversionRate),
      },
      homepageTiles: {
        impressions: homepageTileImpressions,
        clicks: homepageTileClicks,
        clickThroughRate: parseFloat(homepageTileCTR),
        topTiles: topTilesByClicks.map((tile: any) => ({
          slotId: tile.slotId,
          title: tile.title || 'Unknown',
          clicks: tile._count.id,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching analytics overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    )
  }
}

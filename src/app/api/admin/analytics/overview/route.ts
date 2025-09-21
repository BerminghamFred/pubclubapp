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

    // Since we don't have real analytics data yet, show realistic starting values
    // TODO: Replace with real analytics once event tracking is implemented
    
    const totalViews = 0; // Will track real page views
    const totalSearches = 0; // Will track real searches
    const uniquePubsViewed = 0; // Will track unique pubs viewed
    const activeManagers = pubData.filter(pub => pub.manager_email).length; // Pubs with manager emails

    // Empty arrays for charts - will populate with real data
    const viewsByDayFormatted: Array<{ date: string; views: number }> = [];
    const searchesByDayFormatted: Array<{ date: string; searches: number }> = [];
    const filtersTop: Array<{ key: string; uses: number }> = [];
    const highPotentialPubs: Array<any> = [];

    // Generate empty chart data for the last 30 days
    const days = 30;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      viewsByDayFormatted.push({
        date: dateStr,
        views: 0,
      });
      
      searchesByDayFormatted.push({
        date: dateStr,
        searches: 0,
      });
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
    })
  } catch (error) {
    console.error('Error fetching analytics overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    )
  }
}

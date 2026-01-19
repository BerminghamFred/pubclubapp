export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pubId = searchParams.get('pubId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || '30'; // days

    // Determine which pubs to analyze
    let pubIds: string[] = [];
    if (pubId && pubId !== 'all') {
      // Verify access
      const hasAccess = authData.pubs.some(p => p.id === pubId);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        );
      }
      pubIds = [pubId];
    } else {
      // All pubs this manager has access to
      pubIds = authData.pubs.map(p => p.id);
    }

    // Calculate date range
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Get page views
    const pageViews = await prisma.eventPageView.findMany({
      where: {
        pubId: { in: pubIds },
        ts: { gte: fromDate, lte: toDate }
      },
      select: {
        ts: true,
        device: true,
        ref: true,
        sessionId: true,
        userId: true
      }
    });

    // Get CTA clicks
    const ctaClicks = await prisma.eventCtaClick.findMany({
      where: {
        pubId: { in: pubIds },
        ts: { gte: fromDate, lte: toDate }
      },
      select: {
        ts: true,
        type: true
      }
    });

    // Get searches that might have returned this pub
    // Note: This is approximate since we don't track which pubs were in search results
    const searches = await prisma.eventSearch.findMany({
      where: {
        ts: { gte: fromDate, lte: toDate }
      },
      select: {
        ts: true,
        query: true,
        resultsCount: true
      }
    });

    // Calculate metrics
    const totalViews = pageViews.length;
    const uniqueVisitors = new Set(pageViews.map(v => v.sessionId)).size;
    const uniqueUsers = new Set(pageViews.filter(v => v.userId).map(v => v.userId)).size;
    const avgViewsPerDay = totalViews / Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)));

    // Views over time (group by day)
    const viewsByDay: Record<string, number> = {};
    pageViews.forEach(view => {
      const date = new Date(view.ts).toISOString().split('T')[0];
      viewsByDay[date] = (viewsByDay[date] || 0) + 1;
    });
    const viewsOverTime = Object.entries(viewsByDay)
      .map(([date, count]) => ({ date, views: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Popular times (by hour)
    const viewsByHour: Record<number, number> = {};
    pageViews.forEach(view => {
      const hour = new Date(view.ts).getHours();
      viewsByHour[hour] = (viewsByHour[hour] || 0) + 1;
    });
    const popularTimes = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      views: viewsByHour[i] || 0
    }));

    // Device breakdown
    const deviceBreakdown: Record<string, number> = {};
    pageViews.forEach(view => {
      const device = view.device || 'unknown';
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
    });

    // Referral sources
    const referralSources: Record<string, number> = {};
    pageViews.forEach(view => {
      const ref = view.ref || 'direct';
      referralSources[ref] = (referralSources[ref] || 0) + 1;
    });

    // CTA clicks breakdown
    const ctaBreakdown: Record<string, number> = {};
    ctaClicks.forEach(click => {
      ctaBreakdown[click.type] = (ctaBreakdown[click.type] || 0) + 1;
    });

    const totalCtaClicks = ctaClicks.length;
    const ctaClickRate = totalViews > 0 ? (totalCtaClicks / totalViews) * 100 : 0;

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalViews,
          uniqueVisitors,
          uniqueUsers,
          avgViewsPerDay: Math.round(avgViewsPerDay * 100) / 100,
          totalCtaClicks,
          ctaClickRate: Math.round(ctaClickRate * 100) / 100
        },
        viewsOverTime,
        popularTimes,
        deviceBreakdown: Object.entries(deviceBreakdown).map(([device, count]) => ({
          device,
          count
        })),
        referralSources: Object.entries(referralSources).map(([source, count]) => ({
          source,
          count
        })),
        ctaBreakdown: Object.entries(ctaBreakdown).map(([type, count]) => ({
          type,
          count
        })),
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


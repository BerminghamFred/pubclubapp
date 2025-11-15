export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all spin events
    const spinEvents = await prisma.eventCtaClick.findMany({
      where: {
        type: 'spin',
        ts: { gte: startDate, lte: endDate }
      },
      select: {
        id: true,
        ts: true,
        pubId: true,
      }
    });

    // Get all spin_view_pub events (clicks to view pub after spinning)
    const viewPubEvents = await prisma.eventCtaClick.findMany({
      where: {
        type: 'spin_view_pub',
        ts: { gte: startDate, lte: endDate }
      },
      select: {
        id: true,
        ts: true,
        pubId: true,
      }
    });

    // Get all other CTA clicks that might be related (directions, etc.)
    // Note: We're tracking 'spin_view_pub' but not separate directions clicks from spin
    // For now, we'll just count view pub clicks
    const totalSpins = spinEvents.length;
    const totalViewPubClicks = viewPubEvents.length;

    // Calculate conversion rate
    const spinToViewPubRate = totalSpins > 0 
      ? parseFloat(((totalViewPubClicks / totalSpins) * 100).toFixed(1))
      : 0;

    // Group spins by day
    const spinsByDayMap = new Map<string, number>();
    spinEvents.forEach(event => {
      const dateStr = event.ts.toISOString().split('T')[0];
      spinsByDayMap.set(dateStr, (spinsByDayMap.get(dateStr) || 0) + 1);
    });

    // Generate all days in range
    const spinsByDay: Array<{ date: string; count: number }> = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      spinsByDay.push({
        date: dateStr,
        count: spinsByDayMap.get(dateStr) || 0,
      });
    }

    // Count spins per pub
    const pubSpinCounts = new Map<string, number>();
    spinEvents.forEach(event => {
      if (event.pubId) {
        pubSpinCounts.set(event.pubId, (pubSpinCounts.get(event.pubId) || 0) + 1);
      }
    });

    // Get top pubs by spins
    const topPubsBySpins = Array.from(pubSpinCounts.entries())
      .map(([pubId, spinCount]) => {
        const pub = pubData.find(p => p.id === pubId);
        return {
          pubName: pub?.name || 'Unknown Pub',
          pubId,
          pubRating: pub?.rating || 0,
          spinCount,
        };
      })
      .sort((a, b) => b.spinCount - a.spinCount)
      .slice(0, 10); // Top 10

    // Debug logging
    console.log('[Spin Wheel Analytics API]', {
      totalSpins,
      totalViewPubClicks,
      spinToViewPubRate,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      topPubsCount: topPubsBySpins.length
    });

    const response = {
      overview: {
        totalSpins,
        totalSpinOpens: totalSpins, // Same as totalSpins (when wheel is opened/spun)
        totalViewPubClicks,
        totalDirectionsClicks: 0, // Not currently tracked separately
        totalSpinAgains: 0, // Not currently tracked
        spinToViewPubRate,
        spinToDirectionsRate: 0, // Not currently tracked
        spinAgainRate: 0, // Not currently tracked
      },
      spinsByDay,
      topPubsBySpins,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Spin Wheel Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spin wheel analytics', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

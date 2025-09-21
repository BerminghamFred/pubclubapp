import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session?.user?.type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get spin wheel analytics data
    const [
      totalSpins,
      totalSpinOpens,
      totalViewPubClicks,
      totalDirectionsClicks,
      totalSpinAgains,
      spinsByDay,
      topPubsBySpins,
      conversionRates
    ] = await Promise.all([
      // Total spins (results)
      prisma.analyticsEvent.count({
        where: {
          event_name: 'random_spin_result',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Total modal opens
      prisma.analyticsEvent.count({
        where: {
          event_name: 'random_spin_open',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // View pub clicks
      prisma.analyticsEvent.count({
        where: {
          event_name: 'random_view_pub',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Directions clicks
      prisma.analyticsEvent.count({
        where: {
          event_name: 'random_directions_click',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Spin again clicks
      prisma.analyticsEvent.count({
        where: {
          event_name: 'random_spin_again',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Spins by day
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM AnalyticsEvent 
        WHERE event_name = 'random_spin_result' 
        AND created_at >= ${startDate} 
        AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Top pubs by spins
      prisma.$queryRaw`
        SELECT 
          JSON_EXTRACT(event_data, '$.pub_name') as pub_name,
          JSON_EXTRACT(event_data, '$.pub_id') as pub_id,
          JSON_EXTRACT(event_data, '$.pub_rating') as pub_rating,
          COUNT(*) as spin_count
        FROM AnalyticsEvent 
        WHERE event_name = 'random_spin_result' 
        AND created_at >= ${startDate} 
        AND created_at <= ${endDate}
        GROUP BY JSON_EXTRACT(event_data, '$.pub_id')
        ORDER BY spin_count DESC
        LIMIT 10
      `,

      // Conversion rates
      prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN event_name = 'random_spin_result' THEN 1 END) as total_spins,
          COUNT(CASE WHEN event_name = 'random_view_pub' THEN 1 END) as view_pub_clicks,
          COUNT(CASE WHEN event_name = 'random_directions_click' THEN 1 END) as directions_clicks,
          COUNT(CASE WHEN event_name = 'random_spin_again' THEN 1 END) as spin_again_clicks
        FROM AnalyticsEvent 
        WHERE event_name IN ('random_spin_result', 'random_view_pub', 'random_directions_click', 'random_spin_again')
        AND created_at >= ${startDate} 
        AND created_at <= ${endDate}
      `
    ]);

    // Calculate conversion rates
    const conversionData = Array.isArray(conversionRates) && conversionRates.length > 0 ? conversionRates[0] : null;
    const totalSpinsForConversion = conversionData?.total_spins || 0;
    
    const analytics = {
      overview: {
        totalSpins,
        totalSpinOpens,
        totalViewPubClicks,
        totalDirectionsClicks,
        totalSpinAgains,
        spinToViewPubRate: totalSpinsForConversion > 0 ? 
          Math.round((conversionData?.view_pub_clicks || 0) / totalSpinsForConversion * 100) : 0,
        spinToDirectionsRate: totalSpinsForConversion > 0 ? 
          Math.round((conversionData?.directions_clicks || 0) / totalSpinsForConversion * 100) : 0,
        spinAgainRate: totalSpinsForConversion > 0 ? 
          Math.round((conversionData?.spin_again_clicks || 0) / totalSpinsForConversion * 100) : 0,
      },
      spinsByDay: Array.isArray(spinsByDay) ? spinsByDay : [],
      topPubsBySpins: Array.isArray(topPubsBySpins) ? topPubsBySpins.map((pub: any) => ({
        pubName: pub.pub_name?.replace(/"/g, '') || 'Unknown',
        pubId: pub.pub_id?.replace(/"/g, '') || '',
        pubRating: parseFloat(pub.pub_rating) || 0,
        spinCount: Number(pub.spin_count) || 0,
      })) : [],
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching spin wheel analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spin wheel analytics' },
      { status: 500 }
    );
  }
}

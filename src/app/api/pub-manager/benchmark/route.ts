export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

// Calculate distance between two lat/lng points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    const pubId = searchParams.get('pubId') || authData.pub.id;
    const period = searchParams.get('period') || '30'; // days
    const radius = parseFloat(searchParams.get('radius') || '5'); // km

    // Verify access
    const hasAccess = authData.pubs.some(p => p.id === pubId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Get the pub
    const pub = await prisma.pub.findUnique({
      where: { id: pubId },
      include: {
        amenities: true,
        photos: true,
        reviews: true,
        city: true,
        borough: true
      }
    });

    if (!pub) {
      return NextResponse.json(
        { success: false, message: 'Pub not found' },
        { status: 404 }
      );
    }

    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Get this pub's views
    const pubViews = await prisma.eventPageView.count({
      where: {
        pubId: pub.id,
        ts: { gte: fromDate, lte: toDate }
      }
    });

    // Get all pubs' views for comparison
    const allPubs = await prisma.pub.findMany({
      where: {
        lat: { not: null },
        lng: { not: null }
      },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        rating: true,
        reviewCount: true,
        amenities: true,
        photos: true,
        reviews: true
      }
    });

    // Calculate views for all pubs
    const pubViewsMap = new Map<string, number>();
    const allPubIds = allPubs.map(p => p.id);
    
    const allViews = await prisma.eventPageView.groupBy({
      by: ['pubId'],
      where: {
        pubId: { in: allPubIds },
        ts: { gte: fromDate, lte: toDate }
      },
      _count: {
        id: true
      }
    });

    allViews.forEach(view => {
      if (view.pubId) {
        pubViewsMap.set(view.pubId, view._count.id);
      }
    });

    // Calculate metrics for all pubs
    const allPubMetrics = allPubs.map(p => {
      const views = pubViewsMap.get(p.id) || 0;
      const amenityCount = p.amenities?.length || 0;
      const photoCount = p.photos?.length || 0;
      const reviewCount = p.reviewCount || 0;
      const rating = p.rating || 0;

      return {
        id: p.id,
        name: p.name,
        views,
        rating,
        reviewCount,
        amenityCount,
        photoCount,
        lat: p.lat,
        lng: p.lng
      };
    });

    // Calculate averages and percentiles
    const viewsArray = allPubMetrics.map(p => p.views).sort((a, b) => a - b);
    const avgViews = viewsArray.reduce((a, b) => a + b, 0) / viewsArray.length;
    const medianViews = viewsArray[Math.floor(viewsArray.length / 2)];

    // Calculate percentile
    const pubRank = viewsArray.filter(v => v < pubViews).length;
    const percentile = (pubRank / viewsArray.length) * 100;

    // Find nearby pubs
    let nearbyPubs: typeof allPubMetrics = [];
    if (pub.lat && pub.lng) {
      nearbyPubs = allPubMetrics.filter(p => {
        if (!p.lat || !p.lng) return false;
        const distance = calculateDistance(pub.lat!, pub.lng!, p.lat, p.lng);
        return distance <= radius && p.id !== pub.id;
      });
    }

    // Calculate nearby averages
    const nearbyViews = nearbyPubs.map(p => p.views);
    const avgNearbyViews = nearbyViews.length > 0 
      ? nearbyViews.reduce((a, b) => a + b, 0) / nearbyViews.length 
      : 0;
    const nearbyRank = nearbyViews.filter(v => v < pubViews).length;
    const nearbyPercentile = nearbyViews.length > 0 
      ? (nearbyRank / nearbyViews.length) * 100 
      : 50;

    // Calculate other metrics
    const pubAmenityCount = pub.amenities?.length || 0;
    const pubPhotoCount = pub.photos?.length || 0;
    const pubReviewCount = pub.reviewCount || 0;
    const pubRating = pub.rating || 0;

    const avgAmenities = allPubMetrics.reduce((a, b) => a + b.amenityCount, 0) / allPubMetrics.length;
    const avgPhotos = allPubMetrics.reduce((a, b) => a + b.photoCount, 0) / allPubMetrics.length;
    const avgReviews = allPubMetrics.reduce((a, b) => a + b.reviewCount, 0) / allPubMetrics.length;
    const avgRating = allPubMetrics.reduce((a, b) => a + b.rating, 0) / allPubMetrics.length;

    const avgNearbyAmenities = nearbyPubs.length > 0
      ? nearbyPubs.reduce((a, b) => a + b.amenityCount, 0) / nearbyPubs.length
      : avgAmenities;
    const avgNearbyPhotos = nearbyPubs.length > 0
      ? nearbyPubs.reduce((a, b) => a + b.photoCount, 0) / nearbyPubs.length
      : avgPhotos;
    const avgNearbyReviews = nearbyPubs.length > 0
      ? nearbyPubs.reduce((a, b) => a + b.reviewCount, 0) / nearbyPubs.length
      : avgReviews;
    const avgNearbyRating = nearbyPubs.length > 0
      ? nearbyPubs.reduce((a, b) => a + b.rating, 0) / nearbyPubs.length
      : avgRating;

    return NextResponse.json({
      success: true,
      benchmark: {
        pub: {
          views: pubViews,
          rating: pubRating,
          reviewCount: pubReviewCount,
          amenityCount: pubAmenityCount,
          photoCount: pubPhotoCount
        },
        allPubs: {
          total: allPubMetrics.length,
          avgViews: Math.round(avgViews * 100) / 100,
          medianViews,
          rank: pubRank + 1,
          percentile: Math.round(percentile * 100) / 100,
          avgRating: Math.round(avgRating * 100) / 100,
          avgReviews: Math.round(avgReviews * 100) / 100,
          avgAmenities: Math.round(avgAmenities * 100) / 100,
          avgPhotos: Math.round(avgPhotos * 100) / 100
        },
        nearbyPubs: {
          total: nearbyPubs.length,
          radius,
          avgViews: Math.round(avgNearbyViews * 100) / 100,
          rank: nearbyRank + 1,
          percentile: Math.round(nearbyPercentile * 100) / 100,
          avgRating: Math.round(avgNearbyRating * 100) / 100,
          avgReviews: Math.round(avgNearbyReviews * 100) / 100,
          avgAmenities: Math.round(avgNearbyAmenities * 100) / 100,
          avgPhotos: Math.round(avgNearbyPhotos * 100) / 100,
          pubs: nearbyPubs.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            views: p.views,
            rating: p.rating,
            distance: pub.lat && pub.lng && p.lat && p.lng
              ? calculateDistance(pub.lat, pub.lng, p.lat, p.lng)
              : null
          }))
        }
      }
    });

  } catch (error) {
    console.error('Benchmark error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


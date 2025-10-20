import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pubData } from '@/data/pubData';

// GET /api/admin/areas/[areaName]/pubs - Get all pubs in a specific area
export async function GET(
  request: NextRequest,
  { params }: { params: { areaName: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { areaName } = params;
    const decodedAreaName = decodeURIComponent(areaName);

    // Filter pubs by area
    const areaPubs = pubData.filter(pub => pub.area === decodedAreaName);

    // Sort by rating and review count
    const sortedPubs = areaPubs.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    });

    const pubsWithPhotos = sortedPubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      address: pub.address,
      photoUrl: pub._internal?.photo_name 
        ? `/api/photo-by-place?photo_name=${encodeURIComponent(pub._internal.photo_name)}&w=160`
        : pub._internal?.place_id
        ? `/api/photo-by-place?place_id=${encodeURIComponent(pub._internal.place_id)}&w=160`
        : null,
      amenities: pub.amenities?.slice(0, 5) || []
    }));

    // Debug logging
    console.log(`Found ${sortedPubs.length} pubs for area: ${decodedAreaName}`);
    console.log(`Pubs with photos: ${pubsWithPhotos.filter(p => p.photoUrl).length}`);

    return NextResponse.json({ 
      areaName: decodedAreaName,
      pubs: pubsWithPhotos,
      total: sortedPubs.length
    });
  } catch (error) {
    console.error('Error fetching area pubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch area pubs' },
      { status: 500 }
    );
  }
}

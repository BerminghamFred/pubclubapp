import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const pub = pubData.find(p => p.id === resolvedParams.id);
    
    if (!pub) {
      return NextResponse.json({ error: 'Pub not found' }, { status: 404 });
    }

    // Return full pub details
    const pubDetails = {
      id: pub.id,
      name: pub.name,
      description: pub.description,
      area: pub.area,
      type: pub.type,
      features: pub.features,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      address: pub.address,
      phone: pub.phone,
      website: pub.website,
      openingHours: pub.openingHours,
      _internal: pub._internal
    };

    return NextResponse.json(pubDetails);

  } catch (error: any) {
    console.error('Pub details error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch pub details' 
    }, { status: 500 });
  }
} 
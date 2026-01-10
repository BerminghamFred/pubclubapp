export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getPubById } from '@/lib/services/pubService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const pub = await getPubById(resolvedParams.id);
    
    if (!pub) {
      return NextResponse.json({ error: 'Pub not found' }, { status: 404 });
    }

    // Return pub details without user-generated content for fast loading
    const pubDetails = {
      success: true,
      pub: {
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
        amenities: pub.amenities,
        manager_email: pub.manager_email,
        last_updated: pub.last_updated,
        updated_by: pub.updated_by,
        _internal: pub._internal
      }
    };

    return NextResponse.json(pubDetails);

  } catch (error: any) {
    console.error('Pub details error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch pub details' 
    }, { status: 500 });
  }
} 
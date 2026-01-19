export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);

    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { pub, token, pubs } = authData;

    return NextResponse.json({
      success: true,
      pubId: pub.id,
      pubName: pub.name,
      email: token.email,
      pubs: pubs.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug
      })),
      message: 'Token verified successfully'
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

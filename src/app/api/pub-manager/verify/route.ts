import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    const authData = getPubManagerFromRequest(request);

    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { pub, token } = authData;

    return NextResponse.json({
      success: true,
      pubId: pub.id,
      pubName: pub.name,
      email: pub.manager_email,
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

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

// GET - Check if current pub is signed up for monthly insights
export async function GET(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, signedUp: false },
        { status: 401 }
      );
    }

    const pubId = authData.pub.id;
    const record = await prisma.pubManagerNewsletter.findUnique({
      where: { pubId },
    });

    return NextResponse.json({
      success: true,
      signedUp: !!record,
    });
  } catch (error) {
    console.error('Newsletter status error:', error);
    return NextResponse.json(
      { success: false, signedUp: false },
      { status: 500 }
    );
  }
}

// POST - Sign up for monthly insights newsletter
export async function POST(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { pub, token } = authData;
    const pubId = pub.id;
    const pubName = pub.name || token.pubName;
    const email = token.email;

    await prisma.pubManagerNewsletter.upsert({
      where: { pubId },
      create: {
        pubId,
        pubName,
        email,
      },
      update: {
        pubName,
        email,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'You are signed up for monthly insights.',
    });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to sign up.' },
      { status: 500 }
    );
  }
}

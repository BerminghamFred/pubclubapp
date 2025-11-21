export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/pub-requests - Submit a new pub request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pubName, postcode, managerName, contactEmail, contactPhone } = body;

    // Validate required fields
    if (!pubName || !postcode || !managerName || !contactEmail || !contactPhone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Create the pub request
    const pubRequest = await prisma.pubRequest.create({
      data: {
        pubName: pubName.trim(),
        postcode: postcode.trim(),
        managerName: managerName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        contactPhone: contactPhone.trim(),
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Request submitted successfully',
      id: pubRequest.id,
    });
  } catch (error) {
    console.error('Error creating pub request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to submit request',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}


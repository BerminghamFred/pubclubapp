export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

// POST - Submit a request
export async function POST(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, subject, description, pubId } = body;

    if (!type || !subject || !description) {
      return NextResponse.json(
        { success: false, message: 'Type, subject, and description are required' },
        { status: 400 }
      );
    }

    const targetPubId = pubId || authData.pub.id;
    
    // Verify manager has access to this pub
    const hasAccess = authData.pubs.some(p => p.id === targetPubId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Get pub details
    const pub = await prisma.pub.findUnique({
      where: { id: targetPubId },
      select: {
        name: true,
        postcode: true
      }
    });

    if (!pub) {
      return NextResponse.json(
        { success: false, message: 'Pub not found' },
        { status: 404 }
      );
    }

    // Create request
    const pubRequest = await prisma.pubRequest.create({
      data: {
        pubName: pub.name,
        postcode: pub.postcode || '',
        managerName: authData.token.email,
        contactEmail: authData.token.email,
        contactPhone: '',
        status: 'pending',
        notes: JSON.stringify({
          type,
          subject,
          description,
          pubId: targetPubId,
          managerId: authData.token.email
        })
      }
    });

    return NextResponse.json({
      success: true,
      request: {
        id: pubRequest.id,
        type,
        subject,
        status: pubRequest.status,
        createdAt: pubRequest.createdAt
      }
    });

  } catch (error) {
    console.error('Request submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get request history
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
    const pubId = searchParams.get('pubId');

    // Get all pubs this manager has access to
    const accessiblePubIds = authData.pubs.map(p => p.id);
    
    // Get pub names
    const pubs = await prisma.pub.findMany({
      where: { id: { in: accessiblePubIds } },
      select: { id: true, name: true }
    });

    const pubNames = pubs.map(p => p.name);

    // Get requests for these pubs
    const requests = await prisma.pubRequest.findMany({
      where: {
        pubName: { in: pubNames },
        ...(pubId ? {
          notes: {
            contains: pubId
          }
        } : {})
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parse notes to extract type and subject
    const formattedRequests = requests.map(req => {
      let type = 'other';
      let subject = '';
      try {
        const notes = JSON.parse(req.notes || '{}');
        type = notes.type || 'other';
        subject = notes.subject || '';
      } catch (e) {
        // Ignore parse errors
      }
      return {
        id: req.id,
        type,
        subject: subject || req.pubName,
        status: req.status,
        createdAt: req.createdAt,
        pubName: req.pubName
      };
    });

    return NextResponse.json({
      success: true,
      requests: formattedRequests
    });

  } catch (error) {
    console.error('Request fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


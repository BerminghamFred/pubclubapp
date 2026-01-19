export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

// GET - List all photos for a pub
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

    // Verify manager has access to this pub
    const hasAccess = authData.pubs.some(p => p.id === pubId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied to this pub' },
        { status: 403 }
      );
    }

    const photos = await prisma.pubPhoto.findMany({
      where: { pubId },
      orderBy: [
        { isCover: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      photos
    });

  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Upload photo
export async function POST(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const pubId = formData.get('pubId') as string || authData.pub.id;
    const file = formData.get('file') as File;
    const isCover = formData.get('isCover') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Verify manager has access to this pub
    const hasAccess = authData.pubs.some(p => p.id === pubId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied to this pub' },
        { status: 403 }
      );
    }

    // For now, we'll store the file URL directly
    // In production, you'd upload to Supabase Storage or S3
    // This is a placeholder - you'll need to implement actual file upload
    const fileUrl = `/uploads/${pubId}/${Date.now()}-${file.name}`;

    // If setting as cover, unset other cover photos
    if (isCover) {
      await prisma.pubPhoto.updateMany({
        where: { pubId, isCover: true },
        data: { isCover: false }
      });
    }

    const photo = await prisma.pubPhoto.create({
      data: {
        pubId,
        url: fileUrl,
        isCover: isCover || false,
        uploadedBy: authData.token.email,
      }
    });

    return NextResponse.json({
      success: true,
      photo
    });

  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


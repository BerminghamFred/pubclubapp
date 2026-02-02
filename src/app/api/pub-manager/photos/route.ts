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
    const pubIdParam = (searchParams.get('pubId') || authData.pub.id) as string;

    // Verify manager has access and resolve to DB id (client may send placeId)
    const targetPubId = authData.pub.id === pubIdParam || authData.pub.placeId === pubIdParam
      ? authData.pub.id
      : authData.pubs.find((p: { id: string; placeId?: string | null }) => p.id === pubIdParam || p.placeId === pubIdParam)?.id;
    if (!targetPubId) {
      return NextResponse.json(
        { success: false, message: 'Access denied to this pub' },
        { status: 403 }
      );
    }

    const photos = await prisma.pubPhoto.findMany({
      where: { pubId: targetPubId },
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
    const pubIdParam = (formData.get('pubId') as string) || authData.pub.id;
    const file = formData.get('file') as File;
    const isCover = formData.get('isCover') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Verify manager has access to this pub (client may send DB id or placeId)
    const hasAccess = authData.pubs.some(
      (p: { id: string; placeId?: string | null }) => p.id === pubIdParam || (p.placeId != null && p.placeId === pubIdParam)
    );
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied to this pub' },
        { status: 403 }
      );
    }

    // Resolve to DB id for storage path and PubPhoto.pubId (Prisma uses DB id)
    const targetPubId = authData.pub.id === pubIdParam || authData.pub.placeId === pubIdParam
      ? authData.pub.id
      : authData.pubs.find((p: { id: string; placeId?: string | null }) => p.id === pubIdParam || p.placeId === pubIdParam)?.id;
    if (!targetPubId) {
      return NextResponse.json(
        { success: false, message: 'Access denied to this pub' },
        { status: 403 }
      );
    }

    // Save file to public/uploads so it can be served and displayed
    const { writeFile, mkdir } = await import('fs/promises');
    const path = await import('path');
    const sanitizedName = `${Date.now()}-${(file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', targetPubId);
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const filePath = path.join(uploadDir, sanitizedName);
    await writeFile(filePath, Buffer.from(bytes));
    const fileUrl = `/uploads/${targetPubId}/${sanitizedName}`;

    // If setting as cover, unset other cover photos
    if (isCover) {
      await prisma.pubPhoto.updateMany({
        where: { pubId: targetPubId, isCover: true },
        data: { isCover: false }
      });
    }

    const photo = await prisma.pubPhoto.create({
      data: {
        pubId: targetPubId,
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


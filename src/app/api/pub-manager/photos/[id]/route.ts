export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';
import { generatePubSlug } from '@/utils/slugUtils';

// DELETE - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const photo = await prisma.pubPhoto.findUnique({
      where: { id }
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, message: 'Photo not found' },
        { status: 404 }
      );
    }

    // Verify manager has access to this pub
    const hasAccess = authData.pubs.some(p => p.id === photo.pubId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    await prisma.pubPhoto.delete({
      where: { id }
    });

    const pubForSlug = authData.pubs.find((p: { id: string; placeId?: string | null }) => p.id === photo.pubId);
    if (pubForSlug) {
      revalidatePath(`/pubs/${generatePubSlug(pubForSlug.name, pubForSlug.placeId ?? pubForSlug.id)}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update photo (e.g., set as cover)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const photo = await prisma.pubPhoto.findUnique({
      where: { id }
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, message: 'Photo not found' },
        { status: 404 }
      );
    }

    // Verify manager has access to this pub
    const hasAccess = authData.pubs.some(p => p.id === photo.pubId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // If setting as cover, unset other cover photos
    if (body.isCover === true) {
      await prisma.pubPhoto.updateMany({
        where: { 
          pubId: photo.pubId,
          id: { not: id }
        },
        data: { isCover: false }
      });
    }

    const updatedPhoto = await prisma.pubPhoto.update({
      where: { id },
      data: body
    });

    const pubForSlug = authData.pubs.find((p: { id: string; placeId?: string | null }) => p.id === photo.pubId);
    if (pubForSlug) {
      revalidatePath(`/pubs/${generatePubSlug(pubForSlug.name, pubForSlug.placeId ?? pubForSlug.id)}`);
    }

    return NextResponse.json({
      success: true,
      photo: updatedPhoto
    });

  } catch (error) {
    console.error('Error updating photo:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


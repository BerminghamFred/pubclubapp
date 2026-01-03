export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

const AREAS_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'areas');

// Ensure directory exists
async function ensureDirectoryExists() {
  try {
    await fs.access(AREAS_IMAGES_DIR);
  } catch {
    await fs.mkdir(AREAS_IMAGES_DIR, { recursive: true });
  }
}

// POST /api/admin/area-featured-pubs/upload-image - Upload area image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const areaName = formData.get('areaName') as string;

    if (!file || !areaName) {
      return NextResponse.json(
        { error: 'File and area name are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG and PNG images are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Determine file extension
    const extension = file.type === 'image/png' ? '.png' : '.jpg';
    
    // Create safe filename from area name
    const safeAreaName = areaName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    const filename = `${safeAreaName}${extension}`;
    const filepath = path.join(AREAS_IMAGES_DIR, filename);

    // Ensure directory exists
    await ensureDirectoryExists();

    // Convert file to buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filepath, buffer);

    // Return success with image URL
    const imageUrl = `/images/areas/${filename}`;

    return NextResponse.json({ 
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      areaName: areaName
    });

  } catch (error) {
    console.error('Error uploading area image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/area-featured-pubs/upload-image - Delete area image
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const areaName = searchParams.get('areaName');

    if (!areaName) {
      return NextResponse.json(
        { error: 'Area name is required' },
        { status: 400 }
      );
    }

    // Try to delete both .jpg and .png versions
    const safeAreaName = areaName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let deleted = false;
    for (const ext of ['.jpg', '.png']) {
      const filepath = path.join(AREAS_IMAGES_DIR, `${safeAreaName}${ext}`);
      try {
        await fs.unlink(filepath);
        deleted = true;
      } catch {
        // File doesn't exist, continue
      }
    }

    if (!deleted) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting area image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}


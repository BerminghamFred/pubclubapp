import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { pubData } from '@/data/pubData';

export async function PUT(request: NextRequest) {
  try {
    // Verify pub manager authentication
    const authData = getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { pub } = authData;
    const updates = await request.json();

    // Validate updateable fields
    const allowedFields = [
      'name',
      'description', 
      'phone',
      'website',
      'openingHours',
      'amenities'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Find the pub in the data array and update it
    const pubIndex = pubData.findIndex(p => p.id === pub.id);
    if (pubIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Pub not found' },
        { status: 404 }
      );
    }

    // Update the pub data
    const updatedPub = {
      ...pubData[pubIndex],
      ...updateData,
      last_updated: new Date().toISOString(),
      updated_by: 'manager'
    };

    pubData[pubIndex] = updatedPub;

    // Write the updated data back to pubData.ts
    const newFileContent = `import { Pub } from './types';

export const pubData: Pub[] = ${JSON.stringify(pubData, null, 2)};
`;

    const pubDataPath = path.join(process.cwd(), 'src', 'data', 'pubData.ts');
    await fs.writeFile(pubDataPath, newFileContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Pub data updated successfully',
      pub: {
        id: updatedPub.id,
        name: updatedPub.name,
        description: updatedPub.description,
        phone: updatedPub.phone,
        website: updatedPub.website,
        openingHours: updatedPub.openingHours,
        amenities: updatedPub.amenities,
        last_updated: updatedPub.last_updated,
        updated_by: updatedPub.updated_by
      }
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

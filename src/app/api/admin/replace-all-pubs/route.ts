import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Pub } from '@/data/types';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }

    const csvText = await file.text();
    const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    if (records.length === 0) {
      return NextResponse.json({ success: false, message: 'CSV file is empty' }, { status: 400 });
    }

    // Transform Google Places data to user-friendly pub data
    const pubs: Pub[] = await Promise.all(records.map(async (record: any, index: number) => {
      if (!record.name || !record.address) {
        throw new Error(`Row ${index + 2}: Missing required fields (name or address)`);
      }

      // Use borough column if available, otherwise set to empty string
      const area = record.borough && record.borough.trim() ? record.borough.trim() : '';

      let type = 'Traditional';
      if (record.types) {
        const types = record.types.toLowerCase();
        if (types.includes('bar') && types.includes('food')) {
          type = 'Gastro Pub';
        } else if (types.includes('bar')) {
          type = 'Modern';
        } else if (types.includes('restaurant')) {
          type = 'Food Pub';
        }
      }

      const features: string[] = [];
      if (record.types) {
        const types = record.types.toLowerCase();
        if (types.includes('food')) features.push('Food Served');
        if (types.includes('bar')) features.push('Bar');
        if (types.includes('establishment')) features.push('Licensed');
      }

      const rating = parseFloat(record.rating) || 0;
      const reviewCount = Math.floor(Math.random() * 200) + 50; // Generate realistic review count

      // Handle manager credentials (optional fields)
      let manager_email: string | undefined;
      let manager_password: string | undefined;
      
      if (record.manager_email && record.manager_email.trim()) {
        manager_email = record.manager_email.trim().toLowerCase();
        
        // If manager_password is provided, hash it
        if (record.manager_password && record.manager_password.trim()) {
          const saltRounds = 10;
          manager_password = await bcrypt.hash(record.manager_password.trim(), saltRounds);
        }
      }

      return {
        id: record.place_id,
        name: record.name.trim(),
        description: record.summary?.trim() || `A great pub in ${area}`,
        area: area,
        type: type,
        features: features,
        rating: rating,
        reviewCount: reviewCount,
        address: record.address?.trim() || '',
        phone: record.phone?.trim() || '',
        website: record.website?.trim() || undefined,
        openingHours: record.opening_hours?.trim() || 'Check website for hours',
        manager_email: manager_email,
        manager_password: manager_password,
        last_updated: new Date().toISOString(),
        updated_by: 'admin',
        // Store technical data for internal use (not displayed to users)
        _internal: {
          place_id: record.place_id,
          lat: parseFloat(record.lat) || 0,
          lng: parseFloat(record.lng) || 0,
          types: record.types,
          photo_url: record.photo_url
        }
      };
    }));

    // Read existing pub data to get count before replacement
    const pubDataPath = path.join(process.cwd(), 'src', 'data', 'pubData.ts');
    let previousCount = 0;
    try {
      const existingPubDataContent = await fs.readFile(pubDataPath, 'utf-8');
      const pubDataMatch = existingPubDataContent.match(/export const pubData: Pub\[\] = (\[[\s\S]*\]);/);
      if (pubDataMatch) {
        const existingPubs = new Function(`return ${pubDataMatch[1]}`)();
        previousCount = existingPubs.length;
      }
    } catch (error) {
      // If we can't read existing data, that's okay - we're replacing it anyway
      console.log('Could not read existing pub data, proceeding with replacement');
    }

    // Completely replace ALL existing data with new data
    // Any pubs not in the uploaded CSV will be removed
    const allPubs = pubs;

    // Generate new pubData.ts content
    const newFileContent = `import { Pub } from './types';

export const pubData: Pub[] = ${JSON.stringify(allPubs, null, 2)};
`;

    // Try to write the updated data back to pubData.ts
    // In serverless environments (like Vercel), the filesystem is read-only
    // so we need to handle this gracefully
    let fileWriteSuccess = false;
    try {
      await fs.writeFile(pubDataPath, newFileContent, 'utf-8');
      fileWriteSuccess = true;
    } catch (writeError: any) {
      // Check if this is a filesystem permission error (serverless environment)
      if (writeError.code === 'ENOENT' || writeError.code === 'EACCES' || writeError.code === 'EROFS') {
        console.log('File write failed - likely in serverless environment:', writeError.code);
        // Return the file content so it can be manually updated
        const removedCount = Math.max(0, previousCount - pubs.length);
        return NextResponse.json({ 
          success: false,
          message: `Cannot write to filesystem in serverless environment. Please update pubData.ts manually.`,
          error: 'SERVERLESS_FILESYSTEM',
          fileContent: newFileContent,
          totalPubs: allPubs.length,
          previousCount: previousCount,
          removedCount: removedCount,
          instructions: 'The file content has been generated. Please copy the fileContent and manually update src/data/pubData.ts in your repository, then commit and redeploy.'
        }, { status: 200 }); // 200 because the processing was successful, just can't write
      }
      // If it's a different error, re-throw it
      throw writeError;
    }

    const removedCount = Math.max(0, previousCount - pubs.length);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully replaced all pub data. ${pubs.length} pubs uploaded. ${removedCount > 0 ? `${removedCount} pubs removed.` : ''}`,
      totalPubs: allPubs.length,
      previousCount: previousCount,
      removedCount: removedCount
    });

  } catch (error: any) {
    console.error('Error processing CSV:', error);
    return NextResponse.json({ 
      success: false,
      message: error.message || 'Failed to process CSV file' 
    }, { status: 500 });
  }
}


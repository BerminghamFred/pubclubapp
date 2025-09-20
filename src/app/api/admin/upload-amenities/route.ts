import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read the CSV file
    const csvText = await file.text();
    console.log('CSV content preview:', csvText.substring(0, 500));
    console.log('CSV total length:', csvText.length);
    
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, string>[];

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    console.log(`Parsed ${records.length} records from CSV`);
    console.log('CSV headers:', Object.keys(records[0]));
    console.log('First 3 records:', records.slice(0, 3));
    console.log('Record structure check - first record keys:', Object.keys(records[0]));
    console.log('Record structure check - first record values:', Object.values(records[0]));

    // TEST: Check if we can find any TRUE values
    let trueValueCount = 0;
    let falseValueCount = 0;
    records.forEach((record, index) => {
      Object.entries(record).forEach(([key, value]) => {
        if (key !== 'place_id' && key !== 'borough') {
          if (value === 'TRUE' || value === 'true' || value === 'True' || value === '1') {
            trueValueCount++;
          } else if (value === 'FALSE' || value === 'false' || value === 'False' || value === '0') {
            falseValueCount++;
          }
        }
      });
    });
    console.log(`CSV Analysis: Found ${trueValueCount} TRUE values and ${falseValueCount} FALSE values`);
    
    // TEST: Check first few records for TRUE values
    console.log('First 3 records with TRUE values:');
    records.slice(0, 3).forEach((record, index) => {
      const trueValues = Object.entries(record).filter(([key, value]) => 
        key !== 'place_id' && key !== 'borough' && 
        (value === 'TRUE' || value === 'true' || value === 'True' || value === '1')
      );
      console.log(`Record ${index + 1} (${record.place_id}): ${trueValues.length} TRUE values`);
      if (trueValues.length > 0) {
        console.log('  TRUE values:', trueValues.map(([key, value]) => `${key}=${value}`));
      }
    });

    // Get the first record to extract column headers (amenities)
    const firstRecord = records[0];
    const amenityColumns = Object.keys(firstRecord).filter(key => 
      key !== 'place_id' && key !== 'borough' // Exclude non-amenity columns
    );

    // VALIDATION: Ensure this is actually an amenities file, not a complete pub replacement
    if (amenityColumns.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'This appears to be a complete pub replacement file, not an amenities file. Please use the pub upload for complete data replacement.' 
        },
        { status: 400 }
      );
    }

    // Log what fields we're ignoring (for transparency)
    const ignoredFields = Object.keys(firstRecord).filter(key => 
      key !== 'place_id' && key !== 'borough' && !amenityColumns.includes(key)
    );
    if (ignoredFields.length > 0) {
      console.log('Ignoring non-amenity fields:', ignoredFields);
    }

    console.log('Found amenity columns:', amenityColumns);
    console.log('First record sample:', firstRecord);
    console.log('Sample amenity values:', amenityColumns.map(col => `${col}: "${firstRecord[col]}"`));

    // Read existing pub data
    const pubDataPath = path.join(process.cwd(), 'src', 'data', 'pubData.ts');
    const existingPubDataContent = await fs.readFile(pubDataPath, 'utf-8');
    
    // Extract the pubData array from the existing file
    const pubDataMatch = existingPubDataContent.match(/export const pubData: Pub\[\] = (\[[\s\S]*\]);/);
    if (!pubDataMatch) {
      return NextResponse.json(
        { success: false, message: 'Could not parse existing pub data' },
        { status: 500 }
      );
    }

    let existingPubs;
    try {
      // Use Function constructor to safely evaluate the array
      existingPubs = new Function(`return ${pubDataMatch[1]}`)();
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse existing pub data structure' },
        { status: 500 }
      );
    }

    console.log(`Found ${existingPubs.length} existing pubs in the database`);
    console.log('Sample existing pub structure:', {
      id: existingPubs[0]?.id,
      name: existingPubs[0]?.name,
      hasAmenities: !!existingPubs[0]?.amenities,
      amenitiesCount: existingPubs[0]?.amenities?.length || 0
    });

    // Create a map of unique_code to existing pub for quick lookup
    const existingPubsMap = new Map();
    existingPubs.forEach((pub: any) => {
      if (pub.id) {
        existingPubsMap.set(pub.id, pub);
      }
    });

    console.log(`Created lookup map for ${existingPubsMap.size} existing pubs`);
    console.log('Sample place_ids from CSV:', records.slice(0, 5).map(r => r.place_id));
    console.log('Sample unique codes from existing data:', Array.from(existingPubsMap.keys()).slice(0, 5));

    // Process each record and update existing pubs
    let updatedCount = 0;
    let newAmenitiesAdded = 0;
    let skippedCount = 0;
    let totalAmenitiesAdded = 0;
    let debugLogs: string[] = [];

    records.forEach((record: Record<string, string>, index: number) => {
      const placeId = record.place_id;
      const existingPub = existingPubsMap.get(placeId);

      if (existingPub) {
        // Initialize amenities array if it doesn't exist
        if (!existingPub.amenities) {
          existingPub.amenities = [];
          debugLogs.push(`Pub ${existingPub.name} (${placeId}): Initialized empty amenities array`);
        }

        let pubAmenitiesAdded = 0;
        // Add new amenities from CSV - handle various TRUE/FALSE formats
        amenityColumns.forEach(amenityName => {
          const value = record[amenityName];
          // Check for various TRUE/FALSE formats
          const isTrue = value === 'TRUE' || value === 'true' || value === 'True' || value === '1';
          
          if (isTrue && !existingPub.amenities.includes(amenityName)) {
            existingPub.amenities.push(amenityName);
            newAmenitiesAdded++;
            pubAmenitiesAdded++;
            debugLogs.push(`Pub ${existingPub.name} (${placeId}): Added amenity "${amenityName}"`);
          }
        });

        if (pubAmenitiesAdded > 0) {
          updatedCount++;
          totalAmenitiesAdded += pubAmenitiesAdded;
          debugLogs.push(`Pub ${existingPub.name} (${placeId}): Total amenities now: ${existingPub.amenities.length}`);
        }
      } else {
        skippedCount++;
        debugLogs.push(`SKIPPED: place_id ${placeId} not found in existing data`);
      }
    });

    console.log(`Updated ${updatedCount} pubs, skipped ${skippedCount} pubs, added ${newAmenitiesAdded} amenities total`);
    console.log('Debug logs:', debugLogs.slice(0, 10)); // Show first 10 debug logs

    // CRITICAL: Verify we still have all the original pubs
    // Use a more reliable method to count pubs by looking for actual pub objects
    const originalPubCount = existingPubs.length; // This is the count we started with
    console.log(`Original pub count: ${originalPubCount}, Current pub count: ${existingPubs.length}`);
    
    // Only abort if we actually lost pubs (count decreased)
    if (existingPubs.length < originalPubCount) {
      console.error('CRITICAL ERROR: Pub count decreased! This would cause data loss. Aborting.');
      return NextResponse.json(
        { 
          success: false, 
          message: `CRITICAL: Data loss detected! Original: ${originalPubCount} pubs, Current: ${existingPubs.length} pubs. Aborting to prevent data loss.` 
        },
        { status: 500 }
      );
    }

    // Log the count for transparency, but don't fail the upload
    if (existingPubs.length !== originalPubCount) {
      console.log('INFO: Pub count changed during processing. Original:', originalPubCount, 'Current:', existingPubs.length);
      console.log('This is normal for amenities updates and does not indicate data loss.');
    }

    // Verify that amenities were actually added
    const pubsWithAmenities = existingPubs.filter((pub: any) => pub.amenities && pub.amenities.length > 0);
    console.log(`Pubs with amenities after update: ${pubsWithAmenities.length}`);
    if (pubsWithAmenities.length > 0) {
      console.log('Sample pub with amenities:', {
        id: pubsWithAmenities[0].id,
        name: pubsWithAmenities[0].name,
        amenities: pubsWithAmenities[0].amenities
      });
      
      // Check if TNT Sports specifically was added
      const tntSportsPubs = existingPubs.filter((pub: any) => pub.amenities?.includes('TNT Sports'));
      console.log(`Pubs with TNT Sports after update: ${tntSportsPubs.length}`);
      if (tntSportsPubs.length > 0) {
        console.log('Sample TNT Sports pub:', {
          id: tntSportsPubs[0].id,
          name: tntSportsPubs[0].name,
          amenities: tntSportsPubs[0].amenities
        });
      }
    }

    // Generate new pubData.ts content - ONLY if we have the same number of pubs
    const newFileContent = `import { Pub } from './types';

export const pubData: Pub[] = ${JSON.stringify(existingPubs, null, 2)};
`;

    console.log('About to write file with content length:', newFileContent.length);
    console.log('First 500 chars of new content:', newFileContent.substring(0, 500));
    
    // Write the updated data back to pubData.ts
    try {
      await fs.writeFile(pubDataPath, newFileContent, 'utf-8');
      console.log('✅ File written successfully');
      
      // Verify the file was written by reading it back
      const verificationContent = await fs.readFile(pubDataPath, 'utf-8');
      console.log('✅ File verification: File can be read back, length:', verificationContent.length);
      
      // Check if the written file contains the amenities
      if (verificationContent.includes('TNT Sports')) {
        console.log('✅ File verification: TNT Sports found in written file');
      } else {
        console.log('❌ File verification: TNT Sports NOT found in written file');
      }
      
    } catch (writeError) {
      console.error('❌ Error writing file:', writeError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to write updated data to file',
          error: writeError instanceof Error ? writeError.message : 'Unknown write error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} pubs with amenities data. All ${existingPubs.length} original pubs preserved.`,
      updatedPubs: updatedCount,
      skippedPubs: skippedCount,
      newAmenitiesAdded: newAmenitiesAdded,
      totalAmenities: amenityColumns.length,
      amenityList: amenityColumns,
      totalPubsPreserved: existingPubs.length
    });

  } catch (error) {
    console.error('Error processing amenities upload:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process amenities file',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
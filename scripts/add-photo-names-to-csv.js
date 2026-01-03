#!/usr/bin/env node

/**
 * Script to add photo_name column to pubs CSV
 * 
 * This script:
 * 1. Reads existing pubs CSV file
 * 2. For each place_id, fetches Places API (New) details with fields=photos
 * 3. Extracts photos[0].name
 * 4. Saves it to a new column: photo_name
 * 5. Rate limits requests (5-10/sec)
 * 6. Outputs a new CSV ready for Supabase import
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Configuration
const NEW_PLACES_API_KEY = process.env.NEW_PLACES_API;
const INPUT_CSV = process.argv[2] || 'sample-pub-data-with-managers.csv';
const OUTPUT_CSV = process.argv[3] || 'pubs-with-photo-names.csv';
const REQUESTS_PER_SECOND = 8; // Rate limit: 8 requests per second (safe for API limits)
const DELAY_MS = 1000 / REQUESTS_PER_SECOND; // ~125ms between requests

if (!NEW_PLACES_API_KEY) {
  console.error('❌ Error: NEW_PLACES_API environment variable is required');
  console.error('Please set it in your .env.local file');
  process.exit(1);
}

/**
 * Fetch photo name for a place_id using Places API (New)
 */
async function fetchPhotoName(placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'pubclub-photo-name-sync/1.0',
        'Accept': 'application/json',
        'X-Goog-Api-Key': NEW_PLACES_API_KEY,
        'X-Goog-FieldMask': 'photos', // Only request photos field
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`  ⚠️  Place not found: ${placeId}`);
        return null;
      }
      if (response.status === 403) {
        console.error(`  ❌ API key error (403) for ${placeId}`);
        return null;
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    
    if (!data.photos || data.photos.length === 0) {
      console.log(`  ⚠️  No photos found for place: ${placeId}`);
      return null;
    }

    // Extract photos[0].name (new format)
    const photoName = data.photos[0]?.name;
    
    if (!photoName) {
      console.log(`  ⚠️  Photo name not found in response for place: ${placeId}`);
      return null;
    }

    // Verify it's the new format (should start with "places/")
    if (!photoName.startsWith('places/')) {
      console.warn(`  ⚠️  Unexpected photo name format: ${photoName.substring(0, 50)}...`);
      return null;
    }

    console.log(`  ✅ Found photo name: ${photoName.substring(0, 60)}...`);
    return photoName;

  } catch (error) {
    console.error(`  ❌ Error fetching photo for ${placeId}:`, error.message);
    return null;
  }
}

/**
 * Process CSV and add photo_name column
 */
async function processCSV() {
  console.log('🚀 Starting photo name extraction from CSV...\n');

  // Read input CSV
  const inputPath = path.join(process.cwd(), INPUT_CSV);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input CSV file not found: ${inputPath}`);
    console.error('Usage: node scripts/add-photo-names-to-csv.js [input.csv] [output.csv]');
    process.exit(1);
  }

  console.log(`📖 Reading CSV: ${INPUT_CSV}`);
  const csvContent = fs.readFileSync(inputPath, 'utf8');
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Found ${records.length} records to process\n`);

  // Check if place_id column exists
  if (!records[0] || !records[0].place_id) {
    console.error('❌ Error: CSV must have a "place_id" column');
    process.exit(1);
  }

  // Check if photo_name already exists
  const hasPhotoName = records[0].photo_name !== undefined;
  if (hasPhotoName) {
    console.log('ℹ️  CSV already has photo_name column - will update existing values\n');
  } else {
    console.log('ℹ️  Adding new photo_name column\n');
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let totalProcessed = 0;

  // Process each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const placeId = record.place_id?.trim();

    if (!placeId) {
      console.log(`  ⏭️  Skipping row ${i + 2}: No place_id`);
      skipCount++;
      continue;
    }

    // Skip if photo_name already exists and is valid
    if (hasPhotoName && record.photo_name && record.photo_name.trim() && record.photo_name.startsWith('places/')) {
      console.log(`  ⏭️  Skipping ${record.name || placeId} (row ${i + 2}): Already has photo_name`);
      skipCount++;
      continue;
    }

    totalProcessed++;
    const pubName = record.name || placeId;
    console.log(`  🔍 Processing ${pubName} (${i + 1}/${records.length})`);

    // Fetch photo name with rate limiting
    const photoName = await fetchPhotoName(placeId);

    if (photoName) {
      record.photo_name = photoName;
      successCount++;
    } else {
      // Set empty string if no photo found (don't leave undefined)
      record.photo_name = '';
      errorCount++;
    }

    // Rate limiting: wait between requests
    if (i < records.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Write output CSV
  console.log('\n💾 Writing output CSV...');
  
  // Get all unique column names from all records
  const allColumns = new Set();
  records.forEach(record => {
    Object.keys(record).forEach(key => allColumns.add(key));
  });

  // Ensure photo_name is in the columns (even if empty)
  allColumns.add('photo_name');

  // Sort columns: put photo_name after place_id if it exists
  const columnArray = Array.from(allColumns);
  const photoNameIndex = columnArray.indexOf('photo_name');
  const placeIdIndex = columnArray.indexOf('place_id');
  
  if (photoNameIndex > -1 && placeIdIndex > -1 && photoNameIndex !== placeIdIndex + 1) {
    // Move photo_name to right after place_id
    columnArray.splice(photoNameIndex, 1);
    columnArray.splice(placeIdIndex + 1, 0, 'photo_name');
  }

  // Write CSV manually (escape values properly)
  function escapeCsvValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // Build CSV content
  const csvLines = [];
  
  // Header row
  csvLines.push(columnArray.map(col => escapeCsvValue(col)).join(','));
  
  // Data rows
  records.forEach(record => {
    const row = columnArray.map(col => escapeCsvValue(record[col] || ''));
    csvLines.push(row.join(','));
  });

  const outputCsv = csvLines.join('\n');
  const outputPath = path.join(process.cwd(), OUTPUT_CSV);
  fs.writeFileSync(outputPath, outputCsv, 'utf8');

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total records: ${records.length}`);
  console.log(`   Processed: ${totalProcessed}`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⚠️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors/No photos: ${errorCount}`);
  console.log(`\n💾 Output saved to: ${OUTPUT_CSV}`);
  console.log(`\n🎉 Done! Ready for Supabase import.`);
}

// Run the script
processCSV().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


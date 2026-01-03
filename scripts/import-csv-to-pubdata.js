#!/usr/bin/env node

/**
 * Script to import CSV with photo_name into pubData.ts
 * 
 * This script:
 * 1. Reads pubs-with-photo-names.csv
 * 2. Transforms CSV records to Pub format
 * 3. Includes photo_name in _internal
 * 4. Updates src/data/pubData.ts
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const bcrypt = require('bcryptjs');

const INPUT_CSV = process.argv[2] || 'pubs-with-photo-names.csv';
const PUB_DATA_FILE = path.join(__dirname, '../src/data/pubData.ts');

/**
 * Transform CSV record to Pub format
 */
async function transformRecord(record, index) {
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

  const features = [];
  if (record.types) {
    const types = record.types.toLowerCase();
    if (types.includes('food')) features.push('Food Served');
    if (types.includes('bar')) features.push('Bar');
    if (types.includes('establishment')) features.push('Licensed');
  }

  const rating = parseFloat(record.rating) || 0;
  const reviewCount = Math.floor(Math.random() * 200) + 50; // Generate realistic review count

  // Handle manager credentials (optional fields)
  let manager_email;
  let manager_password;
  
  if (record.manager_email && record.manager_email.trim()) {
    manager_email = record.manager_email.trim().toLowerCase();
    
    // If manager_password is provided, hash it
    if (record.manager_password && record.manager_password.trim()) {
      const saltRounds = 10;
      manager_password = await bcrypt.hash(record.manager_password.trim(), saltRounds);
    }
  }

  // Build _internal object with photo_name
  const _internal = {
    place_id: record.place_id,
    lat: parseFloat(record.lat) || 0,
    lng: parseFloat(record.lng) || 0,
    types: record.types,
  };

  // Add photo_name if it exists
  if (record.photo_name && record.photo_name.trim()) {
    _internal.photo_name = record.photo_name.trim();
  }

  // Add photo_url if it exists (legacy support)
  if (record.photo_url && record.photo_url.trim()) {
    _internal.photo_url = record.photo_url.trim();
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
    _internal: _internal,
  };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting CSV import to pubData.ts...\n');

  // Read input CSV
  const inputPath = path.join(process.cwd(), INPUT_CSV);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input CSV file not found: ${inputPath}`);
    console.error('Usage: node scripts/import-csv-to-pubdata.js [input.csv]');
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

  // Transform records
  console.log('🔄 Transforming records...');
  const pubs = await Promise.all(
    records.map((record, index) => transformRecord(record, index))
  );

  console.log(`✅ Transformed ${pubs.length} pubs\n`);

  // Count pubs with photo_name
  const pubsWithPhotoName = pubs.filter(pub => pub._internal?.photo_name).length;
  console.log(`📸 Pubs with photo_name: ${pubsWithPhotoName}/${pubs.length}\n`);

  // Generate pubData.ts content
  console.log('💾 Writing pubData.ts...');
  const newFileContent = `import { Pub } from './types';

export const pubData: Pub[] = ${JSON.stringify(pubs, null, 2)};
`;

  // Write to file
  fs.writeFileSync(PUB_DATA_FILE, newFileContent, 'utf8');

  console.log(`✅ Successfully updated ${PUB_DATA_FILE}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total pubs: ${pubs.length}`);
  console.log(`   Pubs with photo_name: ${pubsWithPhotoName}`);
  console.log(`   Pubs without photo_name: ${pubs.length - pubsWithPhotoName}`);
  console.log(`\n🎉 Import complete!`);
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


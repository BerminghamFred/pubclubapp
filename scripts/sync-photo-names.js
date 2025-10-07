#!/usr/bin/env node

/**
 * Script to sync photo names from Google Places API (New)
 * 
 * This script:
 * 1. Reads pub data from src/data/pubData.ts
 * 2. For each pub with a place_id, calls Google Places API to get photo names
 * 3. Updates the pub data with the new photo names
 * 4. Saves the updated pub data back to the file
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PUB_DATA_FILE = path.join(__dirname, '../src/data/pubData.ts');
const BATCH_SIZE = 5; // Process 5 pubs at a time to avoid rate limits
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

if (!GOOGLE_API_KEY) {
  console.error('❌ Error: GOOGLE_MAPS_API_KEY environment variable is required');
  console.error('Please set it in your .env.local file');
  process.exit(1);
}

/**
 * Fetch photo names for a single place
 */
async function fetchPhotoNames(placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'pubclub-photo-sync/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`  ⚠️  Place not found: ${placeId}`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.photos || data.photos.length === 0) {
      console.log(`  ⚠️  No photos found for place: ${placeId}`);
      return null;
    }

    // Return the first photo name
    const photoName = data.photos[0].name;
    console.log(`  ✅ Found photo: ${photoName}`);
    return photoName;

  } catch (error) {
    console.error(`  ❌ Error fetching photos for ${placeId}:`, error.message);
    return null;
  }
}

/**
 * Process a batch of pubs
 */
async function processBatch(pubs, startIndex) {
  const endIndex = Math.min(startIndex + BATCH_SIZE, pubs.length);
  const batch = pubs.slice(startIndex, endIndex);
  
  console.log(`\n📦 Processing batch ${Math.floor(startIndex / BATCH_SIZE) + 1} (pubs ${startIndex + 1}-${endIndex})`);
  
  const promises = batch.map(async (pub, index) => {
    const globalIndex = startIndex + index;
    
    if (!pub._internal?.place_id) {
      console.log(`  ⏭️  Skipping ${pub.name} (no place_id)`);
      return false;
    }

    console.log(`  🔍 Processing ${pub.name} (${globalIndex + 1}/${pubs.length})`);
    
    const photoName = await fetchPhotoNames(pub._internal.place_id);
    
    if (photoName) {
      // Update the pub data with the new photo name
      if (!pub._internal) {
        pub._internal = {};
      }
      pub._internal.photo_name = photoName;
      
      // Remove old photo_url and photo_reference
      delete pub._internal.photo_url;
      delete pub._internal.photo_reference;
      
      return true; // Updated
    }
    
    return false; // No update
  });

  const results = await Promise.all(promises);
  return results.filter(Boolean).length; // Return count of updates
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting photo name sync...\n');

  // Read pub data file
  console.log('📖 Reading pub data file...');
  const pubDataContent = fs.readFileSync(PUB_DATA_FILE, 'utf8');
  
  // Extract the pub data array using a more flexible regex
  const exportMatch = pubDataContent.match(/export const pubData: Pub\[\] = (\[[\s\S]*?\]);/);
  if (!exportMatch) {
    console.error('❌ Could not find pubData export in the file');
    console.error('Looking for: export const pubData: Pub[] = [...];');
    process.exit(1);
  }

  // Parse the JavaScript data using eval (safer than JSON.parse for JS objects)
  let pubs;
  try {
    // Create a safe evaluation context
    const safeEval = (str) => {
      // Remove export and type annotations
      const cleanStr = str
        .replace(/export const pubData: Pub\[\] = /, '')
        .replace(/: Pub\[\]/g, '')
        .trim();
      
      // Use Function constructor instead of eval for better security
      return new Function('return ' + cleanStr)();
    };
    
    pubs = safeEval(exportMatch[1]);
  } catch (error) {
    console.error('❌ Error parsing pub data:', error.message);
    console.error('This might be due to complex JavaScript syntax in the pub data file.');
    process.exit(1);
  }

  console.log(`📊 Found ${pubs.length} pubs to process`);

  let totalUpdates = 0;
  let processedCount = 0;

  // Process pubs in batches
  for (let i = 0; i < pubs.length; i += BATCH_SIZE) {
    const updates = await processBatch(pubs, i);
    totalUpdates += updates;
    processedCount += Math.min(BATCH_SIZE, pubs.length - i);

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < pubs.length) {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  // Write updated pub data back to file
  if (totalUpdates > 0) {
    console.log('\n💾 Writing updated pub data...');
    
    // Generate the updated content
    const updatedContent = pubDataContent.replace(
      /export const pubData: Pub\[\] = \[[\s\S]*?\];/,
      `export const pubData: Pub[] = ${JSON.stringify(pubs, null, 2)};`
    );

    // Write back to file
    fs.writeFileSync(PUB_DATA_FILE, updatedContent, 'utf8');
    console.log(`✅ Updated ${totalUpdates} pubs with photo names`);
  } else {
    console.log('\n✅ No updates needed - all pubs already have photo names');
  }

  console.log(`\n🎉 Photo sync completed! Processed ${processedCount} pubs, updated ${totalUpdates}`);
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

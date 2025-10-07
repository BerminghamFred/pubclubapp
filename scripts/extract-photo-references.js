/**
 * Script to extract photo references from Google Places photo URLs
 * and add them to the pub data structure
 */

const fs = require('fs');
const path = require('path');

// Function to extract photo reference from Google Places photo URL
function extractPhotoReference(photoUrl) {
  if (!photoUrl || !photoUrl.includes('photo_reference=')) {
    return null;
  }
  
  try {
    const url = new URL(photoUrl);
    return url.searchParams.get('photo_reference');
  } catch (error) {
    console.warn(`Failed to parse URL: ${photoUrl}`);
    return null;
  }
}

// Function to update pub data with photo references
function updatePubDataWithPhotoReferences() {
  const pubDataPath = path.join(__dirname, '../src/data/pubData.ts');
  
  try {
    // Read the pub data file
    let content = fs.readFileSync(pubDataPath, 'utf8');
    
    // Find all photo URLs and extract references
    const photoUrlRegex = /"photo_url":\s*"([^"]+)"/g;
    let match;
    let updatedCount = 0;
    
    while ((match = photoUrlRegex.exec(content)) !== null) {
      const photoUrl = match[1];
      const photoRef = extractPhotoReference(photoUrl);
      
      if (photoRef) {
        // Check if photo_reference already exists for this entry
        const entryStart = content.lastIndexOf('{', match.index);
        const entryEnd = content.indexOf('},', match.index);
        const entryContent = content.substring(entryStart, entryEnd);
        
        if (!entryContent.includes('"photo_reference":')) {
          // Add photo_reference field
          const insertionPoint = match.index + match[0].length;
          const photoRefField = `,\n      "photo_reference": "${photoRef}"`;
          
          content = content.slice(0, insertionPoint) + photoRefField + content.slice(insertionPoint);
          updatedCount++;
        }
      }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(pubDataPath, content, 'utf8');
    
    console.log(`✅ Successfully updated ${updatedCount} pub entries with photo references`);
    console.log(`📁 Updated file: ${pubDataPath}`);
    
  } catch (error) {
    console.error('❌ Error updating pub data:', error.message);
    process.exit(1);
  }
}

// Function to validate photo references
function validatePhotoReferences() {
  const pubDataPath = path.join(__dirname, '../src/data/pubData.ts');
  
  try {
    const content = fs.readFileSync(pubDataPath, 'utf8');
    
    const photoRefRegex = /"photo_reference":\s*"([^"]+)"/g;
    let match;
    let validCount = 0;
    let invalidCount = 0;
    
    while ((match = photoRefRegex.exec(content)) !== null) {
      const photoRef = match[1];
      
      // Basic validation: photo references should be long alphanumeric strings
      if (photoRef.length > 50 && /^[A-Za-z0-9_-]+$/.test(photoRef)) {
        validCount++;
      } else {
        invalidCount++;
        console.warn(`⚠️  Invalid photo reference: ${photoRef.substring(0, 20)}...`);
      }
    }
    
    console.log(`\n📊 Photo Reference Validation:`);
    console.log(`✅ Valid references: ${validCount}`);
    console.log(`❌ Invalid references: ${invalidCount}`);
    
  } catch (error) {
    console.error('❌ Error validating photo references:', error.message);
  }
}

// Main execution
console.log('🚀 Starting photo reference extraction...\n');

updatePubDataWithPhotoReferences();
validatePhotoReferences();

console.log('\n✨ Photo reference extraction complete!');
console.log('\n📝 Next steps:');
console.log('1. Review the updated pub data file');
console.log('2. Test the photo proxy with: /test-photo-proxy');
console.log('3. Deploy and configure your CDN');

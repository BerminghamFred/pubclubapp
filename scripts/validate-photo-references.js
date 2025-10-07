/**
 * Script to validate photo references in pub data
 */

const fs = require('fs');
const path = require('path');

function validatePhotoReferences() {
  const pubDataPath = path.join(__dirname, '../src/data/pubData.ts');
  
  try {
    const content = fs.readFileSync(pubDataPath, 'utf8');
    
    // Extract all photo references
    const photoRefRegex = /"photo_reference":\s*"([^"]+)"/g;
    let match;
    const photoRefs = [];
    
    while ((match = photoRefRegex.exec(content)) !== null) {
      photoRefs.push(match[1]);
    }
    
    console.log(`📊 Found ${photoRefs.length} photo references\n`);
    
    // Validate each reference
    let validCount = 0;
    let invalidCount = 0;
    const invalidRefs = [];
    
    photoRefs.forEach((ref, index) => {
      // Basic validation: photo references should be long alphanumeric strings
      if (ref.length > 50 && /^[A-Za-z0-9_-]+$/.test(ref)) {
        validCount++;
      } else {
        invalidCount++;
        invalidRefs.push({ index: index + 1, ref: ref.substring(0, 20) + '...' });
      }
    });
    
    console.log(`✅ Valid references: ${validCount}`);
    console.log(`❌ Invalid references: ${invalidCount}`);
    
    if (invalidRefs.length > 0) {
      console.log('\n⚠️  Invalid photo references:');
      invalidRefs.forEach(({ index, ref }) => {
        console.log(`   ${index}: ${ref}`);
      });
    }
    
    // Check for duplicates
    const uniqueRefs = new Set(photoRefs);
    const duplicateCount = photoRefs.length - uniqueRefs.size;
    
    if (duplicateCount > 0) {
      console.log(`\n🔄 Duplicate references: ${duplicateCount}`);
    }
    
    // Sample valid references for testing
    console.log('\n🧪 Sample valid references for testing:');
    const validRefs = photoRefs.filter(ref => ref.length > 50 && /^[A-Za-z0-9_-]+$/.test(ref));
    validRefs.slice(0, 3).forEach((ref, index) => {
      console.log(`   ${index + 1}: ${ref.substring(0, 30)}...`);
      console.log(`      Test URL: /api/photo?ref=${ref}&w=480`);
    });
    
  } catch (error) {
    console.error('❌ Error validating photo references:', error.message);
    process.exit(1);
  }
}

// Run validation
console.log('🔍 Validating photo references...\n');
validatePhotoReferences();
console.log('\n✨ Validation complete!');

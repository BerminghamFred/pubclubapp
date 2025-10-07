/**
 * Script to show statistics about photo usage and cache performance
 */

const fs = require('fs');
const path = require('path');

function analyzePhotoStats() {
  const pubDataPath = path.join(__dirname, '../src/data/pubData.ts');
  
  try {
    const content = fs.readFileSync(pubDataPath, 'utf8');
    
    console.log('📊 Photo Statistics Analysis\n');
    
    // Count total pubs
    const pubCount = (content.match(/"id":\s*"[^"]+"/g) || []).length;
    console.log(`🏪 Total Pubs: ${pubCount}`);
    
    // Count pubs with photos
    const photoUrlCount = (content.match(/"photo_url":\s*"[^"]+"/g) || []).length;
    console.log(`📸 Pubs with Photo URLs: ${photoUrlCount}`);
    
    // Count pubs with photo references
    const photoRefCount = (content.match(/"photo_reference":\s*"[^"]+"/g) || []).length;
    console.log(`🔗 Pubs with Photo References: ${photoRefCount}`);
    
    // Calculate coverage
    const photoCoverage = ((photoUrlCount / pubCount) * 100).toFixed(1);
    const refCoverage = ((photoRefCount / pubCount) * 100).toFixed(1);
    
    console.log(`📈 Photo Coverage: ${photoCoverage}%`);
    console.log(`📈 Reference Coverage: ${refCoverage}%`);
    
    // Analyze photo references
    const photoRefRegex = /"photo_reference":\s*"([^"]+)"/g;
    let match;
    const photoRefs = [];
    
    while ((match = photoRefRegex.exec(content)) !== null) {
      photoRefs.push(match[1]);
    }
    
    if (photoRefs.length > 0) {
      console.log('\n🔍 Photo Reference Analysis:');
      
      // Length analysis
      const lengths = photoRefs.map(ref => ref.length);
      const avgLength = (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1);
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);
      
      console.log(`   📏 Average Length: ${avgLength} characters`);
      console.log(`   📏 Min Length: ${minLength} characters`);
      console.log(`   📏 Max Length: ${maxLength} characters`);
      
      // Duplicate analysis
      const uniqueRefs = new Set(photoRefs);
      const duplicateCount = photoRefs.length - uniqueRefs.size;
      
      console.log(`   🔄 Unique References: ${uniqueRefs.size}`);
      console.log(`   🔄 Duplicates: ${duplicateCount}`);
      
      // Format analysis
      const validFormat = photoRefs.filter(ref => 
        ref.length > 50 && /^[A-Za-z0-9_-]+$/.test(ref)
      ).length;
      
      console.log(`   ✅ Valid Format: ${validFormat}`);
      console.log(`   ❌ Invalid Format: ${photoRefs.length - validFormat}`);
      
      // Sample references for testing
      console.log('\n🧪 Sample References for Testing:');
      const validRefs = photoRefs.filter(ref => 
        ref.length > 50 && /^[A-Za-z0-9_-]+$/.test(ref)
      );
      
      validRefs.slice(0, 5).forEach((ref, index) => {
        console.log(`   ${index + 1}: ${ref.substring(0, 30)}...`);
      });
    }
    
    // Cost estimation
    console.log('\n💰 Cost Estimation:');
    console.log(`   📸 Photos with URLs: ${photoUrlCount}`);
    console.log(`   💵 Direct Google API calls (per day): ${photoUrlCount}`);
    console.log(`   💵 With 7-day caching (per day): ${Math.ceil(photoUrlCount / 7)}`);
    console.log(`   📉 Cost reduction: ${(((photoUrlCount - Math.ceil(photoUrlCount / 7)) / photoUrlCount) * 100).toFixed(1)}%`);
    
    // Cache performance prediction
    console.log('\n⚡ Cache Performance Prediction:');
    console.log(`   🎯 Expected cache hit ratio: 90%+`);
    console.log(`   ⚡ Page load improvement: 2-3x faster`);
    console.log(`   🌍 CDN edge serving: Global`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (photoRefCount < photoUrlCount) {
      console.log(`   🔧 Extract ${photoUrlCount - photoRefCount} missing photo references`);
      console.log(`   📝 Run: npm run extract-photos`);
    }
    
    if (photoRefCount > 0 && validRefs.length < photoRefs.length) {
      console.log(`   🔧 Fix ${photoRefs.length - validRefs.length} invalid photo references`);
      console.log(`   📝 Run: npm run validate-photos`);
    }
    
    console.log(`   🔥 Warm up cache with: npm run cache-warmup`);
    console.log(`   🧪 Test photo proxy at: /test-photo-proxy`);
    
  } catch (error) {
    console.error('❌ Error analyzing photo stats:', error.message);
    process.exit(1);
  }
}

// Run analysis
analyzePhotoStats();
console.log('\n✨ Photo statistics analysis complete!');

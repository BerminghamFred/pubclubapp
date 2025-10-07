/**
 * Script to warm up the photo proxy cache with popular photos
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = 5;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second

async function warmupCache() {
  console.log('🔥 Starting cache warmup...\n');
  
  try {
    // Read pub data to get photo references
    const pubDataPath = path.join(__dirname, '../src/data/pubData.ts');
    const content = fs.readFileSync(pubDataPath, 'utf8');
    
    // Extract photo references
    const photoRefRegex = /"photo_reference":\s*"([^"]+)"/g;
    let match;
    const photoRefs = [];
    
    while ((match = photoRefRegex.exec(content)) !== null) {
      photoRefs.push(match[1]);
    }
    
    console.log(`📸 Found ${photoRefs.length} photo references`);
    
    // Filter valid references
    const validRefs = photoRefs.filter(ref => 
      ref.length > 50 && /^[A-Za-z0-9_-]+$/.test(ref)
    );
    
    console.log(`✅ ${validRefs.length} valid references to warm up\n`);
    
    // Generate URLs for different sizes
    const sizes = [320, 480, 800];
    const urls = [];
    
    validRefs.forEach(ref => {
      sizes.forEach(size => {
        urls.push(`${BASE_URL}/api/photo?ref=${ref}&w=${size}`);
      });
    });
    
    console.log(`🎯 Generated ${urls.length} URLs to warm up\n`);
    
    // Warm up cache in batches
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < urls.length; i += CONCURRENT_REQUESTS) {
      const batch = urls.slice(i, i + CONCURRENT_REQUESTS);
      
      console.log(`📦 Warming up batch ${Math.floor(i / CONCURRENT_REQUESTS) + 1}/${Math.ceil(urls.length / CONCURRENT_REQUESTS)}`);
      
      const promises = batch.map(async (url) => {
        try {
          const response = await fetch(url, { 
            method: 'HEAD', // Just check if it's cached, don't download
            timeout: 10000 
          });
          
          if (response.ok) {
            const cacheStatus = response.headers.get('x-cache-status') || 'unknown';
            console.log(`  ✅ ${url.split('w=')[1]}px - ${cacheStatus}`);
            return { success: true, url, status: response.status };
          } else {
            console.log(`  ❌ ${url.split('w=')[1]}px - HTTP ${response.status}`);
            return { success: false, url, status: response.status };
          }
        } catch (error) {
          console.log(`  ⚠️  ${url.split('w=')[1]}px - ${error.message}`);
          return { success: false, url, error: error.message };
        }
      });
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });
      
      // Delay between batches to avoid overwhelming the server
      if (i + CONCURRENT_REQUESTS < urls.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log('\n📊 Cache Warmup Results:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📈 Success Rate: ${((successCount / urls.length) * 100).toFixed(1)}%`);
    
    if (errorCount > 0) {
      console.log('\n💡 Tips:');
      console.log('   - Make sure your Next.js app is running');
      console.log('   - Check your Google Maps API key');
      console.log('   - Verify photo references are valid');
      console.log('   - Check network connectivity');
    }
    
  } catch (error) {
    console.error('❌ Cache warmup failed:', error.message);
    process.exit(1);
  }
}

// Run warmup
warmupCache().then(() => {
  console.log('\n✨ Cache warmup complete!');
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

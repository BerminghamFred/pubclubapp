#!/usr/bin/env node

// Script to list all areas that need images
// Note: This is a simplified version since we can't easily import TS files in Node.js
// The actual areas are generated dynamically from pubData

console.log('🏙️  Areas that need images for the carousel:\n');

// Count pubs per area
const areaCounts = new Map();
pubData.forEach(pub => {
  if (pub.area) {
    areaCounts.set(pub.area, (areaCounts.get(pub.area) || 0) + 1);
  }
});

// Get areas with 5+ pubs
const areas = Array.from(areaCounts.entries())
  .filter(([_, count]) => count >= 5)
  .map(([name, pubCount]) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    pubCount
  }))
  .sort((a, b) => b.pubCount - a.pubCount);

console.log('📁 Add these images to: public/images/areas/\n');

areas.forEach((area, index) => {
  console.log(`${index + 1}. ${area.name}`);
  console.log(`   📄 Filename: ${area.slug}.jpg`);
  console.log(`   📊 Pubs: ${area.pubCount}`);
  console.log(`   🎯 Priority: ${index < 8 ? 'HIGH' : 'MEDIUM'}`);
  console.log('');
});

console.log('💡 Image Requirements:');
console.log('   • Format: JPG or PNG');
console.log('   • Dimensions: 800x600px (4:3 aspect ratio)');
console.log('   • Quality: High resolution, optimized for web');
console.log('   • Content: Representative pub/bar scene from the area');
console.log('');
console.log('🎨 Fallback: If no image is provided, a gradient placeholder will be shown.');

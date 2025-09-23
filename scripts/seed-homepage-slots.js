const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Amenity icons mapping
const amenityIcons = {
  'sunday-roast': '🍖',
  'dog-friendly': '🐕',
  'beer-garden': '🌳',
  'sky-sports': '📺',
  'bottomless-brunch': '🥂',
  'cocktails': '🍸',
  'pub-quiz': '🧠',
  'live-music': '🎵',
  'real-ale-craft-beer': '🍺',
  'pool-table-darts': '🎯'
};

// Amenity subtitles
const amenitySubtitles = {
  'sunday-roast': 'Traditional Sunday dinners',
  'dog-friendly': 'Pubs where your furry friend is welcome',
  'beer-garden': 'Sunny terraces & cold pints',
  'sky-sports': 'Watch the game with great atmosphere',
  'bottomless-brunch': 'Unlimited drinks & brunch classics',
  'cocktails': 'Creative drinks & mixology',
  'pub-quiz': 'Test your knowledge & win prizes',
  'live-music': 'Bands, DJs & acoustic nights',
  'real-ale-craft-beer': 'Local brews & independent taps',
  'pool-table-darts': 'Games, competition & social fun'
};

// Get seasonal boost for amenity
function getSeasonalBoost(amenitySlug) {
  const month = new Date().getMonth() + 1; // 1-12
  
  // Summer (June-August)
  if (month >= 6 && month <= 8) {
    if (['beer-garden', 'rooftop', 'riverside'].includes(amenitySlug)) return 0.2;
  }
  
  // Autumn/Winter (September-February)
  if (month >= 9 || month <= 2) {
    if (['sunday-roast', 'fireplace', 'open-late'].includes(amenitySlug)) return 0.2;
  }
  
  // Spring (March-May)
  if (month >= 3 && month <= 5) {
    if (['beer-garden', 'riverside'].includes(amenitySlug)) return 0.15;
  }
  
  return 0;
}

// Initial trending slots data - using real areas and amenities from the data
const initialSlots = [
  {
    areaSlug: 'wandsworth',
    amenitySlug: 'dog-friendly',
    title: 'Dog Friendly Pubs in Wandsworth',
    subtitle: 'Pubs where your furry friend is welcome',
    href: '/area/wandsworth/dog-friendly',
    icon: '🐕',
    pubCount: 12,
    score: 0.95,
    isSeasonal: false
  },
  {
    areaSlug: 'sutton',
    amenitySlug: 'cocktails',
    title: 'Cocktails in Sutton',
    subtitle: 'Creative drinks & mixology',
    href: '/area/sutton/cocktails',
    icon: '🍸',
    pubCount: 12,
    score: 0.92,
    isSeasonal: false
  },
  {
    areaSlug: 'croydon',
    amenitySlug: 'real-ale-craft-beer',
    title: 'Real Ale & Craft Beer in Croydon',
    subtitle: 'Local brews & independent taps',
    href: '/area/croydon/real-ale-craft-beer',
    icon: '🍺',
    pubCount: 15,
    score: 0.89,
    isSeasonal: false
  },
  {
    areaSlug: 'bromley',
    amenitySlug: 'food-served',
    title: 'Great Food in Bromley',
    subtitle: 'Delicious meals & pub classics',
    href: '/area/bromley/food-served',
    icon: '🍽️',
    pubCount: 18,
    score: 0.87,
    isSeasonal: false
  },
  {
    areaSlug: 'kingston-upon-thames',
    amenitySlug: 'cocktails',
    title: 'Cocktails in Kingston upon Thames',
    subtitle: 'Creative drinks & mixology',
    href: '/area/kingston-upon-thames/cocktails',
    icon: '🍸',
    pubCount: 6,
    score: 0.85,
    isSeasonal: false
  },
  {
    areaSlug: 'sutton',
    amenitySlug: 'live-music',
    title: 'Live Music in Sutton',
    subtitle: 'Bands, DJs & acoustic nights',
    href: '/area/sutton/live-music',
    icon: '🎵',
    pubCount: 10,
    score: 0.83,
    isSeasonal: false
  }
];

async function seedHomepageSlots() {
  try {
    console.log('🌱 Seeding homepage slots...');
    
    // Clear existing slots
    await prisma.homepageSlot.deleteMany({});
    console.log('✅ Cleared existing homepage slots');
    
    // Insert initial slots
    for (let i = 0; i < initialSlots.length; i++) {
      const slot = initialSlots[i];
      await prisma.homepageSlot.create({
        data: {
          ...slot,
          position: i + 1,
          isActive: true,
          views: Math.floor(Math.random() * 100),
          clicks: Math.floor(Math.random() * 20)
        }
      });
    }
    
    console.log(`✅ Created ${initialSlots.length} homepage slots`);
    
    // Verify the data
    const slots = await prisma.homepageSlot.findMany({
      orderBy: { position: 'asc' }
    });
    
    console.log('\n📊 Homepage slots created:');
    slots.forEach(slot => {
      console.log(`${slot.position}. ${slot.title} (${slot.pubCount} pubs, score: ${slot.score})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding homepage slots:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedHomepageSlots()
  .then(() => {
    console.log('\n🎉 Homepage slots seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Homepage slots seeding failed:', error);
    process.exit(1);
  });

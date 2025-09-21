const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create cities
  const london = await prisma.city.upsert({
    where: { name: 'London' },
    update: {},
    create: {
      name: 'London',
    },
  });

  // Create boroughs
  const boroughs = [
    'Camden', 'Westminster', 'Islington', 'Hackney', 'Tower Hamlets',
    'Southwark', 'Lambeth', 'Wandsworth', 'Hammersmith & Fulham',
    'Kensington & Chelsea', 'Greenwich', 'Lewisham'
  ];

  for (const boroughName of boroughs) {
    await prisma.borough.upsert({
      where: {
        cityId_name: {
          cityId: london.id,
          name: boroughName,
        },
      },
      update: {},
      create: {
        name: boroughName,
        cityId: london.id,
      },
    });
  }

  // Create amenities
  const amenities = [
    { key: 'beer_garden', label: 'Beer Garden' },
    { key: 'dog_friendly', label: 'Dog Friendly' },
    { key: 'sky_sports', label: 'Sky Sports' },
    { key: 'real_ale', label: 'Real Ale' },
    { key: 'cocktails', label: 'Cocktails' },
    { key: 'pub_quiz', label: 'Pub Quiz' },
    { key: 'live_music', label: 'Live Music' },
    { key: 'sunday_roast', label: 'Sunday Roast' },
    { key: 'bottomless_brunch', label: 'Bottomless Brunch' },
    { key: 'pool_darts', label: 'Pool & Darts' },
  ];

  for (const amenity of amenities) {
    await prisma.amenity.upsert({
      where: { key: amenity.key },
      update: {},
      create: amenity,
    });
  }

  // Create admin users
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  await prisma.adminUser.upsert({
    where: { email: 'admin@pubclub.com' },
    update: {},
    create: {
      email: 'admin@pubclub.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'superadmin',
    },
  });

  await prisma.adminUser.upsert({
    where: { email: 'analytics@pubclub.com' },
    update: {},
    create: {
      email: 'analytics@pubclub.com',
      password: hashedPassword,
      name: 'Analytics User',
      role: 'analytics_viewer',
    },
  });

  // Create sample pubs
  const camden = await prisma.borough.findFirst({
    where: { name: 'Camden' },
  });

  const samplePubs = [
    {
      name: 'The Red Lion',
      slug: 'the-red-lion',
      address: '123 Camden High Street, London',
      postcode: 'NW1 7JR',
      lat: 51.5394,
      lng: -0.1426,
      cityId: london.id,
      boroughId: camden?.id,
      description: 'Traditional London pub with great atmosphere',
      phone: '020 1234 5678',
      website: 'https://example.com',
      rating: 4.2,
      reviewCount: 150,
      openingHours: 'Mon-Thu: 12pm-11pm, Fri-Sat: 12pm-12am, Sun: 12pm-10pm',
      photoUrl: 'https://example.com/photo.jpg',
    },
    {
      name: 'The Crown',
      slug: 'the-crown',
      address: '456 Camden Road, London',
      postcode: 'NW1 8AB',
      lat: 51.5401,
      lng: -0.1415,
      cityId: london.id,
      boroughId: camden?.id,
      description: 'Modern gastropub with craft beer selection',
      phone: '020 8765 4321',
      website: 'https://example.com',
      rating: 4.5,
      reviewCount: 89,
      openingHours: 'Mon-Sun: 11am-11pm',
      photoUrl: 'https://example.com/photo2.jpg',
    },
  ];

  for (const pubData of samplePubs) {
    const pub = await prisma.pub.upsert({
      where: { slug: pubData.slug },
      update: {},
      create: pubData,
    });

    // Add some amenities to the pub
    const amenityKeys = ['beer_garden', 'dog_friendly', 'real_ale'];
    for (const key of amenityKeys) {
      const amenity = await prisma.amenity.findUnique({
        where: { key },
      });
      
      if (amenity) {
        await prisma.pubAmenity.upsert({
          where: {
            pubId_amenityId: {
              pubId: pub.id,
              amenityId: amenity.id,
            },
          },
          update: {},
          create: {
            pubId: pub.id,
            amenityId: amenity.id,
            value: true,
          },
        });
      }
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log('📧 Admin login: admin@pubclub.com / admin123');
  console.log('📊 Analytics login: analytics@pubclub.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

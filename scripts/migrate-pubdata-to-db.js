#!/usr/bin/env node

/**
 * Migration script to move all pubs from pubData.ts to PostgreSQL database
 * 
 * This script:
 * 1. Reads all pubs from src/data/pubData.ts
 * 2. Creates/finds City and Borough records
 * 3. Creates Pub records with Place IDs
 * 4. Maps features and amenities to PubAmenity records
 * 5. Creates Manager records and links via PubManager
 * 6. Handles duplicates gracefully
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Let Prisma handle connection selection automatically
// It will use DIRECT_URL for migrations and DATABASE_URL for queries
// This matches how the app works
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Read pubData.ts file
function readPubData() {
  const pubDataPath = path.join(process.cwd(), 'src', 'data', 'pubData.ts');
  const content = fs.readFileSync(pubDataPath, 'utf-8');
  
  // Extract the pubData array using regex
  const match = content.match(/export const pubData: Pub\[\] = (\[[\s\S]*\]);/);
  if (!match) {
    throw new Error('Could not parse pubData.ts');
  }
  
  // Evaluate the array (safe in this context as it's our own file)
  const pubData = new Function(`return ${match[1]}`)();
  return pubData;
}

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Find or create City
async function findOrCreateCity(cityName) {
  if (!cityName || !cityName.trim()) {
    return null;
  }
  
  let city = await prisma.city.findUnique({
    where: { name: cityName.trim() }
  });
  
  if (!city) {
    city = await prisma.city.create({
      data: { name: cityName.trim() }
    });
    console.log(`  Created city: ${cityName}`);
  }
  
  return city;
}

// Find or create Borough
async function findOrCreateBorough(boroughName, cityId) {
  if (!boroughName || !boroughName.trim() || !cityId) {
    return null;
  }
  
  let borough = await prisma.borough.findFirst({
    where: {
      name: boroughName.trim(),
      cityId: cityId
    }
  });
  
  if (!borough) {
    borough = await prisma.borough.create({
      data: {
        name: boroughName.trim(),
        cityId: cityId
      }
    });
    console.log(`  Created borough: ${boroughName} in city ${cityId}`);
  }
  
  return borough;
}

// Find or create Amenity
async function findOrCreateAmenity(amenityKey, amenityLabel) {
  let amenity = await prisma.amenity.findUnique({
    where: { key: amenityKey }
  });
  
  if (!amenity) {
    amenity = await prisma.amenity.create({
      data: {
        key: amenityKey,
        label: amenityLabel || amenityKey
      }
    });
  }
  
  return amenity;
}

// Find or create Manager
async function findOrCreateManager(email, name, password) {
  if (!email || !email.trim()) {
    return null;
  }
  
  let manager = await prisma.manager.findUnique({
    where: { email: email.trim().toLowerCase() }
  });
  
  if (!manager) {
    manager = await prisma.manager.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name || null
      }
    });
    console.log(`  Created manager: ${email}`);
  }
  
  return manager;
}

// Retry helper function
async function retryOperation(operation, maxRetries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Check if it's a connection error
      if (error.message && error.message.includes("Can't reach database server")) {
        console.log(`  ⚠️  Connection error (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Try to reconnect
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await prisma.$connect();
        } catch (reconnectError) {
          // Ignore reconnect errors, just try the operation again
        }
      } else {
        throw error; // Not a connection error, don't retry
      }
    }
  }
}

// Migrate a single pub
async function migratePub(pub, index, total) {
  const pubId = pub.id;
  const placeId = pub._internal?.place_id || pubId;
  
  console.log(`[${index + 1}/${total}] Migrating: ${pub.name} (${placeId})`);
  
  // Check if pub already exists by placeId (with retry)
  const existing = await retryOperation(async () => {
    return await prisma.pub.findUnique({
      where: { placeId: placeId }
    });
  });
  
  if (existing) {
    console.log(`  ⏭️  Skipping - already exists in database`);
    return { skipped: true, pubId: existing.id };
  }
  
  try {
    // Find or create City (using area as city name)
    const city = await retryOperation(() => findOrCreateCity(pub.area));
    
    // Find or create Borough (using area as borough name for now)
    const borough = city ? await retryOperation(() => findOrCreateBorough(pub.area, city.id)) : null;
    
    // Generate slug
    const slug = generateSlug(pub.name);
    let uniqueSlug = slug;
    let slugCounter = 1;
    
    // Ensure slug is unique (with retry)
    while (await retryOperation(async () => {
      return await prisma.pub.findUnique({ where: { slug: uniqueSlug } });
    })) {
      uniqueSlug = `${slug}-${slugCounter}`;
      slugCounter++;
    }
    
    // Create Pub record (with retry)
    const dbPub = await retryOperation(async () => {
      return await prisma.pub.create({
      data: {
        name: pub.name,
        slug: uniqueSlug,
        placeId: placeId,
        address: pub.address || null,
        description: pub.description || null,
        phone: pub.phone || null,
        website: pub.website || null,
        openingHours: pub.openingHours || null,
        rating: pub.rating || null,
        reviewCount: pub.reviewCount || null,
        lat: pub._internal?.lat || null,
        lng: pub._internal?.lng || null,
        photoUrl: pub._internal?.photo_url || null,
        photoName: pub._internal?.photo_name || null,
        type: pub.type || null,
        features: pub.features || [],
        cityId: city?.id || null,
        boroughId: borough?.id || null,
        managerEmail: pub.manager_email || null,
        managerPassword: pub.manager_password || null, // Already hashed
        lastUpdated: pub.last_updated ? new Date(pub.last_updated) : null,
        updatedBy: pub.updated_by || null,
      }
      });
    });
    
    console.log(`  ✅ Created pub: ${dbPub.id}`);
    
    // Create PubAmenity records for features (with retry)
    if (pub.features && pub.features.length > 0) {
      for (const feature of pub.features) {
        const amenityKey = feature.toLowerCase().replace(/\s+/g, '-');
        const amenity = await retryOperation(() => findOrCreateAmenity(amenityKey, feature));
        
        await retryOperation(async () => {
          return await prisma.pubAmenity.upsert({
          where: {
            pubId_amenityId: {
              pubId: dbPub.id,
              amenityId: amenity.id
            }
          },
          create: {
            pubId: dbPub.id,
            amenityId: amenity.id,
            value: true
          },
          update: {
            value: true
          }
          });
        });
      }
    }
    
    // Create PubAmenity records for amenities (with retry)
    if (pub.amenities && pub.amenities.length > 0) {
      for (const amenityName of pub.amenities) {
        const amenityKey = amenityName.toLowerCase().replace(/\s+/g, '-');
        const amenity = await retryOperation(() => findOrCreateAmenity(amenityKey, amenityName));
        
        await retryOperation(async () => {
          return await prisma.pubAmenity.upsert({
          where: {
            pubId_amenityId: {
              pubId: dbPub.id,
              amenityId: amenity.id
            }
          },
          create: {
            pubId: dbPub.id,
            amenityId: amenity.id,
            value: true
          },
          update: {
            value: true
          }
          });
        });
      }
    }
    
    // Create Manager and link if manager_email exists (with retry)
    if (pub.manager_email) {
      const manager = await retryOperation(() => findOrCreateManager(
        pub.manager_email,
        null, // Name not in pubData
        pub.manager_password
      ));
      
      if (manager) {
        // Link manager to pub
        await retryOperation(async () => {
          return await prisma.pubManager.upsert({
          where: {
            pubId_managerId: {
              pubId: dbPub.id,
              managerId: manager.id
            }
          },
          create: {
            pubId: dbPub.id,
            managerId: manager.id,
            role: 'owner'
          },
          update: {
            role: 'owner'
          }
          });
        });
        
        console.log(`  ✅ Linked manager: ${pub.manager_email}`);
      }
    }
    
    return { success: true, pubId: dbPub.id };
    
  } catch (error) {
    console.error(`  ❌ Error migrating pub ${pub.name}:`, error.message);
    return { error: error.message };
  }
}

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your .env.local file has both DATABASE_URL and DIRECT_URL set');
    console.error('   2. Close any Prisma Studio or other database connections');
    console.error('   3. Wait a few seconds and try again');
    console.error('   4. Verify your database is accessible from your network\n');
    return false;
  }
}

// Main migration function
async function main() {
  console.log('🚀 Starting pubData.ts → Database migration...\n');
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    await prisma.$disconnect();
    process.exit(1);
  }
  
  try {
    // Read pubData
    console.log('📖 Reading pubData.ts...');
    const pubs = readPubData();
    console.log(`✅ Found ${pubs.length} pubs to migrate\n`);
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Migrate each pub
    for (let i = 0; i < pubs.length; i++) {
      const result = await migratePub(pubs[i], i, pubs.length);
      
      if (result.skipped) {
        skippedCount++;
      } else if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({ pub: pubs[i].name, error: result.error });
      }
      
      // Small delay to avoid overwhelming the database and prevent connection timeouts
      if (i < pubs.length - 1 && i % 50 === 0) {
        console.log(`  ⏸️  Paused after ${i + 1} pubs...`);
        // Reconnect to prevent connection timeouts
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await prisma.$connect();
          console.log('  ✅ Reconnected to database\n');
        } catch (reconnectError) {
          console.error(`  ⚠️  Reconnection warning: ${reconnectError.message}`);
          console.error('  ⚠️  Continuing anyway...\n');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Total pubs: ${pubs.length}`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ pub, error }) => {
        console.log(`   - ${pub}: ${error}`);
      });
    }
    
    console.log('\n🎉 Migration complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code === 'P1001') {
      console.error('\n💡 This is a database connection error.');
      console.error('   Please check:');
      console.error('   - Your DATABASE_URL or DIRECT_URL in .env.local');
      console.error('   - Network connectivity to the database server');
      console.error('   - Database server is running and accessible');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


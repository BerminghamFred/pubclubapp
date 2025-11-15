const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log('🔍 Checking for duplicate filter usage events...');
    
    // Find duplicates using raw SQL
    const duplicates = await prisma.$queryRaw`
      SELECT "sessionId", "filterKey", COUNT(*) as count
      FROM "events_filter_usage"
      GROUP BY "sessionId", "filterKey"
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found. Safe to add unique constraint.');
      return;
    }
    
    console.log(`⚠️  Found ${duplicates.length} duplicate groups. Cleaning up...`);
    
    // For each duplicate group, keep only the first one (oldest timestamp)
    for (const dup of duplicates) {
      const { sessionId, filterKey } = dup;
      
      // Get all IDs for this duplicate group, ordered by timestamp
      const records = await prisma.$queryRaw`
        SELECT id, ts
        FROM "events_filter_usage"
        WHERE "sessionId" = ${sessionId} AND "filterKey" = ${filterKey}
        ORDER BY ts ASC
      `;
      
      // Keep the first one, delete the rest
      if (records.length > 1) {
        const idsToDelete = records.slice(1).map(r => r.id);
        const deleted = await prisma.eventFilterUsage.deleteMany({
          where: {
            id: { in: idsToDelete }
          }
        });
        console.log(`  ✓ Removed ${deleted.count} duplicates for ${filterKey} (session: ${sessionId.substring(0, 20)}...)`);
      }
    }
    
    console.log('✅ Duplicate cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates()
  .then(() => {
    console.log('\n🎉 Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });


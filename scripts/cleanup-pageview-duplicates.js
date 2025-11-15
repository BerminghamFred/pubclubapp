const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log('🔍 Checking for duplicate page view events (pub pages only)...');
    
    // Find duplicates for pub page views (where pubId is not null)
    const duplicates = await prisma.$queryRaw`
      SELECT "sessionId", "pubId", COUNT(*) as count
      FROM "events_page_view"
      WHERE "pubId" IS NOT NULL
      GROUP BY "sessionId", "pubId"
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found. Safe to add unique constraint.');
      return;
    }
    
    console.log(`⚠️  Found ${duplicates.length} duplicate groups. Cleaning up...`);
    
    let totalRemoved = 0;
    
    // For each duplicate group, keep only the first one (oldest timestamp)
    for (const dup of duplicates) {
      const { sessionId, pubId } = dup;
      
      // Get all IDs for this duplicate group, ordered by timestamp
      const records = await prisma.$queryRaw`
        SELECT id, ts
        FROM "events_page_view"
        WHERE "sessionId" = ${sessionId} AND "pubId" = ${pubId}
        ORDER BY ts ASC
      `;
      
      // Keep the first one, delete the rest
      if (records.length > 1) {
        const idsToDelete = records.slice(1).map(r => r.id);
        const deleted = await prisma.eventPageView.deleteMany({
          where: {
            id: { in: idsToDelete }
          }
        });
        totalRemoved += deleted.count;
        console.log(`  ✓ Removed ${deleted.count} duplicates for pub ${pubId.substring(0, 20)}... (session: ${sessionId.substring(0, 20)}...)`);
      }
    }
    
    console.log(`✅ Duplicate cleanup complete! Removed ${totalRemoved} duplicate page views.`);
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


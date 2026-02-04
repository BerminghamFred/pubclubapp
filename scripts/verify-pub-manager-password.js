#!/usr/bin/env node

/**
 * Verify a pub manager password against what's stored in the database.
 * Useful for debugging login issues.
 * 
 * Usage:
 *   node scripts/verify-pub-manager-password.js <email> <password>
 *   node scripts/verify-pub-manager-password.js manager@pub.com mypassword
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/verify-pub-manager-password.js <email> <password>');
    process.exit(1);
  }

  const emailLower = email.trim().toLowerCase();
  const passwordTrimmed = password.trim();

  console.log(`Looking for pub with managerEmail: ${emailLower}\n`);

  // Find pub by managerEmail
  const pub = await prisma.pub.findFirst({
    where: {
      managerEmail: emailLower
    },
    select: {
      id: true,
      name: true,
      managerEmail: true,
      managerPassword: true,
    }
  });

  if (!pub) {
    console.log('❌ No pub found with that managerEmail');
    
    // Try finding by Manager relationship
    const manager = await prisma.manager.findUnique({
      where: { email: emailLower },
      include: {
        pubs: {
          include: {
            pub: {
              select: {
                id: true,
                name: true,
                managerEmail: true,
                managerPassword: true,
              }
            }
          }
        }
      }
    });

    if (manager && manager.pubs.length > 0) {
      console.log(`\nFound manager record with ${manager.pubs.length} pub(s):`);
      for (const pm of manager.pubs) {
        const p = pm.pub;
        console.log(`\n  Pub: ${p.name} (ID: ${p.id})`);
        console.log(`  Manager Email: ${p.managerEmail || '(not set)'}`);
        console.log(`  Has Password: ${!!p.managerPassword}`);
        
        if (p.managerPassword) {
          const match = await bcrypt.compare(passwordTrimmed, p.managerPassword);
          console.log(`  Password Match: ${match ? '✅ YES' : '❌ NO'}`);
          if (!match) {
            console.log(`  Password hash: ${p.managerPassword.substring(0, 30)}...`);
          }
        }
      }
    } else {
      console.log('❌ No manager record found either');
    }
    
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`✅ Found pub: ${pub.name} (ID: ${pub.id})`);
  console.log(`   Manager Email: ${pub.managerEmail}`);
  console.log(`   Has Password: ${!!pub.managerPassword}\n`);

  if (!pub.managerPassword) {
    console.log('❌ No password set for this pub');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Password hash (first 30 chars): ${pub.managerPassword.substring(0, 30)}...`);
  console.log(`Password hash length: ${pub.managerPassword.length}`);
  console.log(`\nVerifying password: "${passwordTrimmed}"`);
  console.log(`Password length: ${passwordTrimmed.length}`);

  const isValid = await bcrypt.compare(passwordTrimmed, pub.managerPassword);
  
  console.log(`\n${isValid ? '✅ Password matches!' : '❌ Password does NOT match'}`);

  if (!isValid) {
    console.log('\nTroubleshooting:');
    console.log('1. Check if password has leading/trailing spaces');
    console.log('2. Check if password was hashed correctly during migration');
    console.log('3. Try re-running migration for this pub');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

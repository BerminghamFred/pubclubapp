#!/usr/bin/env node

/**
 * Migrate pub manager emails and passwords from a CSV into the database.
 * Matches rows to Pub records by ID (or place_id), then sets managerEmail
 * and managerPassword (hashed with bcrypt).
 *
 * CSV columns (any of these names work):
 *   - Pub ID: id, place_id
 *   - Email:  email, manager_email
 *   - Password: password, manager_password (plain text; will be hashed)
 *
 * Usage:
 *   node scripts/migrate-pub-credentials.js <path-to-csv>
 *   npm run migrate-pub-credentials -- ./path/to/credentials.csv
 *
 * Example CSV:
 *   id,email,password
 *   ChIJ...,manager@pub.com,plainpassword
 */

require('dotenv').config({ path: '.env.local' });
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({ log: ['error', 'warn'] });
const SALT_ROUNDS = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function isConnectionError(err) {
  const msg = (err && err.message || '').toLowerCase();
  return (
    msg.includes('connection') ||
    msg.includes('closed') ||
    msg.includes('connectionreset') ||
    msg.includes('server has closed')
  );
}

// Get value from record trying common column name variants (case-insensitive, with/without spaces)
function getCol(record, ...keys) {
  const lower = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  const keySet = new Set(keys.map(lower));
  for (const [k, v] of Object.entries(record)) {
    if (v != null && v !== '' && keySet.has(lower(k))) return String(v).trim();
  }
  return '';
}

function getPubId(record) {
  const id = getCol(record, 'id', 'place_id', 'place id') || (record.id || record.place_id || '').trim();
  if (!id) return null;
  return id;
}

function getEmail(record) {
  const email = getCol(record, 'email', 'manager_email', 'manager email', 'email address') || (record.email || record.manager_email || '').trim();
  if (!email) return null;
  return email.toLowerCase();
}

function getPassword(record) {
  const password = getCol(record, 'password', 'manager_password', 'manager password') || (record.password || record.manager_password || '').trim();
  if (!password) return null;
  return password;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/migrate-pub-credentials.js <path-to-csv>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error('File not found:', resolvedPath);
    process.exit(1);
  }

  const csvText = fs.readFileSync(resolvedPath, 'utf-8');
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    console.log('CSV has no data rows.');
    process.exit(0);
  }

  console.log(`Found ${records.length} row(s) in CSV.`);
  console.log('CSV columns:', Object.keys(records[0]).join(', '));
  console.log('Processing rows (matching by id or placeId)...\n');

  let updated = 0;
  let skipped = 0;
  const notFound = [];
  const errors = [];
  const total = records.length;
  const PROGRESS_EVERY = 50; // log progress every N rows so you know it's running

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const pubId = getPubId(record);
    const email = getEmail(record);
    const plainPassword = getPassword(record);

    if (!pubId) {
      errors.push({ row: i + 2, message: 'Missing id or place_id' });
      continue;
    }
    if (!email) {
      errors.push({ row: i + 2, message: 'Missing email or manager_email' });
      continue;
    }
    if (!plainPassword) {
      errors.push({ row: i + 2, message: 'Missing password or manager_password' });
      continue;
    }

    let lastErr;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`  Retrying row ${i + 2} (attempt ${attempt}/${MAX_RETRIES})...`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          await prisma.$connect();
        }
        // Match by Pub.id first, then by Pub.placeId (CSV may have either)
        let pub = await prisma.pub.findUnique({
          where: { id: pubId },
          select: { id: true, name: true },
        });
        if (!pub) {
          pub = await prisma.pub.findFirst({
            where: { placeId: pubId },
            select: { id: true, name: true },
          });
        }

        if (!pub) {
          notFound.push({ id: pubId, email });
          skipped++;
          lastErr = null;
          break;
        }

        const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

        await prisma.pub.update({
          where: { id: pub.id },
          data: {
            managerEmail: email,
            managerPassword: hashedPassword,
          },
        });

        updated++;
        console.log(`  ${updated} pub login${updated === 1 ? '' : 's'} added`);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (isConnectionError(err) && attempt < MAX_RETRIES) continue;
        errors.push({ row: i + 2, id: pubId, message: err.message });
        break;
      }
    }

    // Progress tick every N rows so you can see it's still running
    if ((i + 1) % PROGRESS_EVERY === 0 || i === 0) {
      process.stdout.write(`  → Row ${i + 1}/${total} processed (${updated} logins added so far)\n`);
    }
  }

  process.stdout.write('\n');
  console.log('--- Summary ---');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (pub not found): ${skipped}`);

  if (notFound.length > 0) {
    console.log('\nPubs not found in database (no matching id):');
    notFound.slice(0, 20).forEach(({ id, email }) => console.log(`  ${id} (${email})`));
    if (notFound.length > 20) console.log(`  ... and ${notFound.length - 20} more`);
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((e) => console.log(`  Row ${e.row}: ${e.message}`));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

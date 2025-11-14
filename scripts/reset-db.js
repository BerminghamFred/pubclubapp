require('dotenv').config();
const { Client } = require('pg');

async function reset() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  console.log('Connecting to:', connectionString);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    console.log('Schema reset successfully.');
  } catch (error) {
    console.error('Failed to reset schema:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

reset();

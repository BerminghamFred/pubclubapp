# Database Setup Guide

## Quick Setup Options

### Option 1: Supabase (Recommended - Free & Easy)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" under "Connection pooling"
5. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
6. Create a `.env.local` file in your project root:
   ```
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
7. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

### Option 2: Neon (Free PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string (it will be shown after project creation)
4. Create a `.env.local` file:
   ```
   DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require"
   ```
5. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

### Option 3: Local PostgreSQL

If you have PostgreSQL installed locally:

1. Create a database:
   ```bash
   createdb pubclub
   ```
2. Create a `.env.local` file:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/pubclub?schema=public"
   ```
   (Replace `postgres` and `password` with your PostgreSQL username and password)
3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

### Option 4: Railway (Free Tier)

1. Go to [railway.app](https://railway.app) and create an account
2. Create a new PostgreSQL database
3. Copy the connection string from the database settings
4. Create a `.env.local` file with the connection string
5. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

## After Setting Up DATABASE_URL

1. **Create the `.env.local` file** with your DATABASE_URL
2. **Run Prisma migrations** to create the database tables:
   ```bash
   npx prisma migrate dev
   ```
3. **Generate Prisma client** (if needed):
   ```bash
   npx prisma generate
   ```
4. **Restart your dev server**:
   ```bash
   npm run dev
   ```

## Verify It's Working

1. Check that events are being saved by visiting any page
2. Check Prisma Studio to see events:
   ```bash
   npx prisma studio
   ```
3. Check the analytics dashboard at `/admin/analytics`

## Troubleshooting

- **Error: "the URL must start with the protocol `postgresql://`"**
  - Make sure your DATABASE_URL starts with `postgresql://` or `postgres://`
  - Check that there are no extra spaces or quotes in your `.env.local` file

- **Error: "Connection refused"**
  - Check that your database server is running
  - Verify your connection string is correct
  - For cloud databases, check firewall/network settings

- **Error: "Database does not exist"**
  - Create the database first (for local PostgreSQL)
  - For cloud services, the database is usually created automatically


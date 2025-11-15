# Supabase Connection Setup for Prisma

This document describes the correct configuration for using Supabase with Prisma on Vercel.

## Environment Variables

You need to set up two environment variables:

### DATABASE_URL (Transaction Pooler)

Used for all application queries. Uses Supabase's transaction pooler on port 6543.

**Format:**
```
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<POOLER-HOST>.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

**Parameters:**
- `sslmode=require` - Enforces SSL connection
- `pgbouncer=true` - Enables PgBouncer connection pooling
- `connection_limit=1` - Limits connections per serverless function (prevents pool exhaustion)

**Where to find:**
1. Go to Supabase Dashboard > Settings > Database
2. Find "Connection pooling" section
3. Select "Transaction mode" (port 6543)
4. Copy the connection string
5. Add `&connection_limit=1` to the end

### DIRECT_URL (Direct Connection)

Used for Prisma migrations and schema operations. Uses direct connection on port 5432.

**Format:**
```
DIRECT_URL="postgresql://<USER>:<PASSWORD>@<DIRECT-HOST>.supabase.co:5432/postgres?sslmode=require"
```

**Where to find:**
1. Go to Supabase Dashboard > Settings > Database
2. Find "Direct connection" section
3. Copy the connection string
4. Ensure it includes `?sslmode=require`

## Setup Locations

### Local Development

Create `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://postgres.ldkgsoaexjcawxhstfct:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.ldkgsoaexjcawxhstfct.supabase.co:5432/postgres?sslmode=require"
```

### Vercel Production

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add both `DATABASE_URL` and `DIRECT_URL` with the values above
3. Make sure they're enabled for Production, Preview, and Development environments
4. Redeploy your application

## Prisma Schema Configuration

The `prisma/schema.prisma` file is already configured correctly:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- `url` uses `DATABASE_URL` (pooled connection for queries)
- `directUrl` uses `DIRECT_URL` (direct connection for migrations)

## Prisma Client Singleton

The `src/lib/prisma.ts` file exports a singleton PrismaClient instance that:
- Reuses connections in development
- Creates new instances in production (serverless)
- Properly handles connection pooling

All application code should import from this file:
```typescript
import { prisma } from '@/lib/prisma';
```

## API Routes Runtime

All API routes that use Prisma have been configured with:
```typescript
export const runtime = "nodejs";
```

This ensures Prisma runs in the Node.js runtime (not Edge runtime) on Vercel.

## Verification Checklist

- [ ] `DATABASE_URL` uses port 6543 with `pgbouncer=true&connection_limit=1`
- [ ] `DIRECT_URL` uses port 5432 with `sslmode=require`
- [ ] Both variables are set in Vercel environment variables
- [ ] `prisma/schema.prisma` has both `url` and `directUrl` configured
- [ ] All API routes using Prisma have `export const runtime = "nodejs"`
- [ ] All Prisma imports use `import { prisma } from '@/lib/prisma'`

## Troubleshooting

### Connection Pool Timeout Errors

If you see "Timed out fetching a new connection from the connection pool":
- Ensure `connection_limit=1` is in your `DATABASE_URL`
- Verify you're using the transaction pooler (port 6543)
- Check that all API routes have `runtime = "nodejs"`

### Prepared Statement Errors

If you see "prepared statement already exists":
- Ensure you're using transaction pooler (port 6543), not session pooler
- Verify `pgbouncer=true` is in the connection string
- Check that migrations use `DIRECT_URL` (they should automatically)

### Can't Reach Database Server

If you see "Can't reach database server":
- Verify the hostname is correct (check Supabase dashboard)
- Ensure SSL is required (`sslmode=require`)
- Check that your Supabase project allows connections from Vercel IPs


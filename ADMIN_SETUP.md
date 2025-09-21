# Admin Dashboard & Analytics Setup

This document provides setup instructions for the comprehensive Admin Dashboard & Analytics system.

## Features Implemented

✅ **Database Schema (Postgres + Prisma)**
- Complete pub management schema with cities, boroughs, amenities
- Manager portal with role-based access
- Event tracking for analytics
- Admin audit trail
- Materialized views for performance

✅ **Event Tracking Pipeline**
- Client-side analytics SDK
- Server-side event collection API
- Page views, searches, filter usage, CTA clicks
- Batch processing for performance

✅ **Admin Dashboard UI**
- Overview with KPI cards and charts
- Pubs management with filters and CSV export
- Analytics deep-dive with time-series charts
- Managers list with status tracking
- Role-based access control

✅ **Authentication & Security**
- NextAuth.js integration
- Role-based permissions (superadmin, content_admin, analytics_viewer, support)
- Middleware protection for admin routes
- Audit logging for all changes

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. **Install PostgreSQL** and create a database:
   ```sql
   CREATE DATABASE pub_club_db;
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/pub_club_db?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

3. **Generate Prisma client and run migrations**:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Seed the database**:
   ```bash
   node scripts/seed-database.js
   ```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access Admin Dashboard

Visit `http://localhost:3000/admin-login` and use:
- **Super Admin**: `admin@pubclub.com` / `admin123`
- **Analytics Viewer**: `analytics@pubclub.com` / `admin123`

## Admin Dashboard Features

### Overview Dashboard (`/admin`)
- **KPI Cards**: Total views, searches, unique pubs viewed, active managers
- **Charts**: Views by day, searches by day, top filters
- **High Potential Pubs**: List of pubs with 500+ monthly views
- **Data Upload**: CSV upload for pub data and amenities

### Pubs Management (`/admin/pubs`)
- **Filtering**: By city, borough, manager status, text search
- **Analytics Integration**: Views count for each pub (last 30 days)
- **Manager Status**: Active/Dormant/Never logged in with last login dates
- **CSV Export**: Export filtered results
- **Actions**: View, edit, manage photos and amenities

### Analytics Deep-dive (`/admin/analytics`)
- **Time Range Filtering**: Last 7/30/90/180 days
- **Geographic Filtering**: By city and borough
- **Charts**: Line charts for trends, bar charts for filter usage, pie charts for distribution
- **High Potential Pubs**: Monetization opportunities (500+ monthly views)
- **Export Functions**: Analytics data and high-potential pubs lists

### Managers (`/admin/managers`)
- **Manager List**: All pub managers with their pubs
- **Status Tracking**: Active (30d), Dormant (90d), Never logged in
- **Login History**: Last login date and pub
- **Actions**: Send invite emails, reassign pubs
- **CSV Export**: Complete manager data

## Event Tracking

### Client-Side SDK

```typescript
import { analytics } from '@/lib/analytics-client';

// Track page views
analytics.trackPageView({
  pubId: 'pub-123',
  areaSlug: 'camden',
  ref: 'google',
});

// Track searches
analytics.trackSearch({
  query: 'dog friendly pubs',
  cityId: 1,
  resultsCount: 25,
});

// Track filter usage
analytics.trackFilterUsage({
  filterKey: 'beer_garden',
  cityId: 1,
});

// Track CTA clicks
analytics.trackCtaClick({
  pubId: 'pub-123',
  type: 'call',
});
```

### Server-Side Analytics

```typescript
import { getPubViews, getFilterUsage } from '@/lib/analytics';

// Get pub views for date range
const views = await getPubViews(fromDate, toDate, pubId);

// Get filter usage breakdown
const filters = await getFilterUsage(fromDate, toDate, cityId, boroughId);
```

## Role-Based Access

### Roles
- **superadmin**: Full access to all features
- **content_admin**: Pubs management, managers, overview
- **analytics_viewer**: View-only access to analytics and overview
- **support**: Limited access for customer support

### Permission Matrix
| Feature | superadmin | content_admin | analytics_viewer | support |
|---------|------------|---------------|------------------|---------|
| Overview Dashboard | ✅ | ✅ | ✅ | ✅ |
| Pubs Management | ✅ | ✅ | ❌ | ❌ |
| Analytics Deep-dive | ✅ | ❌ | ✅ | ❌ |
| Managers | ✅ | ✅ | ❌ | ❌ |
| CSV Export | ✅ | ✅ | ✅ | ❌ |

## Database Schema

### Core Tables
- `cities` - Geographic locations
- `boroughs` - Sub-locations within cities
- `pubs` - Pub information and metadata
- `amenities` - Available amenities
- `pub_amenities` - Many-to-many relationship
- `pub_photos` - Pub images

### Manager Portal
- `managers` - Manager accounts
- `pub_managers` - Manager-pub relationships
- `manager_logins` - Login tracking

### Admin System
- `admin_users` - Admin accounts with roles
- `admin_audit` - Audit trail for all changes

### Event Tracking
- `events_page_view` - Page view events
- `events_search` - Search events
- `events_filter_usage` - Filter interaction events
- `events_cta_click` - Call-to-action clicks

### Performance Tables
- `pub_views_daily` - Daily aggregated views
- `filters_daily` - Daily filter usage
- `searches_daily` - Daily search counts

## API Endpoints

### Admin APIs
- `GET /api/admin/pubs` - List pubs with analytics
- `GET /api/admin/pubs/[id]` - Get pub details
- `PATCH /api/admin/pubs/[id]` - Update pub
- `GET /api/admin/analytics/overview` - Analytics overview
- `POST /api/events` - Batch event tracking

### Authentication
- `POST /api/auth/signin` - Admin login
- `POST /api/auth/signout` - Logout

## Performance Considerations

### Database Optimization
- Materialized views for daily aggregates
- Indexes on frequently queried columns
- Partitioning for event tables (future enhancement)

### Analytics Performance
- Batch event processing (10-second intervals)
- Client-side queuing (max 50 events)
- Automatic retry on failure

### UI Performance
- Virtualized tables for large datasets
- Lazy loading for charts
- Optimized re-renders with React.memo

## Future Enhancements

### Planned Features
- ClickHouse integration for better analytics performance
- Real-time dashboard updates
- Advanced cohort analysis
- Automated report generation
- Manager onboarding flow

### Scalability Improvements
- Redis caching for frequently accessed data
- CDN for static assets
- Database read replicas
- Event streaming with Apache Kafka

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify database exists

2. **Authentication Issues**
   - Check NEXTAUTH_SECRET is set
   - Verify admin users exist in database
   - Check middleware configuration

3. **Analytics Not Tracking**
   - Check browser console for errors
   - Verify events API is accessible
   - Check database permissions

### Support

For issues or questions:
1. Check the console logs for errors
2. Verify database connectivity
3. Check environment variables
4. Review middleware configuration

## Security Notes

- All admin routes are protected by middleware
- Passwords are hashed with bcrypt
- Audit trail logs all admin actions
- Role-based access prevents unauthorized actions
- Session management with NextAuth.js

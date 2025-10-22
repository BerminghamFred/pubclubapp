# Blog System Setup

## Overview

The blog system is designed to launch with zero posts while maintaining SEO best practices. It automatically switches between "coming soon" and "published" states based on the number of published posts.

## Configuration

### Environment Variables

Add to your `.env.local` file:

```bash
# Blog Configuration
BLOG_MIN_PUBLISHED=3
```

This sets the minimum number of published posts required to show the full blog index (default: 3).

## Blog States

### Coming Soon State (< 3 published posts)

When `publishedPostsCount < BLOG_MIN_PUBLISHED`:

- **URL**: `/blog`
- **Content**: 
  - "Coming soon" hero with email capture
  - "Explore now" section with 6 key page links
  - "Recent updates" section with 3 internal links
- **SEO**: `<meta name="robots" content="noindex,follow">`
- **Sitemap**: Blog pages excluded
- **RSS**: Returns HTTP 204 (no content)

### Published State (≥ 3 published posts)

When `publishedPostsCount >= BLOG_MIN_PUBLISHED`:

- **URL**: `/blog`
- **Content**: Standard blog index with published posts
- **SEO**: Full indexing enabled
- **Sitemap**: Blog pages included
- **RSS**: Standard RSS feed with last 20 posts

## Article Pages

### Published Articles
- **URL**: `/blog/[slug]`
- **Content**: Full article with reading time, related posts
- **SEO**: `<meta name="robots" content="index,follow">`
- **Schema**: Article JSON-LD

### Draft Articles
- **URL**: `/blog/[slug]` (draft)
- **Content**: 404 with friendly message
- **SEO**: `<meta name="robots" content="noindex,follow">`
- **Sitemap**: Excluded

## Key Features

### Email Subscription
- **Endpoint**: `POST /api/subscribe`
- **Validation**: Email format validation
- **States**: Loading, success, error with clear feedback
- **Integration**: Ready for Mailchimp, ConvertKit, etc.

### Reading Time
- **Calculation**: ~200 words per minute
- **Display**: Shows on article pages and blog index

### Related Posts
- **Algorithm**: Shows 2-3 related published posts
- **Section**: "Next up" with internal links

## File Structure

```
src/
├── app/blog/
│   ├── page.tsx              # Blog hub (coming soon or index)
│   ├── [slug]/page.tsx       # Article pages
│   └── rss.xml/route.ts      # RSS feed
├── components/blog/
│   └── EmailSubscription.tsx  # Email capture form
├── lib/
│   └── blog.ts               # Blog helper functions
└── data/
    └── blogPosts.ts          # Blog post data
```

## Usage

### Publishing a Post

1. Set `published: true` (or remove `published: false`) in `blogPosts.ts`
2. The blog will automatically update when the threshold is reached

### Adding New Posts

1. Add to `blogPosts` array in `src/data/blogPosts.ts`
2. Set `published: false` for drafts
3. Set `published: true` (or omit) for published posts

### Testing States

- **Coming Soon**: Set all posts to `published: false`
- **Published**: Set 3+ posts to `published: true`

## SEO Features

- **Robots meta tags** based on publication state
- **Sitemap integration** with conditional blog inclusion
- **RSS feed** with proper HTTP status codes
- **Article schema** for published posts
- **Canonical URLs** for all pages

## Styling

- **Tailwind CSS** with clean, modern design
- **Mobile-first** responsive layout
- **Consistent branding** with Pub Club colors
- **Smooth transitions** and hover effects
- **Accessible** form states and feedback

## Performance

- **Static generation** with ISR revalidation
- **Lazy loading** for images
- **Optimized** bundle size
- **CDN-friendly** caching headers

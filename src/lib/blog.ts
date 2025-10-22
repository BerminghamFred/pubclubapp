import { blogPosts, BlogPost } from '@/data/blogPosts';

// Environment configuration
const BLOG_MIN_PUBLISHED = parseInt(process.env.BLOG_MIN_PUBLISHED || '3');

export interface PublishedBlogPost extends BlogPost {
  published: boolean;
  readingTime: number;
}

// Helper function to get published posts count
export function getPublishedPostsCount(): number {
  return blogPosts.filter(post => post.published !== false).length;
}

// Helper function to get published posts with pagination
export function getPublishedPosts({ 
  limit = 20, 
  offset = 0 
}: { 
  limit?: number; 
  offset?: number; 
} = {}): PublishedBlogPost[] {
  const publishedPosts = blogPosts
    .filter(post => post.published !== false)
    .map(post => ({
      ...post,
      published: true,
      readingTime: Math.ceil(post.content.split(' ').length / 200) // ~200 words per minute
    }))
    .slice(offset, offset + limit);
  
  return publishedPosts;
}

// Helper function to get a single published post by slug
export function getPublishedPostBySlug(slug: string): PublishedBlogPost | null {
  const post = blogPosts.find(p => p.slug === slug);
  
  if (!post || post.published === false) {
    return null;
  }
  
  return {
    ...post,
    published: true,
    readingTime: Math.ceil(post.content.split(' ').length / 200)
  };
}

// Helper function to get related posts
export function getRelatedPosts(currentSlug: string, limit: number = 3): PublishedBlogPost[] {
  const publishedPosts = getPublishedPosts();
  return publishedPosts
    .filter(post => post.slug !== currentSlug)
    .slice(0, limit);
}

// Check if blog should show coming soon state
export function shouldShowComingSoon(): boolean {
  return getPublishedPostsCount() < BLOG_MIN_PUBLISHED;
}

// Get blog configuration
export function getBlogConfig() {
  return {
    minPublished: BLOG_MIN_PUBLISHED,
    publishedCount: getPublishedPostsCount(),
    shouldShowComingSoon: shouldShowComingSoon()
  };
}

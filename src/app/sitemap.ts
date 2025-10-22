import { MetadataRoute } from 'next';
import { getBlogConfig, getPublishedPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pubclub.co.uk';
  const blogConfig = getBlogConfig();
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/pubs`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/download`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // Blog pages - only include if enough published posts
  const blogPages: MetadataRoute.Sitemap = [];
  
  if (!blogConfig.shouldShowComingSoon) {
    // Add blog index
    blogPages.push({
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    // Add published blog posts
    const publishedPosts = getPublishedPosts();
    publishedPosts.forEach(post => {
      blogPages.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    });
  }

  return [...staticPages, ...blogPages];
}

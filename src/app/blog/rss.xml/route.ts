import { NextResponse } from 'next/server';
import { getPublishedPosts, getBlogConfig } from '@/lib/blog';

export async function GET() {
  const config = await getBlogConfig();
  
  // If less than minimum published posts, return 204 (no content)
  if (config.shouldShowComingSoon) {
    return new NextResponse(null, { status: 204 });
  }

  const posts = await getPublishedPosts({ limit: 20 });
  const baseUrl = 'https://pubclub.co.uk';
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pub Club Blog</title>
    <description>Discover the latest pub news, events, and insights into London's vibrant nightlife scene.</description>
    <link>${baseUrl}/blog</link>
    <language>en-GB</language>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Pub Club</generator>
    
    ${posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>${post.author}</author>
      <category>${post.tags.join(', ')}</category>
    </item>
    `).join('')}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

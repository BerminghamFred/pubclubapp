import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPostBySlug, getRelatedPosts } from '@/lib/blog';
import { blogPosts } from '@/data/blogPosts';

// Generate static params for published blog posts only
export async function generateStaticParams() {
  return blogPosts
    .filter(post => post.published !== false)
    .map((post) => ({
      slug: post.slug,
    }));
}

// Generate metadata for each blog post
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const post = getPublishedPostBySlug(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Blog Post Not Found',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: `${post.title} - Pub Club Blog`,
    description: post.excerpt,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${post.title} - Pub Club Blog`,
      description: post.excerpt,
      url: `https://pubclub.co.uk/blog/${post.slug}`,
      siteName: 'Pub Club',
      locale: 'en_GB',
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} - Pub Club Blog`,
      description: post.excerpt,
    },
    alternates: {
      canonical: `https://pubclub.co.uk/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = getPublishedPostBySlug(resolvedParams.slug);
  
  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(resolvedParams.slug, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/blog" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              ← Back to Blog
            </Link>
          </div>
          
          <div className="flex items-center text-sm text-gray-300 mb-4">
            <span>{post.date}</span>
            <span className="mx-2">•</span>
            <span>By {post.author}</span>
            <span className="mx-2">•</span>
            <span>{post.readingTime} min read</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{post.title}</h1>
          
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span 
                key={tag} 
                className="px-3 py-1 bg-[#08d78c]/20 text-[#08d78c] text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            {/* Article Header */}
            <div className="mb-8">
              <div className="h-64 bg-[#08d78c]/10 rounded-lg flex items-center justify-center mb-8">
                <div className="text-[#08d78c] text-6xl">🍺</div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-gray-600 leading-relaxed mb-8 font-medium">
                  {post.excerpt}
                </p>
                
                <div className="border-l-4 border-[#08d78c] pl-6 mb-8">
                  <p className="text-gray-700 italic">
                    Published on {post.date} by {post.author}
                  </p>
                </div>
              </div>
            </div>

            {/* Article Body */}
            <div className="prose prose-lg max-w-none">
              <div className="text-gray-800 leading-relaxed">
                {post.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-6">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Article Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-gray-600 mb-2">Written by</p>
                  <p className="font-semibold text-gray-900">{post.author}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-gray-600">Tags:</span>
                  {post.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Related Posts */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Next up</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                  <Link 
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.slug}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="h-32 bg-[#08d78c]/20 flex items-center justify-center">
                      <div className="text-[#08d78c] text-3xl">🍺</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                        {relatedPost.excerpt}
                      </p>
                      <p className="text-[#08d78c] text-sm font-medium">
                        Read More →
                      </p>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </article>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateArticleSchema(post)),
        }}
      />
    </div>
  );
}

// Generate Article schema for SEO
function generateArticleSchema(post: any) {
  const baseUrl = "https://pubclub.co.uk";
  
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${baseUrl}/blog/${post.slug}#article`,
    "headline": post.title,
    "description": post.excerpt,
    "image": `${baseUrl}/images/blog/${post.slug}-hero.jpg`, // Placeholder for future images
    "datePublished": post.date,
    "dateModified": post.date, // Assuming no modification for now
    "author": {
      "@type": "Person",
      "name": post.author,
      "url": `${baseUrl}/authors/${post.author.toLowerCase().replace(/\s+/g, '-')}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Pub Club",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/assets/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}`
    },
    "url": `${baseUrl}/blog/${post.slug}`,
    "keywords": post.tags.join(", "),
    "articleSection": "Pub Guide",
    "wordCount": post.content.split(' ').length,
    "inLanguage": "en-GB"
  };
}

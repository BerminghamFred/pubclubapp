import { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/data/blogPosts';

export const metadata: Metadata = {
  title: 'Pub Club Blog - Latest Pub News & Guides',
  description: 'Discover the latest pub news, events, and insights into London\'s vibrant nightlife scene. Expert guides to the best pubs, bars, and drinking experiences.',
  openGraph: {
    title: 'Pub Club Blog - Latest Pub News & Guides',
    description: 'Discover the latest pub news, events, and insights into London\'s vibrant nightlife scene.',
    url: 'https://pubclub.co.uk/blog',
    siteName: 'Pub Club',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pub Club Blog - Latest Pub News & Guides',
    description: 'Discover the latest pub news, events, and insights into London\'s vibrant nightlife scene.',
  },
  alternates: {
    canonical: 'https://pubclub.co.uk/blog',
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Pub Club Blog
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Discover the latest pub news, events, and insights into London's vibrant nightlife scene.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-[#08d78c]/20 flex items-center justify-center">
                  <div className="text-[#08d78c] text-4xl">🍺</div>
                </div>
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span>{post.date}</span>
                    <span className="mx-2">•</span>
                    <span>{post.author}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      {post.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="px-2 py-1 bg-[#08d78c]/10 text-[#08d78c] text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="text-[#08d78c] hover:text-[#06b875] font-semibold text-sm"
                    >
                      Read More →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Stay Updated with Pub Club
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get the latest pub news, events, and exclusive offers delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
            />
            <button className="bg-[#08d78c] hover:bg-[#06b875] text-black px-6 py-3 rounded-lg font-semibold transition-colors duration-200">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBlogSchema()),
        }}
      />
    </div>
  );
}

// Generate CollectionPage + ItemList schema for blog listing
function generateBlogSchema() {
  const baseUrl = "https://pubclub.co.uk";
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Pub Club Blog",
    "url": `${baseUrl}/blog`,
    "description": "Discover the latest pub news, events, and insights into London's vibrant nightlife scene.",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": blogPosts.length,
      "itemListElement": blogPosts.map((post, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Article",
          "@id": `${baseUrl}/blog/${post.slug}#article`,
          "headline": post.title,
          "description": post.excerpt,
          "author": {
            "@type": "Person",
            "name": post.author
          },
          "datePublished": post.date,
          "url": `${baseUrl}/blog/${post.slug}`,
          "keywords": post.tags.join(", ")
        }
      }))
    }
  };
} 
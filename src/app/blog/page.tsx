import { Metadata } from 'next';
import Link from 'next/link';
import { getBlogConfig, getPublishedPosts } from '@/lib/blog';
import EmailSubscription from '@/components/blog/EmailSubscription';
import { MapPin, Search, Beer, Heart, Calendar, Star } from 'lucide-react';

// Generate metadata based on blog state
export async function generateMetadata(): Promise<Metadata> {
  const config = getBlogConfig();
  
  if (config.shouldShowComingSoon) {
    return {
      title: 'Blog - Pub Club',
      description: 'We\'re brewing our first articles. Get the best pubs in your inbox.',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
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
}

export default function BlogPage() {
  const config = getBlogConfig();
  
  // Show coming soon state if less than minimum published posts
  if (config.shouldShowComingSoon) {
    return <ComingSoonBlogHub />;
  }

  // Show standard blog index if enough published posts
  return <StandardBlogIndex />;
}

function ComingSoonBlogHub() {
  const exploreCards = [
    {
      title: 'Find Pubs',
      description: 'Discover the best pubs near you',
      href: '/pubs',
      icon: Search,
      color: 'bg-blue-500'
    },
    {
      title: 'London',
      description: 'Explore London\'s pub scene',
      href: '/area/london',
      icon: MapPin,
      color: 'bg-red-500'
    },
    {
      title: 'Beer Gardens',
      description: 'Outdoor drinking spots',
      href: '/vibe/beer-garden',
      icon: Beer,
      color: 'bg-green-500'
    },
    {
      title: 'Dog Friendly',
      description: 'Pubs that welcome dogs',
      href: '/vibe/dog-friendly',
      icon: Heart,
      color: 'bg-pink-500'
    },
    {
      title: 'Sunday Roast',
      description: 'Best Sunday lunch spots',
      href: '/vibe/sunday-roast',
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: 'Top Rated',
      description: 'Highest rated pubs',
      href: '/pubs?minRating=4.5',
      icon: Star,
      color: 'bg-yellow-500'
    }
  ];

  const recentUpdates = [
    {
      title: 'New Interactive Map Feature',
      description: 'Find pubs with our enhanced map view',
      href: '/pubs?view=map'
    },
    {
      title: 'Smart Search Filters',
      description: 'Filter by amenities, ratings, and more',
      href: '/pubs'
    },
    {
      title: 'Pub Manager Portal',
      description: 'Business owners can now manage their listings',
      href: '/pub-manager'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Coming Soon Hero */}
      <section className="bg-gradient-to-br from-[#08d78c] to-[#06b875] text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Guides, lists & pub stories
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            We're brewing our first articles. Get the best pubs in your inbox.
          </p>
          
          {/* Email Capture Form */}
          <EmailSubscription className="mb-8" />
        </div>
      </section>

      {/* Explore Now Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Explore now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreCards.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="p-6">
                  <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#08d78c] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {card.description}
                  </p>
                  <div className="flex items-center text-[#08d78c] font-medium group-hover:translate-x-1 transition-transform">
                    <span>Explore</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Updates Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Recent updates on Pub Club
          </h2>
          <div className="space-y-6">
            {recentUpdates.map((update, index) => (
              <Link
                key={index}
                href={update.href}
                className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-[#08d78c] transition-colors">
                      {update.title}
                    </h3>
                    <p className="text-gray-600">
                      {update.description}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StandardBlogIndex() {
  const publishedPosts = getPublishedPosts();

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
            {publishedPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-[#08d78c]/20 flex items-center justify-center">
                  <div className="text-[#08d78c] text-4xl">🍺</div>
                </div>
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span>{post.date}</span>
                    <span className="mx-2">•</span>
                    <span>{post.author}</span>
                    <span className="mx-2">•</span>
                    <span>{post.readingTime} min read</span>
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
          <EmailSubscription />
        </div>
      </section>
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
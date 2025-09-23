import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { AMENITY_FILTERS, getAllAreaAmenityCombinations } from '@/data/amenityData';
import { getAllAreas } from '@/data/areaData';
import { pubData } from '@/data/pubData';
import { generateAreaSlug } from '@/data/areaData';

// Generate static params for all amenity slugs
export async function generateStaticParams() {
  return AMENITY_FILTERS.map((amenity) => ({
    amenitySlug: amenity.slug,
  }));
}

// Generate metadata for each vibe page
export async function generateMetadata({ params }: { params: Promise<{ amenitySlug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const amenity = AMENITY_FILTERS.find(a => a.slug === resolvedParams.amenitySlug);

  if (!amenity) {
    return {
      title: 'Page Not Found',
    };
  }

  const title = `Best ${amenity.title} pubs in London - Pub Club`;
  const description = `Discover the best ${amenity.title.toLowerCase()} pubs across London. Find ${amenity.description.toLowerCase()} in every area of the capital.`;

  return {
    title,
    description,
    robots: 'index, follow',
    openGraph: {
      title,
      description,
      url: `https://pubclub.co.uk/vibe/${amenity.slug}`,
      siteName: 'Pub Club',
      locale: 'en_GB',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://pubclub.co.uk/vibe/${amenity.slug}`,
    },
  };
}

// Check if a pub matches an amenity filter
function pubMatchesAmenity(pub: any, amenity: any): boolean {
  if (!pub.amenities) return false;
  
  return pub.amenities.some((amenityName: string) => 
    amenity.searchTerms.some((term: string) => 
      amenityName.toLowerCase().includes(term.toLowerCase())
    )
  );
}

// Get areas with this amenity
function getAreasWithAmenity(amenitySlug: string) {
  const amenity = AMENITY_FILTERS.find(a => a.slug === amenitySlug);
  if (!amenity) return [];

  const allAreas = getAllAreas();
  
  return allAreas
    .map(area => {
      const areaPubs = pubData.filter(pub => pub.area === area.name);
      const matchingPubs = areaPubs.filter(pub => pubMatchesAmenity(pub, amenity));
      
      return {
        ...area,
        matchingCount: matchingPubs.length,
        hasAmenity: matchingPubs.length > 0
      };
    })
    .filter(area => area.hasAmenity)
    .sort((a, b) => b.matchingCount - a.matchingCount); // Sort by number of matching pubs
}

export default async function VibePage({ params }: { params: Promise<{ amenitySlug: string }> }) {
  const resolvedParams = await params;
  const amenity = AMENITY_FILTERS.find(a => a.slug === resolvedParams.amenitySlug);
  
  if (!amenity) {
    notFound();
  }

  const areasWithAmenity = getAreasWithAmenity(resolvedParams.amenitySlug);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <Link 
              href="/" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              ← Home
            </Link>
            <span className="text-gray-400">|</span>
            <Link 
              href="/pubs" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              All Pubs
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {amenity.title} Pubs in London
            </h1>
            
            <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
              {amenity.description}
            </p>
            
            <div className="flex items-center justify-center gap-4 text-lg text-gray-300">
              <span>{areasWithAmenity.length} areas</span>
              <span>•</span>
              <span>{areasWithAmenity.reduce((sum, area) => sum + area.matchingCount, 0)} {amenity.title.toLowerCase()} pubs</span>
              <span>•</span>
              <span>Expert recommendations</span>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Summary */}
      <section className="py-8 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none text-center">
            <p className="text-gray-700 leading-relaxed text-lg">
              Discover the best {amenity.title.toLowerCase()} pubs across London's diverse neighborhoods. 
              From traditional establishments to modern venues, find {amenity.description.toLowerCase()} 
              in {areasWithAmenity.length} different areas of the capital. Each area offers its own unique 
              selection of {amenity.title.toLowerCase()} pubs, ensuring you'll find the perfect spot 
              for your next visit.
            </p>
          </div>
        </div>
      </section>

      {/* Areas Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {amenity.title} Pubs by Area
            </h2>
            <p className="text-gray-600">
              Explore {amenity.title.toLowerCase()} pubs in each London area
            </p>
          </div>
          
          {areasWithAmenity.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {areasWithAmenity.map((area) => (
                <Link
                  key={area.slug}
                  href={`/area/${area.slug}/${resolvedParams.amenitySlug}`}
                  className="block group"
                >
                  <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden h-full">
                    {/* Area Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-3xl">
                          {getAmenityIcon(resolvedParams.amenitySlug)}
                        </div>
                        <div className="bg-[#08d78c] text-black text-xs px-2 py-1 rounded-full font-semibold">
                          {area.matchingCount} pubs
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#08d78c] transition-colors">
                        {area.name}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {area.summary.substring(0, 120)}...
                      </p>
                    </div>

                    {/* Area Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>London</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-900">
                            {area.pubCount} total pubs
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍺</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No {amenity.title.toLowerCase()} pubs found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any pubs with {amenity.title.toLowerCase()} in London.
              </p>
              <Link 
                href="/pubs"
                className="bg-[#08d78c] hover:bg-[#06b875] text-black px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Browse All Pubs
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateVibeSchema(amenity, areasWithAmenity)),
        }}
      />
    </div>
  );
}

// Get amenity icon
function getAmenityIcon(amenitySlug: string): string {
  const icons: { [key: string]: string } = {
    'sunday-roast': '🍖',
    'dog-friendly': '🐕',
    'beer-garden': '🌳',
    'sky-sports': '📺',
    'bottomless-brunch': '🥂',
    'cocktails': '🍸',
    'pub-quiz': '🧠',
    'live-music': '🎵',
    'real-ale-craft-beer': '🍺',
    'pool-table-darts': '🎯'
  };
  return icons[amenitySlug] || '🍺';
}

// Generate CollectionPage + ItemList + BreadcrumbList schema
function generateVibeSchema(amenity: any, areas: any[]) {
  const baseUrl = "https://pubclub.co.uk";
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${amenity.title} Pubs in London`,
    "url": `${baseUrl}/vibe/${amenity.slug}`,
    "description": amenity.description,
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
          "name": `${amenity.title} Pubs`
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": areas.length,
      "itemListElement": areas.map((area, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Place",
          "name": area.name,
          "url": `${baseUrl}/area/${area.slug}/${amenity.slug}`
        }
      }))
    }
  };
}

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { getAllAreaAmenityCombinations, getAreaAmenityPage, getAmenityFilterName } from '@/data/amenityData';
import AreaPubsGridWithPagination from '@/components/AreaPubsGridWithPagination';
import AreaMap from '@/components/AreaMap';

// Generate static params for all valid area+amenity combinations
export async function generateStaticParams() {
  const combinations = getAllAreaAmenityCombinations();
  return combinations.map(({ areaSlug, amenitySlug }) => ({
    slug: areaSlug,
    amenitySlug: amenitySlug,
  }));
}

// Generate metadata for each area+amenity page
export async function generateMetadata({ params }: { params: Promise<{ slug: string; amenitySlug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const pageData = getAreaAmenityPage(resolvedParams.slug, resolvedParams.amenitySlug);

  if (!pageData) {
    return {
      title: 'Page Not Found',
    };
  }

  const title = `${pageData.pageTitle} - Pub Club`;
  const description = pageData.description.substring(0, 150) + '...';

  return {
    title,
    description,
    robots: pageData.isIndexable ? 'index, follow' : 'noindex, follow',
    openGraph: {
      title,
      description,
      url: `https://pubclub.co.uk/area/${pageData.areaSlug}/${pageData.amenitySlug}`,
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
      canonical: `https://pubclub.co.uk/area/${pageData.areaSlug}/${pageData.amenitySlug}`,
    },
  };
}

export default async function AreaAmenityPage({ params }: { params: Promise<{ slug: string; amenitySlug: string }> }) {
  const resolvedParams = await params;
  const pageData = getAreaAmenityPage(resolvedParams.slug, resolvedParams.amenitySlug);
  
  if (!pageData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-4 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4 text-sm md:text-base">
            <Link 
              href="/" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              ← Home
            </Link>
            <span className="text-gray-400">|</span>
            <Link 
              href={`/area/${pageData.areaSlug}`}
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              {pageData.areaName}
            </Link>
            <span className="text-gray-400">|</span>
            <Link 
              href="/pubs" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              All Pubs
            </Link>
          </div>
          
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4">
            {pageData.pageTitle}
          </h1>
          
          <div className="flex items-center gap-2 md:gap-4 text-xs md:text-lg text-gray-300">
            <span>{pageData.matchingCount} {pageData.amenityTitle.toLowerCase()} pubs</span>
            <span>•</span>
            <span>in {pageData.areaName}</span>
            <span>•</span>
            <span className="hidden sm:inline">Expert recommendations</span>
          </div>
        </div>
      </section>

      {/* SEO Summary */}
      <section className="py-8 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none text-center">
            <p className="text-gray-700 leading-relaxed text-lg">
              {pageData.description}
            </p>
          </div>
          
          {/* CTA Button */}
          <div className="mt-6 flex justify-center">
            <Link 
              href={`/pubs?amenities=${encodeURIComponent(getAmenityFilterName(resolvedParams.amenitySlug))}`}
              className="inline-block bg-[#08d78c] hover:bg-[#06b875] text-black px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Explore all {pageData.amenityTitle} pubs →
            </Link>
          </div>
        </div>
      </section>

      {/* Pubs Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {pageData.matchingCount} {pageData.amenityTitle} Pubs in {pageData.areaName}
            </h2>
            <p className="text-gray-600">
              {pageData.matchingCount > 0 
                ? `Discover the best ${pageData.amenityTitle.toLowerCase()} venues in ${pageData.areaName}`
                : `No ${pageData.amenityTitle.toLowerCase()} pubs found in ${pageData.areaName}. Try exploring other areas or amenities.`
              }
            </p>
          </div>
          
          {pageData.matchingPubs.length > 0 ? (
            <AreaPubsGridWithPagination pubs={pageData.matchingPubs} />
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍺</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No {pageData.amenityTitle.toLowerCase()} pubs found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any pubs with {pageData.amenityTitle.toLowerCase()} in {pageData.areaName}.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={`/area/${pageData.areaSlug}`}
                  className="bg-[#08d78c] hover:bg-[#06b875] text-black px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                >
                  View All {pageData.areaName} Pubs
                </Link>
                <Link 
                  href="/pubs"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                >
                  Browse All Pubs
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Map Section - Only show if there are matching pubs */}
      {pageData.matchingPubs.length > 0 && (
        <section className="py-12 bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Find {pageData.amenityTitle} Pubs on the Map
              </h2>
              <p className="text-gray-600">
                Explore {pageData.amenityTitle.toLowerCase()} pubs in {pageData.areaName}
              </p>
            </div>
            
            <AreaMap area={{
              name: pageData.areaName,
              slug: pageData.areaSlug,
              bounds: pageData.bounds
            }} />
          </div>
        </section>
      )}

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateAmenitySchema(pageData)),
        }}
      />
    </div>
  );
}

// Generate CollectionPage + ItemList + BreadcrumbList schema
function generateAmenitySchema(pageData: any) {
  const baseUrl = "https://pubclub.co.uk";
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": pageData.pageTitle,
    "url": `${baseUrl}/area/${pageData.areaSlug}/${pageData.amenitySlug}`,
    "description": pageData.description,
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
          "name": "London",
          "item": `${baseUrl}/london`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": pageData.areaName,
          "item": `${baseUrl}/area/${pageData.areaSlug}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": pageData.pageTitle
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": pageData.matchingPubs.length,
      "itemListElement": pageData.matchingPubs.map((pub: any, index: number) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@id": `${baseUrl}${pub.url}#pub`
        }
      }))
    }
  };
}

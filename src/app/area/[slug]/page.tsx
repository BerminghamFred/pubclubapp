import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { getAreaBySlug, getIndexableAreas, getAllPubsForArea } from '@/data/areaData';
import AreaPubsGridWithPagination from '@/components/AreaPubsGridWithPagination';
import AreaMap from '@/components/AreaMap';

// Generate static params for indexable areas only
export async function generateStaticParams() {
  const indexableAreas = getIndexableAreas();
  return indexableAreas.map((area) => ({
    slug: area.slug,
  }));
}

// Generate metadata for each area page
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const area = getAreaBySlug(resolvedParams.slug);

  if (!area) {
    return {
      title: 'Area Not Found',
    };
  }

  const title = `Best Pubs in ${area.name} - Pub Club`;
  const description = `Discover the top ${area.pubCount} pubs in ${area.name}. Find the best beer gardens, traditional pubs, and modern bars with our expert guide to ${area.name}'s pub scene.`;

  return {
    title,
    description,
    robots: area.isIndexable ? 'index, follow' : 'noindex, follow',
    openGraph: {
      title,
      description,
      url: `https://pubclub.co.uk/area/${area.slug}`,
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
      canonical: `https://pubclub.co.uk/area/${area.slug}`,
    },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const area = getAreaBySlug(resolvedParams.slug);
  
  if (!area) {
    notFound();
  }
  
  // Get all pubs for this area (not just top 10)
  const allPubs = getAllPubsForArea(area.name);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
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
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Best Pubs in {area.name}
          </h1>
          
          <div className="flex items-center gap-4 text-lg text-gray-300">
            <span>{area.pubCount} pubs</span>
            <span>•</span>
            <span>Top rated venues</span>
            <span>•</span>
            <span>Expert recommendations</span>
          </div>
        </div>
      </section>

      {/* SEO Summary */}
      <section className="py-8 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed text-lg">
              {area.summary}
            </p>
          </div>
        </div>
      </section>

      {/* Top Pubs Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Best Pubs in {area.name}
          </h2>
          <p className="text-gray-600">
            Discover all {allPubs.length} pubs in {area.name}, sorted by rating and reviews
          </p>
        </div>
        
        <AreaPubsGridWithPagination pubs={allPubs} />
        </div>
      </section>

      {/* Map Section */}
      <section className="py-12 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Explore {area.name} Pubs on the Map
            </h2>
            <p className="text-gray-600">
              Find pubs near you with our interactive map
            </p>
          </div>
          
          <AreaMap area={area} />
        </div>
      </section>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateAreaSchema(area)),
        }}
      />
    </div>
  );
}

// Generate CollectionPage + ItemList + BreadcrumbList schema
function generateAreaSchema(area: any) {
  const baseUrl = "https://pubclub.co.uk";
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `Best pubs in ${area.name}`,
    "url": `${baseUrl}/area/${area.slug}`,
    "description": `Discover the top ${area.pubCount} pubs in ${area.name}. Find the best beer gardens, traditional pubs, and modern bars.`,
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
          "name": `Best pubs in ${area.name}`
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": area.topPubs.length,
      "itemListElement": area.topPubs.map((pub: any, index: number) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@id": `${baseUrl}${pub.url}#pub`
        }
      }))
    }
  };
}

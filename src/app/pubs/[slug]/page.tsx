import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pubData } from '@/data/pubData';
import { Pub } from '@/data/types';
import { generatePubSlug, extractPubIdFromSlug } from '@/utils/slugUtils';
import Link from 'next/link';

// Generate static params for all pubs
export async function generateStaticParams() {
  return pubData.map((pub) => ({
    slug: generatePubSlug(pub.name, pub.id),
  }));
}

// Generate metadata for each pub page
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const pubId = extractPubIdFromSlug(resolvedParams.slug);
  const pub = pubData.find(p => p.id === pubId);
  
  if (!pub) {
    return {
      title: 'Pub Not Found',
    };
  }

  return {
    title: `${pub.name} - Pub Club`,
    description: `${pub.description} Located in ${pub.area}. ${pub.type} with ${pub.features.join(', ')}.`,
    keywords: `${pub.name}, ${pub.area}, ${pub.type}, pub, bar, London, ${pub.features.join(', ')}`,
    openGraph: {
      title: `${pub.name} - Pub Club`,
      description: `${pub.description} Located in ${pub.area}.`,
      type: 'website',
      images: pub._internal?.photo_url ? [pub._internal.photo_url] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pub.name} - Pub Club`,
      description: `${pub.description} Located in ${pub.area}.`,
      images: pub._internal?.photo_url ? [pub._internal.photo_url] : undefined,
    },
    alternates: {
      canonical: `https://pubclub.co.uk/pubs/${generatePubSlug(pub.name, pub.id)}`,
    },
  };
}

// Generate BarOrPub schema for individual pub
function generatePubSchema(pub: Pub) {
  const baseUrl = 'https://pubclub.co.uk';
  
  // Parse opening hours from the string format
  const openingHoursSpecification = parseOpeningHours(pub.openingHours);
  
  // Map amenities to proper schema format
  const amenityFeatures = pub.amenities?.map(amenity => ({
    "@type": "LocationFeatureSpecification",
    "name": amenity,
    "value": true
  })) || [];

  return {
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    "@id": `${baseUrl}/pubs/${generatePubSlug(pub.name, pub.id)}#pub`,
    "name": pub.name,
    "description": pub.description,
    "image": pub._internal?.photo_url ? [pub._internal.photo_url] : [],
    "url": `${baseUrl}/pubs/${generatePubSlug(pub.name, pub.id)}`,
    "telephone": pub.phone || undefined,
    "priceRange": "££", // Default for now
    "address": {
      "@type": "PostalAddress",
      "streetAddress": pub.address,
      "addressLocality": pub.area,
      "addressCountry": "GB"
    },
    "geo": pub._internal?.lat && pub._internal?.lng ? {
      "@type": "GeoCoordinates",
      "latitude": pub._internal.lat,
      "longitude": pub._internal.lng
    } : undefined,
    "openingHoursSpecification": openingHoursSpecification,
    "servesCuisine": ["British", "Pub food"],
    "menu": pub.website || undefined,
    "sameAs": pub.website ? [pub.website] : [],
    "amenityFeature": amenityFeatures,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": pub.rating.toString(),
      "reviewCount": pub.reviewCount.toString()
    }
  };
}

// Parse opening hours from string format to schema format
function parseOpeningHours(hoursString: string) {
  // This is a simplified parser - you might want to enhance this
  // For now, return a basic structure
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const specifications: Array<{
    "@type": "OpeningHoursSpecification";
    "dayOfWeek": string[];
    "opens": string;
    "closes": string;
  }> = [];
  
  // Split by semicolon and parse each day
  const dayHours = hoursString.split(';');
  
  dayHours.forEach((dayHour, index) => {
    if (dayHour.trim()) {
      const match = dayHour.match(/(\w+):\s*(\d{2}:\d{2})\s*–\s*(\d{2}:\d{2})/);
      if (match) {
        specifications.push({
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [days[index]],
          "opens": match[2],
          "closes": match[3]
        });
      }
    }
  });
  
  return specifications;
}

export default async function PubPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const pubId = extractPubIdFromSlug(resolvedParams.slug);
  const pub = pubData.find(p => p.id === pubId);
  
  if (!pub) {
    notFound();
  }

  const pubSchema = generatePubSchema(pub);

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pubSchema)
        }}
      />
      
      {/* Header */}
      <section className="bg-black text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/pubs" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              ← Back to Pubs
            </Link>
            <span className="text-gray-400">|</span>
            <Link 
              href="/map-live" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              View on Map
            </Link>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{pub.name}</h1>
          <div className="flex items-center gap-4 text-lg text-gray-300">
            <span>{pub.type}</span>
            <span>•</span>
            <span>{pub.area}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              <span>{pub.rating}</span>
              <span className="text-gray-400">({pub.reviewCount} reviews)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Photo */}
            {pub._internal?.photo_url && (
              <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={pub._internal.photo_url} 
                  alt={pub.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About {pub.name}</h2>
              <p className="text-lg text-gray-600 leading-relaxed">{pub.description}</p>
            </div>
            
            {/* Features & Amenities */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Features & Amenities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pub.amenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-[#08d78c] rounded-full"></div>
                    <span className="text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Address:</span>
                  <p className="text-gray-600">{pub.address}</p>
                </div>
                {pub.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-600">{pub.phone}</p>
                  </div>
                )}
                {pub.website && (
                  <div>
                    <span className="font-medium text-gray-700">Website:</span>
                    <a 
                      href={pub.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#08d78c] hover:text-[#06b875] transition-colors"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Opening Hours */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Opening Hours</h3>
              <div className="space-y-2 text-sm">
                {pub.openingHours.split(';').map((day, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="font-medium text-gray-700">{day.split(':')[0]}:</span>
                    <span className="text-gray-600">{day.split(':').slice(1).join(':').trim()}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Rating */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Rating</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#08d78c] mb-2">{pub.rating}</div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span 
                      key={i} 
                      className={`text-2xl ${i < Math.floor(pub.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-600">{pub.reviewCount} reviews</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/map-live" 
                  className="w-full bg-[#08d78c] hover:bg-[#06b875] text-black py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-center block"
                >
                  View on Map
                </Link>
                {pub._internal?.lat && pub._internal?.lng && (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${pub._internal.lat},${pub._internal.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-center block"
                  >
                    Get Directions
                  </a>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}

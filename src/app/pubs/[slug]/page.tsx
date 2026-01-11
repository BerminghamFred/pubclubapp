import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { pubData } from '@/data/pubData';
import { generatePubSlug, extractPubIdFromSlug } from '@/utils/slugUtils';
import { getPubById } from '@/lib/services/pubService';
import Link from 'next/link';
import PubPageClient from './PubPageClient';

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
    description: pub.description,
    openGraph: {
      title: `${pub.name} - Pub Club`,
      description: pub.description,
      url: `https://pubclub.co.uk/pubs/${generatePubSlug(pub.name, pub.id)}`,
      siteName: 'Pub Club',
      images: pub._internal?.photo_url ? [
        {
          url: pub._internal.photo_url,
          width: 800,
          height: 600,
          alt: pub.name,
        }
      ] : [],
      locale: 'en_GB',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pub.name} - Pub Club`,
      description: pub.description,
      images: pub._internal?.photo_url ? [pub._internal.photo_url] : [],
    },
    alternates: {
      canonical: `https://pubclub.co.uk/pubs/${generatePubSlug(pub.name, pub.id)}`,
    },
  };
}

export default async function PubPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const pubId = extractPubIdFromSlug(resolvedParams.slug);
  
  // Try to get pub from database first (to get database ID for tracking)
  let pub = await getPubById(pubId);
  
  // Fallback to pubData if not in database
  if (!pub) {
    pub = pubData.find(p => p.id === pubId);
  }
  
  if (!pub) {
    notFound();
  }

  return (
    <>
      <PubPageClient pub={pub} />
      
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generatePubSchema(pub)),
        }}
      />
    </>
  );
}

// Generate BarOrPub schema for SEO
function generatePubSchema(pub: any) {
  const baseUrl = "https://pubclub.co.uk";
  const openingHoursSpecifications = parseOpeningHours(pub.openingHours);
  const amenityFeatures = pub.amenities?.map((amenity: string) => ({
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
      "postalCode": "SW1A 0AA", // Placeholder, ideally extracted from pub.address
      "addressCountry": "GB"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": pub._internal?.lat || 0,
      "longitude": pub._internal?.lng || 0
    },
    "openingHoursSpecification": openingHoursSpecifications,
    "servesCuisine": ["British", "Pub food"],
    "sameAs": [
      // Add social media links if available in pub data
    ],
    "amenityFeature": amenityFeatures,
    "aggregateRating": pub.rating && pub.reviewCount ? {
      "@type": "AggregateRating",
      "ratingValue": pub.rating.toString(),
      "reviewCount": pub.reviewCount.toString()
    } : undefined
  };
}

// Parse opening hours string into OpeningHoursSpecification format
function parseOpeningHours(openingHours: string) {
  if (!openingHours) return [];
  
  const specifications: Array<{ "@type": "OpeningHoursSpecification"; "dayOfWeek": string[]; "opens": string; "closes": string; }> = [];
  const dayMap: { [key: string]: string } = {
    'Monday': 'Monday',
    'Tuesday': 'Tuesday', 
    'Wednesday': 'Wednesday',
    'Thursday': 'Thursday',
    'Friday': 'Friday',
    'Saturday': 'Saturday',
    'Sunday': 'Sunday'
  };

  // Split by semicolon and parse each day
  const dayEntries = openingHours.split(';');
  
  dayEntries.forEach(entry => {
    const match = entry.match(/(\w+):\s*(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})\s*([AP]M)/);
    if (match) {
      const [, day, openTime, closeTime, period] = match;
      const dayName = dayMap[day];
      if (dayName) {
        specifications.push({
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [dayName],
          "opens": `${openTime} ${period}`,
          "closes": `${closeTime} ${period}`
        });
      }
    }
  });

  return specifications;
}

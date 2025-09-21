import Link from 'next/link';

interface Pub {
  id: string;
  name: string;
  url: string;
  image?: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  badges: string[];
}

interface AreaPubsGridProps {
  pubs: Pub[];
}

export default function AreaPubsGrid({ pubs }: AreaPubsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pubs.map((pub, index) => (
        <article 
          key={pub.id} 
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
        >
          {/* Pub Image */}
          <div className="h-48 relative overflow-hidden">
            {pub.image ? (
              <img 
                src={pub.image} 
                alt={pub.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-[#08d78c]/20 flex items-center justify-center">
                <div className="text-[#08d78c] text-4xl">🍺</div>
              </div>
            )}
            
            {/* Rank Badge */}
            <div className="absolute top-3 left-3 bg-black/80 text-white text-sm font-bold px-2 py-1 rounded-full">
              #{index + 1}
            </div>
            
            {/* Rating Badge */}
            <div className="absolute top-3 right-3 bg-[#08d78c] text-black text-sm font-bold px-2 py-1 rounded-full">
              {pub.rating.toFixed(1)}★
            </div>
          </div>
          
          {/* Pub Content */}
          <div className="p-6">
            <div className="mb-3">
              <h3 className="text-xl font-semibold text-gray-900 mb-1 line-clamp-2">
                {pub.name}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span>{pub.rating.toFixed(1)}</span>
                </span>
                <span>•</span>
                <span>{pub.reviewCount} reviews</span>
                <span>•</span>
                <span>{pub.priceRange}</span>
              </div>
            </div>
            
            {/* Amenity Badges */}
            {pub.badges.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {pub.badges.slice(0, 3).map((badge) => (
                    <span 
                      key={badge} 
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {badge}
                    </span>
                  ))}
                  {pub.badges.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      +{pub.badges.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* CTA Button */}
            <Link 
              href={pub.url}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] text-black py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-center block"
            >
              View Pub Details
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

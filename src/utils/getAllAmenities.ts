// Extract all unique amenities from pub data
import { pubData } from '@/data/pubData';

export function getAllUniqueAmenities(): string[] {
  const amenitiesSet = new Set<string>();
  
  pubData.forEach(pub => {
    if (pub.amenities && Array.isArray(pub.amenities)) {
      pub.amenities.forEach(amenity => {
        if (amenity && amenity.trim()) {
          amenitiesSet.add(amenity.trim());
        }
      });
    }
  });
  
  // Sort alphabetically for consistency
  return Array.from(amenitiesSet).sort();
}

export function getAmenitiesByCategory(): Record<string, string[]> {
  const allAmenities = getAllUniqueAmenities();
  
  // Enhanced categorization for better UX
  const categories: Record<string, string[]> = {
    '🍺 Beer & Drinks': [],
    '🍽️ Food & Dining': [],
    '🎵 Entertainment': [],
    '🎮 Games & Activities': [],
    '🌿 Outdoor & Atmosphere': [],
    '👥 Family & Accessibility': [],
    '⚡ Services & Features': [],
    '🏠 Facilities': []
  };
  
  allAmenities.forEach(amenity => {
    const lowerAmenity = amenity.toLowerCase();
    
    // Beer & Drinks
    if (lowerAmenity.includes('ale') || lowerAmenity.includes('beer') || 
        lowerAmenity.includes('cocktail') || lowerAmenity.includes('wine') ||
        lowerAmenity.includes('draught') || lowerAmenity.includes('craft') ||
        lowerAmenity.includes('real ale') || lowerAmenity.includes('lager') ||
        lowerAmenity.includes('cider') || lowerAmenity.includes('spirits') ||
        lowerAmenity.includes('whiskey') || lowerAmenity.includes('gin')) {
      categories['🍺 Beer & Drinks'].push(amenity);
    }
    // Food & Dining
    else if (lowerAmenity.includes('food') || lowerAmenity.includes('menu') ||
             lowerAmenity.includes('roast') || lowerAmenity.includes('burger') ||
             lowerAmenity.includes('pizza') || lowerAmenity.includes('fish') ||
             lowerAmenity.includes('chips') || lowerAmenity.includes('vegetarian') ||
             lowerAmenity.includes('vegan') || lowerAmenity.includes('gluten') ||
             lowerAmenity.includes('breakfast') || lowerAmenity.includes('brunch') ||
             lowerAmenity.includes('snack') || lowerAmenity.includes('bargain') ||
             lowerAmenity.includes('bring your own')) {
      categories['🍽️ Food & Dining'].push(amenity);
    }
    // Entertainment
    else if (lowerAmenity.includes('music') || lowerAmenity.includes('dj') || 
             lowerAmenity.includes('karaoke') || lowerAmenity.includes('quiz') ||
             lowerAmenity.includes('live') || lowerAmenity.includes('band') ||
             lowerAmenity.includes('singer') || lowerAmenity.includes('acoustic') ||
             lowerAmenity.includes('jukebox') || lowerAmenity.includes('dance floor') ||
             lowerAmenity.includes('dancing') || lowerAmenity.includes('entertainment')) {
      categories['🎵 Entertainment'].push(amenity);
    }
    // Games & Activities
    else if (lowerAmenity.includes('sports') || lowerAmenity.includes('pool') ||
             lowerAmenity.includes('dart') || lowerAmenity.includes('game') ||
             lowerAmenity.includes('billiards') || lowerAmenity.includes('snooker') ||
             lowerAmenity.includes('arcade') || lowerAmenity.includes('machine') ||
             lowerAmenity.includes('board games') || lowerAmenity.includes('beer pong') ||
             lowerAmenity.includes('foosball') || lowerAmenity.includes('table football')) {
      categories['🎮 Games & Activities'].push(amenity);
    }
    // Outdoor & Atmosphere
    else if (lowerAmenity.includes('garden') || lowerAmenity.includes('outdoor') || 
             lowerAmenity.includes('rooftop') || lowerAmenity.includes('riverside') ||
             lowerAmenity.includes('fireplace') || lowerAmenity.includes('sofa') ||
             lowerAmenity.includes('booth') || lowerAmenity.includes('late') ||
             lowerAmenity.includes('heated') || lowerAmenity.includes('patio') ||
             lowerAmenity.includes('terrace') || lowerAmenity.includes('balcony') ||
             lowerAmenity.includes('smoking') || lowerAmenity.includes('covered')) {
      categories['🌿 Outdoor & Atmosphere'].push(amenity);
    }
    // Family & Accessibility
    else if (lowerAmenity.includes('friendly') || lowerAmenity.includes('accessible') || 
             lowerAmenity.includes('child') || lowerAmenity.includes('kids') ||
             lowerAmenity.includes('family') || lowerAmenity.includes('disabled') ||
             lowerAmenity.includes('wheelchair') || lowerAmenity.includes('dog') ||
             lowerAmenity.includes('pet') || lowerAmenity.includes('baby') ||
             lowerAmenity.includes('highchair') || lowerAmenity.includes('changing')) {
      categories['👥 Family & Accessibility'].push(amenity);
    }
    // Services & Features
    else if (lowerAmenity.includes('wifi') || lowerAmenity.includes('free wifi') ||
             lowerAmenity.includes('wifi') || lowerAmenity.includes('internet') ||
             lowerAmenity.includes('sky sports') || lowerAmenity.includes('bt sport') ||
             lowerAmenity.includes('television') || lowerAmenity.includes('tv') ||
             lowerAmenity.includes('screening') || lowerAmenity.includes('match') ||
             lowerAmenity.includes('delivery') || lowerAmenity.includes('takeaway') ||
             lowerAmenity.includes('booking') || lowerAmenity.includes('reservation')) {
      categories['⚡ Services & Features'].push(amenity);
    }
    // Facilities
    else if (lowerAmenity.includes('parking') || lowerAmenity.includes('car park') ||
             lowerAmenity.includes('toilet') || lowerAmenity.includes('bathroom') ||
             lowerAmenity.includes('heating') || lowerAmenity.includes('air conditioning') ||
             lowerAmenity.includes('ac') || lowerAmenity.includes('heating') ||
             lowerAmenity.includes('locker') || lowerAmenity.includes('storage') ||
             lowerAmenity.includes('kitchen') || lowerAmenity.includes('bar') ||
             lowerAmenity.includes('counter') || lowerAmenity.includes('seating')) {
      categories['🏠 Facilities'].push(amenity);
    }
    // Default to Services & Features for uncategorized items
    else {
      categories['⚡ Services & Features'].push(amenity);
    }
  });
  
  // Sort amenities within each category alphabetically
  Object.keys(categories).forEach(category => {
    categories[category].sort();
  });
  
  // Remove empty categories
  Object.keys(categories).forEach(category => {
    if (categories[category].length === 0) {
      delete categories[category];
    }
  });
  
  return categories;
}

export function getAmenityStats(): { total: number, used: number, unused: number } {
  const allAmenities = getAllUniqueAmenities();
  const usedAmenities = new Set<string>();
  
  pubData.forEach(pub => {
    if (pub.amenities) {
      pub.amenities.forEach(amenity => usedAmenities.add(amenity));
    }
  });
  
  return {
    total: allAmenities.length,
    used: usedAmenities.size,
    unused: allAmenities.length - usedAmenities.size
  };
}

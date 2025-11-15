export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllAreas } from '@/data/areaData';
import { AMENITY_FILTERS } from '@/data/amenityData';
import { pubData } from '@/data/pubData';

// Get all homepage slots
export async function GET(request: NextRequest) {
  try {
    const slots = await prisma.homepageSlot.findMany({
      where: { isActive: true },
      orderBy: [
        { position: 'asc' },
        { score: 'desc' }
      ]
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Error fetching homepage slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage slots' },
      { status: 500 }
    );
  }
}

// Create or update homepage slots
export async function POST(request: NextRequest) {
  try {
    console.log('POST request received for homepage slots');
    const body = await request.json();
    const { action, slots } = body;
    console.log('Action:', action);

    if (action === 'regenerate') {
      console.log('Starting regeneration...');
      await regenerateHomepageSlots();
      console.log('Regeneration completed');
      return NextResponse.json({ message: 'Homepage slots regenerated successfully' });
    }

    if (action === 'set_slots') {
      console.log('Setting homepage slots:', slots);
      await setHomepageSlots(slots);
      console.log('Slots set successfully');
      return NextResponse.json({ message: 'Homepage slots set successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating homepage slots:', error);
    return NextResponse.json(
      { error: `Failed to update homepage slots: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Set homepage slots manually
async function setHomepageSlots(slots: any[]) {
  try {
    console.log('Setting homepage slots:', slots.length);
    
    // Clear existing slots
    await prisma.homepageSlot.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    
    // Insert new slots
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      
      // Try to find existing slot
      const existingSlot = await prisma.homepageSlot.findFirst({
        where: {
          areaSlug: slot.areaSlug,
          amenitySlug: slot.amenitySlug
        }
      });
      
      if (existingSlot) {
        // Update existing slot
        await prisma.homepageSlot.update({
          where: { id: existingSlot.id },
          data: {
            title: slot.title,
            subtitle: slot.subtitle,
            href: slot.href,
            icon: slot.icon,
            pubCount: slot.pubCount,
            score: slot.score,
            isSeasonal: slot.isSeasonal,
            isActive: true,
            position: slot.position,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new slot
        await prisma.homepageSlot.create({
          data: {
            ...slot,
            isActive: true
          }
        });
      }
    }
    
    console.log('Homepage slots set successfully');
  } catch (error) {
    console.error('Error setting homepage slots:', error);
    throw error;
  }
}

// Regenerate homepage slots with scoring logic
async function regenerateHomepageSlots() {
  try {
    console.log('Starting homepage slots regeneration...');
    
    // Get all candidate combinations
    const candidates = generateCandidateSlots();
    console.log(`Generated ${candidates.length} candidates`);
    
    if (candidates.length === 0) {
      console.log('No candidates generated, using fallback slots');
      // Use the same slots as the seed script
      const fallbackSlots = [
        {
          areaSlug: 'wandsworth',
          amenitySlug: 'dog-friendly',
          title: 'Dog Friendly Pubs in Wandsworth',
          subtitle: 'Pubs where your furry friend is welcome',
          href: '/area/wandsworth/dog-friendly',
          icon: '🐕',
          pubCount: 12,
          score: 0.95,
          isSeasonal: false
        },
        {
          areaSlug: 'sutton',
          amenitySlug: 'cocktails',
          title: 'Cocktails in Sutton',
          subtitle: 'Creative drinks & mixology',
          href: '/area/sutton/cocktails',
          icon: '🍸',
          pubCount: 12,
          score: 0.92,
          isSeasonal: false
        },
        {
          areaSlug: 'croydon',
          amenitySlug: 'real-ale-craft-beer',
          title: 'Real Ale & Craft Beer in Croydon',
          subtitle: 'Local brews & independent taps',
          href: '/area/croydon/real-ale-craft-beer',
          icon: '🍺',
          pubCount: 15,
          score: 0.89,
          isSeasonal: false
        },
        {
          areaSlug: 'bromley',
          amenitySlug: 'food-served',
          title: 'Great Food in Bromley',
          subtitle: 'Delicious meals & pub classics',
          href: '/area/bromley/food-served',
          icon: '🍽️',
          pubCount: 18,
          score: 0.87,
          isSeasonal: false
        },
        {
          areaSlug: 'kingston-upon-thames',
          amenitySlug: 'cocktails',
          title: 'Cocktails in Kingston upon Thames',
          subtitle: 'Creative drinks & mixology',
          href: '/area/kingston-upon-thames/cocktails',
          icon: '🍸',
          pubCount: 6,
          score: 0.85,
          isSeasonal: false
        },
        {
          areaSlug: 'sutton',
          amenitySlug: 'live-music',
          title: 'Live Music in Sutton',
          subtitle: 'Bands, DJs & acoustic nights',
          href: '/area/sutton/live-music',
          icon: '🎵',
          pubCount: 10,
          score: 0.83,
          isSeasonal: false
        }
      ];
      
      // Clear existing slots
      await prisma.homepageSlot.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      
      // Insert fallback slots
      for (let i = 0; i < fallbackSlots.length; i++) {
        const slot = fallbackSlots[i];
        
        // Try to find existing slot
        const existingSlot = await prisma.homepageSlot.findFirst({
          where: {
            areaSlug: slot.areaSlug,
            amenitySlug: slot.amenitySlug
          }
        });
        
        if (existingSlot) {
          // Update existing slot
          await prisma.homepageSlot.update({
            where: { id: existingSlot.id },
            data: {
              title: slot.title,
              subtitle: slot.subtitle,
              href: slot.href,
              icon: slot.icon,
              pubCount: slot.pubCount,
              score: slot.score,
              isSeasonal: slot.isSeasonal,
              isActive: true,
              position: i + 1,
              updatedAt: new Date()
            }
          });
        } else {
          // Create new slot
          await prisma.homepageSlot.create({
            data: {
              ...slot,
              position: i + 1
            }
          });
        }
      }
      return;
    }
    
    // Score each candidate
    const scoredCandidates = await scoreCandidates(candidates);
    console.log(`Scored ${scoredCandidates.length} candidates`);
    
    // Apply diversity rules
    const diversifiedSlots = applyDiversityRules(scoredCandidates);
    console.log(`Applied diversity rules, ${diversifiedSlots.length} slots remaining`);
    
    // Take top 6 for homepage
    const topSlots = diversifiedSlots.slice(0, 6);
    console.log(`Selected top ${topSlots.length} slots`);
    
    // Clear existing slots
    await prisma.homepageSlot.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    
    // Insert new slots
    for (let i = 0; i < topSlots.length; i++) {
      const slot = topSlots[i];
      
      // Try to find existing slot
      const existingSlot = await prisma.homepageSlot.findFirst({
        where: {
          areaSlug: slot.areaSlug,
          amenitySlug: slot.amenitySlug
        }
      });
      
      if (existingSlot) {
        // Update existing slot
        await prisma.homepageSlot.update({
          where: { id: existingSlot.id },
          data: {
            title: slot.title,
            subtitle: slot.subtitle,
            href: slot.href,
            icon: slot.icon,
            pubCount: slot.pubCount,
            score: slot.score,
            isSeasonal: slot.isSeasonal,
            isActive: true,
            position: i + 1,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new slot
        await prisma.homepageSlot.create({
          data: {
            ...slot,
            position: i + 1
          }
        });
      }
    }
    
    console.log('Homepage slots regeneration completed successfully');
  } catch (error) {
    console.error('Error in regenerateHomepageSlots:', error);
    throw error;
  }
}

// Generate all possible candidate slots
function generateCandidateSlots() {
  const candidates: any[] = [];
  const allAreas = getAllAreas();
  console.log(`Found ${allAreas.length} total areas`);
  
  // Areas with >= 10 pubs
  const validAreas = allAreas.filter(area => area.pubCount >= 10);
  console.log(`Found ${validAreas.length} valid areas with >= 10 pubs`);
  
  for (const area of validAreas) {
    // Skip area-only slots for now - we only want area x amenity combinations
    // that have corresponding pages
    
    // Add area + amenity combinations for amenities that have corresponding pages
    // Only use the top 10 amenities that have actual area x amenity pages
    const commonAmenities = AMENITY_FILTERS.map(amenity => amenity.slug);
    console.log(`Checking ${commonAmenities.length} amenities for area ${area.name}`);
    
    for (const amenitySlug of commonAmenities) {
      const matchingPubs = pubData.filter(pub => 
        pub.area === area.name && 
        pubMatchesAmenity(pub, amenitySlug)
      );
      
      if (matchingPubs.length >= 3) {
        console.log(`Found ${matchingPubs.length} pubs for ${area.name} + ${amenitySlug}`);
        candidates.push({
          areaSlug: area.slug,
          amenitySlug: amenitySlug,
          areaName: area.name,
          amenityTitle: amenitySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          pubCount: matchingPubs.length
        });
      }
    }
  }
  
  return candidates;
}

// Check if a pub matches an amenity filter
function pubMatchesAmenity(pub: any, amenitySlug: string): boolean {
  if (!pub.amenities) return false;
  
  // Find the amenity filter for this slug
  const amenityFilter = AMENITY_FILTERS.find(a => a.slug === amenitySlug);
  if (!amenityFilter) {
    console.log(`No amenity filter found for slug: ${amenitySlug}`);
    return false;
  }
  
  // Check if any pub amenity matches the search terms
  const matches = pub.amenities.some((amenityName: string) => 
    amenityFilter.searchTerms.some((term: string) => 
      amenityName.toLowerCase().includes(term.toLowerCase())
    )
  );
  
  if (matches) {
    console.log(`Pub ${pub.name} matches ${amenitySlug} with amenities: ${pub.amenities.join(', ')}`);
  }
  
  return matches;
}

// Score candidates based on the formula
async function scoreCandidates(candidates: any[]) {
  const scoredCandidates = [];
  
  for (const candidate of candidates) {
    // Get analytics data for this candidate
    const analytics = await getAnalyticsForCandidate(candidate);
    
    // Calculate score components
    const ctr7d = analytics.ctr7d || 0;
    const pageviews7dNorm = normalizeValue(analytics.pageviews7d, 0, 1000);
    const bookings7dNorm = normalizeValue(analytics.bookings7d, 0, 50);
    const pubCountNorm = normalizeValue(candidate.pubCount, 3, 100);
    const seasonalBoost = getSeasonalBoost(candidate.amenitySlug);
    
    // Calculate final score
    const score = 
      0.45 * ctr7d +
      0.25 * pageviews7dNorm +
      0.15 * bookings7dNorm +
      0.10 * pubCountNorm +
      0.05 * seasonalBoost;
    
    // Generate tile data
    const tile = {
      ...candidate,
      title: candidate.amenityTitle 
        ? `Best ${candidate.amenityTitle} in ${candidate.areaName}`
        : `Best Pubs in ${candidate.areaName}`,
      subtitle: candidate.amenityTitle 
        ? getAmenitySubtitle(candidate.amenitySlug)
        : `Discover the best pubs in ${candidate.areaName}`,
      href: candidate.amenitySlug 
        ? `/area/${candidate.areaSlug}/${candidate.amenitySlug}`
        : `/area/${candidate.areaSlug}`,
      icon: candidate.amenitySlug 
        ? getAmenityIcon(candidate.amenitySlug)
        : '🍺',
      score,
      isSeasonal: seasonalBoost > 0
    };
    
    scoredCandidates.push(tile);
  }
  
  return scoredCandidates.sort((a, b) => b.score - a.score);
}

// Get analytics data for a candidate (placeholder - would connect to real analytics)
async function getAnalyticsForCandidate(candidate: any) {
  // For now, return mock data
  // In production, this would query your analytics system
  return {
    ctr7d: Math.random() * 0.1, // 0-10% CTR
    pageviews7d: Math.floor(Math.random() * 500), // 0-500 pageviews
    bookings7d: Math.floor(Math.random() * 25) // 0-25 bookings
  };
}

// Normalize value between 0 and 1
function normalizeValue(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Get seasonal boost for amenity
function getSeasonalBoost(amenitySlug: string | null): number {
  if (!amenitySlug) return 0;
  
  const month = new Date().getMonth() + 1; // 1-12
  
  // Summer (June-August)
  if (month >= 6 && month <= 8) {
    if (['beer-garden', 'rooftop', 'riverside'].includes(amenitySlug)) return 0.2;
  }
  
  // Autumn/Winter (September-February)
  if (month >= 9 || month <= 2) {
    if (['sunday-roast', 'fireplace', 'open-late'].includes(amenitySlug)) return 0.2;
  }
  
  // Spring (March-May)
  if (month >= 3 && month <= 5) {
    if (['beer-garden', 'riverside'].includes(amenitySlug)) return 0.15;
  }
  
  return 0;
}

// Apply diversity rules
function applyDiversityRules(slots: any[]) {
  const diversified: any[] = [];
  const areaCounts = new Map<string, number>();
  const amenityCounts = new Map<string, number>();
  const maxPerArea = 2;
  const minAmenities = 3;
  
  for (const slot of slots) {
    const areaCount = areaCounts.get(slot.areaSlug) || 0;
    const amenityCount = amenityCounts.get(slot.amenitySlug || 'none') || 0;
    
    // Apply diversity rules
    if (areaCount < maxPerArea && amenityCount < 3) {
      diversified.push(slot);
      areaCounts.set(slot.areaSlug, areaCount + 1);
      amenityCounts.set(slot.amenitySlug || 'none', amenityCount + 1);
    }
    
    // Stop when we have enough slots
    if (diversified.length >= 12) break;
  }
  
  // Ensure we have at least minAmenities different amenities
  const uniqueAmenities = new Set(diversified.map(s => s.amenitySlug).filter(Boolean));
  if (uniqueAmenities.size < minAmenities) {
    // Add more slots with different amenities
    for (const slot of slots) {
      if (slot.amenitySlug && !uniqueAmenities.has(slot.amenitySlug) && diversified.length < 12) {
        diversified.push(slot);
        uniqueAmenities.add(slot.amenitySlug);
      }
    }
  }
  
  return diversified;
}

// Get amenity subtitle
function getAmenitySubtitle(amenitySlug: string): string {
  const amenityFilter = AMENITY_FILTERS.find(a => a.slug === amenitySlug);
  if (amenityFilter) {
    return amenityFilter.description;
  }
  
  // Fallback subtitles for amenities that have pages
  const subtitles: Record<string, string> = {
    'sunday-roast': 'Traditional Sunday dinners',
    'dog-friendly': 'Pubs where your furry friend is welcome',
    'beer-garden': 'Sunny terraces & cold pints',
    'sky-sports': 'Watch the game with great atmosphere',
    'bottomless-brunch': 'Unlimited drinks & brunch classics',
    'cocktails': 'Creative drinks & mixology',
    'pub-quiz': 'Test your knowledge & win prizes',
    'live-music': 'Bands, DJs & acoustic nights',
    'real-ale-craft-beer': 'Local brews & independent taps',
    'pool-table-darts': 'Games, competition & social fun'
  };
  
  return subtitles[amenitySlug] || 'Great pubs with this feature';
}

// Get amenity icon
function getAmenityIcon(amenitySlug: string): string {
  // Icons for amenities that have corresponding pages
  const icons: Record<string, string> = {
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

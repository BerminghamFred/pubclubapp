/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug for a pub using name and ID
 */
export function generatePubSlug(name: string, id: string): string {
  const nameSlug = generateSlug(name);
  const shortId = id.substring(0, 8); // Use first 8 chars of ID for uniqueness
  return `${nameSlug}-${shortId}`;
}

/**
 * Extract pub ID from slug
 */
export function extractPubIdFromSlug(slug: string): string | null {
  // If slug contains a hyphen, try to extract the ID part
  const parts = slug.split('-');
  if (parts.length > 1) {
    const possibleId = parts[parts.length - 1];
    // Check if it looks like a Google Place ID (starts with ChIJ)
    if (possibleId.startsWith('ChIJ') || possibleId.length >= 8) {
      return possibleId;
    }
  }
  
  // If no hyphen, assume the whole slug is the ID
  return slug;
}

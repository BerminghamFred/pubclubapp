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
  // Keep underscores in the ID, only replace other special chars
  const cleanId = id.replace(/[^\w_]/g, '-');
  return `${nameSlug}-${cleanId}`;
}

/**
 * Extract pub ID from slug
 */
export function extractPubIdFromSlug(slug: string): string | null {
  // Look for Google Place ID pattern (ChIJ followed by alphanumeric characters, underscores, and hyphens)
  const match = slug.match(/(ChIJ[a-zA-Z0-9_-]+)/);
  if (match) {
    // Keep the ID as-is (underscores should already be preserved)
    return match[1];
  }
  
  // Fallback: if no Google Place ID found, return the original slug
  return slug;
}

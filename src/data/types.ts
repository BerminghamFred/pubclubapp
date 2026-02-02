export interface Pub {
  id: string;
  name: string;
  description: string;
  area: string;
  type: string;
  features: string[];
  rating: number;
  reviewCount: number;
  address: string;
  phone?: string;
  website?: string;
  openingHours: string;
  amenities?: string[]; // New field for amenities
  manager_email?: string; // Pub manager's email for login
  manager_password?: string; // Hashed password for authentication
  last_updated?: string; // ISO timestamp of last update
  updated_by?: string; // Track who made the last change ('admin' or 'manager')
  _internal?: {
    place_id?: string;
    lat?: number;
    lng?: number;
    types?: string;
    photo_url?: string;
    photo_reference?: string; // Google Places photo reference for caching
    photo_name?: string; // Google Places new Photos API resource name
    uploadedCoverPhotoUrl?: string; // Manager-uploaded cover (e.g. /uploads/pubId/filename.jpg)
  };
} 
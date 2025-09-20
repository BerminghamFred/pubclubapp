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
  _internal?: {
    place_id?: string;
    lat?: number;
    lng?: number;
    types?: string;
    photo_url?: string;
  };
} 
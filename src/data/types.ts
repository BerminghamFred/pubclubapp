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
    lat?: number;
    lng?: number;
    photo_url?: string;
  };
} 
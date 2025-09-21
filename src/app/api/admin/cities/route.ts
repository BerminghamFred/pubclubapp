import { NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';

export async function GET() {
  try {
    // Extract unique areas from your pub data
    const uniqueAreas = [...new Set(pubData.map(pub => pub.area).filter(Boolean))];
    
    // Create cities structure based on your areas
    const cities = uniqueAreas.map((area, index) => ({
      id: index + 1,
      name: area,
      boroughs: [
        {
          id: index + 1,
          name: area,
          cityId: index + 1,
        }
      ]
    }));

    // Add a default "All Areas" option
    cities.unshift({
      id: 0,
      name: 'All Areas',
      boroughs: []
    });

    return NextResponse.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

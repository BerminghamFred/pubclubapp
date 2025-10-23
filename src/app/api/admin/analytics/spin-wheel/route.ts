import { NextRequest, NextResponse } from 'next/server';

// Temporary stub endpoint: remove analytics dependencies to unblock deploy
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  // Return empty/zeroed analytics structure
  const response = {
    overview: {
      totalSpins: 0,
      totalSpinOpens: 0,
      totalViewPubClicks: 0,
      totalDirectionsClicks: 0,
      totalSpinAgains: 0,
      spinToViewPubRate: 0,
      spinToDirectionsRate: 0,
      spinAgainRate: 0,
    },
    spinsByDay: [],
    topPubsBySpins: [],
    period: {
      days,
      startDate: new Date(Date.now() - days * 86400000).toISOString(),
      endDate: new Date().toISOString(),
    },
  };

  return NextResponse.json(response);
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the regeneration API
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/homepage-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'regenerate' }),
    });

    if (response.ok) {
      return NextResponse.json({ 
        message: 'Homepage slots regenerated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Failed to regenerate slots');
    }
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate homepage slots' },
      { status: 500 }
    );
  }
}

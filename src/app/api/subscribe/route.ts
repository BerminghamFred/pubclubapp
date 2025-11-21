export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Email validation schema
const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = subscribeSchema.parse(body);

    // Check if email already exists
    const existing = await prisma.blogSubscription.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'You\'re already subscribed! Thanks for your interest.' 
        },
        { status: 200 }
      );
    }

    // Save to database
    await prisma.blogSubscription.create({
      data: {
        email: email.toLowerCase().trim(),
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Thanks for subscribing! We\'ll be in touch soon.' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Subscription error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: (error.issues && error.issues.length > 0) ? error.issues[0].message : 'Invalid input'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Something went wrong. Please try again.' 
      },
      { status: 500 }
    );
  }
}

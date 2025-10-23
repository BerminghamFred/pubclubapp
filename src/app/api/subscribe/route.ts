import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Email validation schema
const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = subscribeSchema.parse(body);

    // TODO: Integrate with your email service (Mailchimp, ConvertKit, etc.)
    // For now, we'll just log the subscription
    console.log('New email subscription:', email);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

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

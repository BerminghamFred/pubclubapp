import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find pub by manager email
    const pub = pubData.find(p => 
      p.manager_email && p.manager_email.toLowerCase() === email.toLowerCase()
    );

    if (!pub) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if pub has a password set
    if (!pub.manager_password) {
      return NextResponse.json(
        { success: false, message: 'No password set for this pub. Please contact Pub Club support.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, pub.manager_password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        pubId: pub.id,
        pubName: pub.name,
        email: pub.manager_email,
        type: 'pub-manager'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      pubId: pub.id,
      pubName: pub.name,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

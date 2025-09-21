import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface PubManagerToken {
  pubId: string;
  pubName: string;
  email: string;
  type: 'pub-manager';
  iat: number;
  exp: number;
}

export function verifyPubManagerToken(token: string): PubManagerToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as PubManagerToken;
    
    // Verify the pub still exists and has manager access
    const pub = pubData.find(p => p.id === decoded.pubId);
    if (!pub || !pub.manager_email || pub.manager_email.toLowerCase() !== decoded.email.toLowerCase()) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

export function getPubManagerFromRequest(request: NextRequest): { pub: any; token: PubManagerToken } | null {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // If no header token, try to get from cookies (for server-side rendering)
  if (!token) {
    const cookieToken = request.cookies.get('pub-manager-token')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    return null;
  }

  const decodedToken = verifyPubManagerToken(token);
  if (!decodedToken) {
    return null;
  }

  const pub = pubData.find(p => p.id === decodedToken.pubId);
  if (!pub) {
    return null;
  }

  return { pub, token: decodedToken };
}

export function createPubManagerResponse(data: any, token?: string): Response {
  const response = NextResponse.json(data);
  
  // Set httpOnly cookie for better security (optional)
  if (token) {
    response.cookies.set('pub-manager-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  return response;
}

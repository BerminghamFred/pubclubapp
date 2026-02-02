import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const runtime = "nodejs";

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
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function getPubManagerFromRequest(request: NextRequest): Promise<{ pub: any; token: PubManagerToken; pubs: any[] } | null> {
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

  const emailLower = decodedToken.email.toLowerCase();

  // Find manager in database (optional – used when manager is linked via admin)
  const manager = await prisma.manager.findUnique({
    where: { email: emailLower },
    include: {
      pubs: {
        include: {
          pub: true
        }
      }
    }
  });

  // Find the specific pub from token
  const pub = await prisma.pub.findUnique({
    where: { id: decodedToken.pubId },
    include: {
      amenities: {
        include: {
          amenity: true
        }
      },
      photos: true,
      city: true,
      borough: true
    }
  });

  if (!pub) {
    return null;
  }

  // If manager exists and is linked to this pub, use manager's accessible pubs
  if (manager) {
    const hasAccess = manager.pubs.some(pm => pm.pubId === pub.id);
    if (hasAccess) {
      const accessiblePubs = manager.pubs.map(pm => pm.pub);
      return { pub, token: decodedToken, pubs: accessiblePubs };
    }
  }

  // Fallback: pub-only login (no Manager record) – token was issued from Pub.managerEmail + managerPassword
  if (pub.managerEmail?.toLowerCase() === emailLower) {
    return { pub, token: decodedToken, pubs: [pub] };
  }

  return null;
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

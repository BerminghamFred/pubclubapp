import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for the admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // For now, we'll use a simple query parameter check
    // In production, you'd want proper authentication (JWT, session, etc.)
    const authToken = request.nextUrl.searchParams.get('token');
    
    // Simple token check - in production use proper authentication
    if (authToken !== 'pubclub2024') {
      // Redirect to a login page or show access denied
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
}; 
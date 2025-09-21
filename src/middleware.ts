import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  // Check if the request is for a pub manager route
  if (request.nextUrl.pathname.startsWith('/pub-manager')) {
    // For now, just pass through - authentication will be handled by individual pages
    return NextResponse.next();
  }

  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }

    // Check if user is admin type
    if (token.type !== 'admin') {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }

    // Check role-based access
    const path = request.nextUrl.pathname;
    
    // Analytics routes require analytics_viewer or higher
    if (path.startsWith('/admin/analytics')) {
      const allowedRoles = ['superadmin', 'content_admin', 'analytics_viewer'];
      if (!allowedRoles.includes(token.role as string)) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }

    // Pubs management requires content_admin or higher (temporarily allowing all admin roles)
    if (path.startsWith('/admin/pubs') || path.startsWith('/admin/managers')) {
      const allowedRoles = ['superadmin', 'content_admin', 'analytics_viewer', 'support'];
      if (!allowedRoles.includes(token.role as string)) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/pub-manager/:path*',
    '/admin/:path*',
  ],
}; 
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Backend auth uses HttpOnly cookies:
  // - om_access: short-lived access token
  // - om_refresh: long-lived refresh token
  // The frontend must NOT rely on a legacy client-set `auth_token` cookie.
  const hasAccess = !!request.cookies.get('om_access')?.value;
  const hasRefresh = !!request.cookies.get('om_refresh')?.value;
  const hasSession = hasAccess || hasRefresh;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If user is not authenticated and trying to access protected routes
  if (!hasSession && !isPublicRoute) {
    const url = new URL('/auth', request.url);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access auth page, redirect to chat
  if (hasSession && pathname === '/auth') {
    const url = new URL('/chat', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

// Paths that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/apply',
  '/api/v1/ingest',
  '/icon.svg',
  '/favicon.ico',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow internal Next.js assets and public static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // file with extension e.g. png, svg, webp
  ) {
    return NextResponse.next();
  }

  // 2. Allow explicitly whitelisted public routes
  const isPublicPath = PUBLIC_PATHS.some(pub => pathname === pub || pathname.startsWith(pub + '/'));
  if (isPublicPath) {
    // If user is already authenticated and visits /login, redirect directly to console
    if (pathname === '/login') {
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (sessionCookie) {
        const { valid } = await verifySessionToken(sessionCookie);
        if (valid) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 3. Verify session token for all other protected routes
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { valid } = await verifySessionToken(sessionToken);

  if (!valid) {
    // If it's an API route, return 401 Unauthorized JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Executive session required to access NetworkOS data.' },
        { status: 401 }
      );
    }

    // For web console pages, redirect to login portal
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.svg (icon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
  ],
};

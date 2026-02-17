import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Session marker cookie name.
 * Set by the auth context on sign-in, cleared on sign-out.
 * This is NOT a security boundary — full JWT verification happens in API route handlers.
 * The proxy only prevents unauthenticated users from seeing a flash of dashboard UI.
 */
const SESSION_COOKIE = 'gg-session';

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/login', '/unauthorized', '/auth/callback'];

/** Path prefixes that are always public */
const PUBLIC_PREFIXES = ['/api/webhooks/', '/_next/', '/backgrounds/'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and public paths — always pass through
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // API routes — pass through (full auth in route handlers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Dashboard routes — check for session marker cookie
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - backgrounds/ (public assets)
     * - *.svg, *.png, *.jpg, *.ico, *.webp
     */
    '/((?!_next/static|_next/image|favicon.ico|backgrounds|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)',
  ],
};

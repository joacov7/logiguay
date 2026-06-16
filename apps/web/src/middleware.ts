import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = ['/login', '/register', '/', '/forgot-password', '/reset-password'];
const LOCALES = ['es', 'en', 'pt'];

function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const bare = stripLocale(pathname);

  const isPublic = PUBLIC_PATHS.some(
    (path) => bare === path || bare.startsWith(`${path}/`),
  );

  const token = request.cookies.get('accessToken')?.value;

  if (!isPublic && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && (bare === '/login' || bare === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};

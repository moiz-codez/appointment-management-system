import { NextResponse, type NextRequest } from 'next/server';
import { decrypt, ROLE_HOME, SESSION_COOKIE } from '@/lib/auth/session';
import type { Role } from '@/lib/db/schema';

// Redirects only (CLAUDE.md §5). Every action/route still runs requireRole itself.
const AUTH_PAGES = ['/login', '/register'];
const PUBLIC_PREFIXES = ['/display', '/api'];
const AREAS: Role[] = ['customer', 'staff', 'manager', 'admin'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!session) return AUTH_PAGES.includes(pathname) ? NextResponse.next() : to('/login');

  const home = ROLE_HOME[session.role];
  if (pathname === '/' || AUTH_PAGES.includes(pathname)) return to(home);

  const area = pathname.split('/')[1] as Role;
  if (AREAS.includes(area) && area !== session.role) return to(home);

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

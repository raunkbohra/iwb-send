import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Middleware: Check session, inject correlation ID
 */
export async function middleware(request: NextRequest) {
  const correlationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);

  // TODO: Add session validation when NextAuth is configured
  // const session = await auth();
  // if (!session && !request.nextUrl.pathname.startsWith('/auth')) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url));
  // }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

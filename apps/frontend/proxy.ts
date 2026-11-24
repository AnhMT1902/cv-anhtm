import { type NextRequest, NextResponse } from 'next/server';
import { selectLocale } from './app/public-cv';

export function proxy(request: NextRequest) {
  const query = request.nextUrl.searchParams.getAll('lang');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-cv-locale', selectLocale(query.length === 1 ? query[0] : undefined));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: '/' };

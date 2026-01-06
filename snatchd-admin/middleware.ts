import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Client-side auth check is handled in DashboardLayout
  // This middleware is a basic layer, but Firebase Auth requires client-side verification
  // The real protection happens in the dashboard layout component
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Các route không cần authentication
  const publicRoutes = ['/login', '/register', '/', '/verify-email'];

  // Nếu đã đăng nhập và truy cập trang login/register, redirect về chat
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // Nếu chưa đăng nhập và truy cập protected routes, redirect về login
  if (!token && !publicRoutes.includes(pathname) && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
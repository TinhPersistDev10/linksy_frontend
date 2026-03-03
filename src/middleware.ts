// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get('accessToken')?.value;

  const isLoginOrRegister = pathname === '/login' || pathname === '/register';
  const isPublicRoute = ['/', '/login', '/register', '/verify-email', '/forgot-password']
    .some(route => pathname.startsWith(route));

  // Đã đăng nhập + vào login/register → redirect dashboard
  if (accessToken && isLoginOrRegister) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Chưa đăng nhập + vào protected route → redirect login
  // Đồng thời xóa cookie ngay tại middleware để tránh race condition
  if (!accessToken && !isPublicRoute && !pathname.startsWith('/_next')) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    
    // Xóa tất cả auth cookies còn sót lại
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: false, // false cho localhost
      sameSite: 'strict',
      path: '/',
      expires: new Date(0),
    });
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
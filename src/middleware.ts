// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const hasAuthCookie = Boolean(accessToken || refreshToken);

  const isLoginOrRegister = pathname === "/login" || pathname === "/register";
  const isPublicRoute = [
    "/",
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
  ].some((route) => pathname.startsWith(route));

  if (accessToken && isLoginOrRegister) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!hasAuthCookie && !isPublicRoute && !pathname.startsWith("/_next")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

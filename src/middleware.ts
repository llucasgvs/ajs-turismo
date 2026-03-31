import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const isAdmin = request.cookies.get("ajs_admin")?.value === "1";

  if (!isAdmin) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

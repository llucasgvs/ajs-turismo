import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Exige o flag de admin E a presença do token real - o flag sozinho era
  // forjável. A verificação de is_admin definitiva continua no layout do admin
  // (client) e em toda a API (server), que recusa tokens não-admin.
  const isAdmin = request.cookies.get("ajs_admin")?.value === "1";
  const hasToken = !!request.cookies.get("ajs_token")?.value;

  if (!isAdmin || !hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

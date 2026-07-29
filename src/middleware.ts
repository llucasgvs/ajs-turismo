import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** /viagens/395 (formato antigo, id da data) -> /viagens/costao-do-santinho-sc */
async function redirecionaLinkAntigo(request: NextRequest) {
  const id = request.nextUrl.pathname.split("/")[2];
  if (!/^\d+$/.test(id)) return NextResponse.next();

  try {
    const r = await fetch(`${API}/trips/${id}`);
    if (!r.ok) return NextResponse.next(); // deixa a página tratar (404)
    const trip = await r.json();
    if (!trip?.slug) return NextResponse.next();

    const destino = new URL(`/viagens/${trip.slug}`, request.url);
    destino.search = request.nextUrl.search; // preserva ?data=... etc
    return NextResponse.redirect(destino, 308);
  } catch {
    return NextResponse.next();
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // O redirect precisa acontecer aqui, e não na página: a página é estática e
  // cacheada, e HTML cacheado não consegue devolver um 301/308.
  if (pathname.startsWith("/viagens/")) {
    return redirecionaLinkAntigo(request);
  }

  // Área do admin. Checagem explícita do prefixo: nunca aplicar a exigência de
  // login a nada fora de /admin, mesmo que o matcher pegue algo a mais.
  if (pathname.startsWith("/admin")) {
    // Exige o flag de admin E a presença do token real - o flag sozinho era
    // forjável. A verificação de is_admin definitiva continua no layout do admin
    // (client) e em toda a API (server), que recusa tokens não-admin.
    const isAdmin = request.cookies.get("ajs_admin")?.value === "1";
    const hasToken = !!request.cookies.get("ajs_token")?.value;

    if (!isAdmin || !hasToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Em /viagens, só intercepta os links antigos (id numérico). Rodar o
  // middleware nas páginas de slug fazia a rota devolver 200 no lugar de 404
  // quando o roteiro não existia - o Google indexaria a página de erro.
  matcher: ["/admin/:path*", "/viagens/:id(\\d+)"],
};

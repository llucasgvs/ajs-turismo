"use client";

/* O topo fixo das páginas de produto: viagem e combo.
 *
 * Não é a Navbar do site de propósito. A Navbar é `fixed` sem reservar espaço,
 * e usá-la aqui fazia o menu entrar por cima do conteúdo no desktop. Este topo
 * tem altura conhecida (h-16), e a página compensa com `lg:pt-16`.
 *
 * Traz o "Voltar para viagens" porque quem está numa página de produto veio de
 * uma lista e volta para ela, não para a home.
 *
 * Saiu de TripDetailClient sem alteração; o que entrou foi o `voltarPara`.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/* O tipo é o mínimo que o topo usa, e não o StoredUser da api: a página de
   viagem tem a sua própria versão desse tipo, e exigir a de lá obrigaria as
   duas a andarem juntas por causa de um nome e um avatar. */
type UsuarioDoTopo = { full_name?: string | null; is_admin?: boolean } | null;

export function TopoDaPagina({ usuario, voltarPara = "/viagens" }: {
  usuario: UsuarioDoTopo;
  voltarPara?: string;
}) {
  const router = useRouter();
  const navUser = usuario;
  return (
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-100 shadow-sm items-center px-6">
        {/* Left: Logo + Back */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src="/icon_ajs.png" alt="AJS Turismo" className="w-9 h-9 object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-navy-900 text-base tracking-tight">AJS</span>
              <span className="text-gold-500 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none">Turismo</span>
            </div>
          </Link>
          <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />
          <button
            onClick={() => router.push(voltarPara)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm font-medium transition-colors whitespace-nowrap"
          >
            <ArrowLeft size={15} /> Voltar para viagens
          </button>
        </div>

        {/* Right: user/login */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {navUser ? (
            <Link href={navUser.is_admin ? "/admin" : "/dashboard"}
              className="flex items-center gap-2 text-gray-700 hover:text-navy-800 transition-colors text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm">
                {navUser.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden xl:block max-w-[120px] truncate">{navUser.full_name?.split(" ")[0]}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-gray-600 hover:text-navy-800 text-sm font-medium transition-colors px-3 py-1.5">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary py-1.5 px-4 text-sm">
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </header>
  );
}

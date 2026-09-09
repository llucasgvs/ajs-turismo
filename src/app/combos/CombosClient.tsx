"use client";

import Link from "next/link";
import { Package, ArrowRight, Calendar, Percent, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fmtBRL } from "@/lib/format";
import { imgOtim } from "@/lib/imagem";

type RoteiroDoCombo = {
  template_id: number;
  title: string;
  slug: string | null;
  image_url: string | null;
  preco_desde: number | null;
  datas_abertas: number;
};

type Combo = {
  id: number;
  nome: string;
  slug: string | null;
  descricao: string | null;
  desconto_pct: number;
  max_installments: number;
  venda_fim: string | null;
  roteiros: RoteiroDoCombo[];
  preco_tabela_desde: number | null;
  preco_cheio_desde: number | null;
  preco_com_desconto_desde: number | null;
  preco_com_desconto_ate: number | null;
  desconto_total_pct: number | null;
};

const FOTO_PADRAO =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80";

function pct(n: number): string {
  return n.toString().replace(".", ",");
}

/** "Vende até 30/11" quando há prazo. É a informação que cria a urgência real
 *  do combo, e a única data que importa antes de o cliente abrir a página. */
function prazo(iso: string | null): string | null {
  if (!iso) return null;
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function ComboCard({ c }: { c: Combo }) {
  const capa = c.roteiros.find((r) => r.image_url)?.image_url;
  const ate = prazo(c.venda_fim);
  // O "de" só aparece quando existe economia de verdade contra o anunciado.
  const de = c.preco_tabela_desde ?? c.preco_cheio_desde;
  const por = c.preco_com_desconto_desde;
  const economia = de && por && de > por ? Math.round(de - por) : null;

  return (
    <Link
      href={`/combos/${c.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-[box-shadow,transform,border-color] duration-200 flex flex-col border border-gray-100 hover:border-gold-300 hover:-translate-y-1"
    >
      <div className="relative h-44 flex-shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          loading="lazy"
          decoding="async"
          src={capa ? imgOtim(capa, 828, 85) : FOTO_PADRAO}
          alt={c.nome}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/25 to-transparent" />

        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-xs font-bold px-2.5 py-1 rounded-full">
            <Package size={10} /> Combo
          </span>
          <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{pct(c.desconto_pct)}%
          </span>
        </div>

        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <h3 className="font-display font-black text-base text-white leading-tight drop-shadow">
            {c.nome}
          </h3>
          <p className="text-white/80 text-xs mt-0.5">
            {c.roteiros.length} viagens em um pacote
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* As viagens do pacote, que é o que o cliente realmente compara. */}
        <ul className="space-y-1 mb-3">
          {c.roteiros.map((r, i) => (
            <li key={r.template_id} className="flex items-start gap-2 text-sm text-navy-700">
              <span className="flex-shrink-0 w-4 h-4 mt-0.5 rounded-full bg-gold-100 text-gold-700 text-[10px] font-bold flex items-center justify-center tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 truncate">{r.title}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
          <Calendar size={11} className="text-gold-500 flex-shrink-0" />
          Você escolhe a data de cada uma
        </p>

        <div className="mt-auto pt-3 border-t border-gray-100">
          {de && por && de > por && (
            <p className="text-xs text-gray-400 line-through tabular-nums">R$ {fmtBRL(de)}</p>
          )}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-display font-black text-xl text-navy-800 tabular-nums">
              R$ {fmtBRL(por ?? 0)}
            </span>
            {c.preco_com_desconto_ate != null && (
              <span className="text-sm font-bold text-gray-400 tabular-nums">
                a R$ {fmtBRL(c.preco_com_desconto_ate)}
              </span>
            )}
            <span className="text-xs text-gray-400">por pessoa</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {c.max_installments > 1 ? `em até ${c.max_installments}x sem juros` : "à vista"}
            {economia && <span className="text-emerald-600 font-semibold"> · economize R$ {economia}</span>}
          </p>

          <div className="flex items-center justify-between mt-3">
            {ate ? (
              <span className="text-[11px] font-semibold text-gold-700 bg-gold-50 border border-gold-200 px-2 py-1 rounded-full">
                vende até {ate}
              </span>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1 text-sm font-bold text-navy-700 group-hover:text-gold-600 transition-colors">
              Ver combo <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CombosClient({ combos }: { combos: Combo[] }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1">
        <section className="bg-navy-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
            <span className="inline-flex items-center gap-1.5 bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1.5 rounded-full">
              <Sparkles size={12} /> Combos
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl mt-4 leading-tight">
              Leve mais de uma viagem<br className="hidden sm:block" /> e pague menos
            </h1>
            <p className="text-white/70 mt-3 max-w-xl">
              Você escolhe a data de cada viagem, paga uma vez só e garante o ano inteiro.
              Cada viagem tem o seu voucher, como sempre.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
          {combos.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package size={28} className="text-navy-300" />
              </div>
              <p className="font-display font-black text-navy-800 mb-1">
                Nenhum combo no ar agora
              </p>
              <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                Os combos entram por temporada. Enquanto isso, dá para escolher entre todas
                as nossas viagens.
              </p>
              <Link
                href="/viagens"
                className="inline-flex items-center gap-2 bg-navy-800 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-navy-700 transition-colors"
              >
                Ver viagens <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-5 flex items-center gap-1.5">
                <Percent size={13} className="text-gold-500" />
                {combos.length === 1
                  ? "1 combo disponível"
                  : `${combos.length} combos disponíveis`}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {combos.map((c) => (
                  <ComboCard key={c.id} c={c} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

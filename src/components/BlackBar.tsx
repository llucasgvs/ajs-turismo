"use client";

/* Faixa da Super Black no topo do site. Só existe enquanto o servidor disser
 * que a Black está valendo (ver src/lib/black.ts): fora disso, nada aparece e
 * o menu fica exatamente como sempre. Azul-marinho e dourado da AJS. */

import Link from "next/link";
import { foraDaBlack, pixDaBlack, pixDoRoteiro, seloDaBlack, useBlack } from "@/lib/black";
import { fmtBRL } from "@/lib/format";

export default function BlackBar() {
  const b = useBlack();
  if (!b) return null;
  const texto = b.pix_hoje
    ? `Hoje: ${b.pix_percentual}% de desconto no PIX e até ${b.parcelas_minimo}x sem juros`
    : `Até ${b.parcelas_minimo}x sem juros e aéreos em até ${b.parcelas_aereo}x. Só até domingo`;
  return (
    <div className="bg-navy-900 border-b border-gold-500/30 text-center">
      <Link href="/viagens" className="container-custom flex items-center justify-center gap-2 py-1.5 text-[11px] sm:text-xs leading-tight">
        <span className="font-black tracking-wide text-gold-400 uppercase whitespace-nowrap">{b.nome}</span>
        <span className="hidden sm:inline text-gold-500/60">·</span>
        <span className="text-white/90 font-medium">{texto}</span>
        <span className="hidden md:inline text-gold-400 font-bold underline underline-offset-2 whitespace-nowrap">Ver viagens</span>
      </Link>
    </div>
  );
}

/** Selo da Super Black no canto da foto do cartão de viagem. Mesmo formato
 *  das tags que já existem, em azul-marinho com dourado. Some fora da Black e
 *  em viagem que não ganha nada com ela (ver `seloDaBlack`). */
export function SeloBlack(props: Parameters<typeof seloDaBlack>[1] & { pequeno?: boolean }) {
  const b = useBlack();
  const texto = seloDaBlack(b, props);
  if (!texto) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-navy-900 text-gold-400 border border-gold-500/50 font-bold shadow-sm ${props.pequeno ? "text-[11px] px-2.5 py-1" : "text-xs px-3 py-1"}`}>
      <span className="font-black tracking-wide">BLACK</span>
      <span className="text-white/90">{texto}</span>
    </span>
  );
}

/** "No PIX hoje" na página da viagem, só na sexta e só onde o PIX baixa algo. */
export function PixDaBlack({ templateId, preco, precoDe, compacto }: {
  templateId?: number | null; preco?: number | null; precoDe?: number | null; compacto?: boolean;
}) {
  const b = useBlack();
  if (!b || templateId == null || foraDaBlack(b, templateId) || !b.pix_ids.includes(templateId)) return null;
  const v = pixDaBlack(b, preco, precoDe);
  if (v == null) return null;
  if (compacto) {
    return <p className="text-[11px] font-bold text-navy-800">No PIX hoje: R$ {fmtBRL(v)} <span className="text-gold-600">(Black)</span></p>;
  }
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-navy-900 px-3 py-2">
      <span className="text-[11px] font-black tracking-wide text-gold-400">BLACK · {b.pix_percentual}% NO PIX HOJE</span>
      <span className="text-sm font-black text-white">R$ {fmtBRL(v)}</span>
    </div>
  );
}

/**
 * Preço do cartão/página com a Black: na sexta, onde o PIX baixa o preço, mostra
 * o preço cheio riscado e o do PIX em destaque. Em qualquer outro caso mostra
 * `children`, que é exatamente o bloco de preço de sempre. Pedido do dono no
 * dia: só o selo "10% no PIX" fazia o cliente achar que o preço cheio era o
 * promocional.
 */
export function PrecoNoPix({ templateId, preco, precoDe, tamanho = "xl", aPartirDe, children }: {
  templateId?: number | null; preco?: number | null; precoDe?: number | null;
  tamanho?: "xl" | "2xl" | "4xl"; aPartirDe?: boolean; children: React.ReactNode;
}) {
  const b = useBlack();
  if (!b || templateId == null || foraDaBlack(b, templateId) || !b.pix_ids.includes(templateId)) return <>{children}</>;
  const v = pixDaBlack(b, preco, precoDe);
  if (v == null) return <>{children}</>;
  const cheio = Math.max(preco || 0, precoDe || 0);
  const tam = tamanho === "4xl" ? "text-4xl" : tamanho === "2xl" ? "text-2xl" : "text-xl";
  return (
    <div>
      <p className="text-xs text-gray-400 leading-none mb-1">
        {aPartirDe ? "a partir de " : ""}<span className="line-through">R$ {fmtBRL(cheio)}</span>
      </p>
      <p className={`font-display font-black ${tam} text-navy-700 leading-tight`}>
        R$ {fmtBRL(v)}
        <span className="ml-1.5 align-middle inline-block rounded-full bg-navy-900 text-gold-400 text-[10px] font-black tracking-wide px-2 py-0.5">
          NO PIX HOJE
        </span>
      </p>
    </div>
  );
}

/**
 * Preço "em linha" com a Black: onde houver PIX com desconto, troca o texto do
 * preço (`children`) por "~~cheio~~ R$ X no PIX". `semRiscado` quando o lugar
 * já risca o preço "de" (para não riscar duas vezes). Fora disso, `children`.
 */
export function PrecoInline({ templateId, preco, precoDe, semRiscado, children }: {
  templateId?: number | null; preco?: number | null; precoDe?: number | null; semRiscado?: boolean; children: React.ReactNode;
}) {
  const b = useBlack();
  const v = pixDoRoteiro(b, templateId, preco, precoDe);
  if (v == null) return <>{children}</>;
  return (
    <>
      {!semRiscado && <s className="font-normal text-gray-400 mr-1 text-[0.85em]">R$ {fmtBRL(Math.max(preco || 0, precoDe || 0))}</s>}
      R$ {fmtBRL(v)}
      <span className="ml-1 text-[0.75em] font-black text-gold-600 whitespace-nowrap">no PIX</span>
    </>
  );
}

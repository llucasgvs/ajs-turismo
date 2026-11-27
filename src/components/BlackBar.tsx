"use client";

/* Faixa da Super Black no topo do site. Só existe enquanto o servidor disser
 * que a Black está valendo (ver src/lib/black.ts): fora disso, nada aparece e
 * o menu fica exatamente como sempre. Azul-marinho e dourado da AJS. */

import Link from "next/link";
import { foraDaBlack, pixDaBlack, pixDoRoteiro, seloDaBlack, useBlack, useFaltam } from "@/lib/black";
import { fmtBRL } from "@/lib/format";

function Relogio({ ms }: { ms: number }) {
  const t = Math.floor(ms / 1000);
  const partes: [number, string][] = [[Math.floor(t / 3600), "h"], [Math.floor((t % 3600) / 60), "m"], [t % 60, "s"]];
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" role="timer"
      aria-label={`Faltam ${partes[0][0]} horas, ${partes[1][0]} minutos e ${partes[2][0]} segundos`}>
      {partes.map(([n, u], i) => (
        <span key={u} className="inline-flex items-baseline gap-px">
          {/* key = o número: cada segundo novo monta a caixa de novo e o
              "tique" roda junto com a troca, não num ritmo próprio. */}
          <span key={i === 2 ? n : u}
            className={`rounded-md px-1.5 py-0.5 font-black leading-none shadow-sm bg-gold-500 text-navy-900 ${i === 2 ? "animate-[tique_0.45s_ease-out]" : ""}`}>
            {String(n).padStart(2, "0")}
          </span>
          <span className="text-[0.85em] font-bold text-gold-400/90">{u}</span>
        </span>
      ))}
    </span>
  );
}

/** Ponto vermelho "ao vivo". */
function AoVivo() {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

/**
 * Faixa da Black Friday. Na sexta: "SÓ HOJE 10% OFF no PIX, acaba em 00h 00m 00s",
 * pelo relógio do servidor (o mesmo que decide o desconto); na última hora a
 * frase vira "Última hora". Depois da meia-noite, só a parcela, até domingo.
 * Fora da Black, não existe. No celular são duas linhas curtas, para não
 * espremer. `semLink` na página da viagem: o cliente já está onde ela levaria.
 */
export default function BlackBar({ semLink }: { semLink?: boolean } = {}) {
  const b = useBlack();
  const faltam = useFaltam(b?.pix_hoje ? b.pix_termina_em : null);
  if (!b) return null;
  const contando = b.pix_hoje && faltam != null && faltam > 0;
  const urgente = contando && faltam! < 60 * 60 * 1000;
  const marca = (
    <span className="font-display font-black tracking-wider text-gold-400 uppercase whitespace-nowrap">
      Black Friday<span className="hidden lg:inline text-white/80 font-bold normal-case tracking-normal"> AJS</span>
    </span>
  );
  const conteudo = contando ? (
    <span className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5">
      <span className="flex items-center gap-2 whitespace-nowrap">
        {marca}
        <span className="text-gold-500/60">·</span>
        <AoVivo />
        <span className="font-black uppercase tracking-wide text-white">
          {urgente ? "Última hora" : "Só hoje"}: <span className="text-gold-400">{b.pix_percentual}% OFF</span> no PIX
        </span>
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-white/90 font-semibold">
        Acaba em <Relogio ms={faltam!} />
      </span>
    </span>
  ) : (
    <span className="flex items-center gap-2">
      {marca}
      <span className="text-gold-500/60">·</span>
      <span className="text-white/90 font-medium">
        Até <b className="text-gold-400">{b.parcelas_minimo}x sem juros</b><span className="hidden sm:inline"> e aéreos em até {b.parcelas_aereo}x</span>. Só até domingo
      </span>
    </span>
  );
  const classe = "container-custom flex items-center justify-center gap-2.5 py-1.5 lg:py-2 text-[11px] sm:text-xs lg:text-[13px] leading-tight";
  return (
    <div className={`text-center border-b bg-navy-900 border-gold-500/40 bg-[linear-gradient(90deg,transparent,rgba(247,168,0,0.12),transparent)]`}>
      {semLink ? <div className={classe}>{conteudo}</div> : (
        <Link href="/viagens" className={classe}>
          {conteudo}
        </Link>
      )}
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

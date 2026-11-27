"use client";

/* Super Black AJS 10 anos (27 a 29/11/2026): faixa, selos e preço no PIX.
 *
 * O site NÃO tem a data escrita aqui. Ele pergunta ao servidor
 * (/promocoes/black/publico) se a Black está valendo, e o servidor responde
 * pelo mesmo relógio e pelo mesmo botão de emergência que decidem o desconto e
 * as parcelas na cobrança. Assim a faixa nunca promete o que o pagamento não
 * dá, e tudo some sozinho quando a Black acaba.
 *
 * Uma pergunta por página: a primeira chamada é guardada e reaproveitada por
 * todos os componentes. Falhou a chamada? A tela fica como sempre foi. */

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type BlackAgora = {
  ligada: boolean;
  nome: string;
  pix_hoje: boolean;
  pix_percentual: number;
  parcelas_minimo: number;
  parcelas_aereo: number;
  tag_aereo: string;
  fora_ids: number[];
  /** Roteiros que o site vende no PIX (o selo de PIX só aparece neles). */
  pix_ids: number[];
  /** Roteiros que vendem no cartão pelo site E sobem de parcela na Black. */
  parcelas_ids: number[];
  termina_em: string;
  pix_termina_em: string;
};

let pedido: Promise<BlackAgora | null> | null = null;

function perguntar(): Promise<BlackAgora | null> {
  if (!pedido) {
    pedido = fetch(`${API_URL}/promocoes/black/publico`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BlackAgora | null) => (d && d.ligada ? d : null))
      .catch(() => null);
  }
  return pedido;
}

/** Aplica o relógio: depois do fim do PIX, `pix_hoje` cai; depois do fim da
 *  Black, nada. Sem isto a tela aberta às 23h50 continuaria mostrando o preço
 *  do PIX depois da meia-noite, e o servidor (que decide) cobraria o cheio. */
function noRelogio(d: BlackAgora | null, agora: number): BlackAgora | null {
  if (!d) return null;
  if (agora >= Date.parse(d.termina_em)) return null;
  if (d.pix_hoje && agora >= Date.parse(d.pix_termina_em)) return { ...d, pix_hoje: false };
  return d;
}

/** A Black de agora, ou null fora dela (e enquanto a resposta não chega).
 *  Vira sozinha no fim do PIX e no fim da Black, sem recarregar a página. */
function useBlackDoServidor(): { cru: BlackAgora | null; agora: number } {
  const [cru, setCru] = useState<BlackAgora | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    let vivo = true;
    perguntar().then((d) => { if (vivo) { setCru(d); setAgora(Date.now()); } });
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (!cru) return;
    const proximos = [cru.pix_termina_em, cru.termina_em].map(Date.parse).filter((t) => t > agora);
    if (!proximos.length) return;
    const espera = Math.min(...proximos) - agora + 300;
    if (espera > 2_000_000_000) return; // setTimeout não aceita mais que ~24 dias
    const id = setTimeout(() => setAgora(Date.now()), espera);
    return () => clearTimeout(id);
  }, [cru, agora]);
  return { cru, agora };
}

export function useBlack(): BlackAgora | null {
  const { cru, agora } = useBlackDoServidor();
  return useMemo(() => noRelogio(cru, agora), [cru, agora]);
}

/** true depois que o PIX da Black acabou com a página aberta. O preço do PIX
 *  que o servidor mandou antes da meia-noite deixa de valer na tela. */
export function usePixAcabou(): boolean {
  const { cru, agora } = useBlackDoServidor();
  return !!cru && cru.pix_hoje && agora >= Date.parse(cru.pix_termina_em);
}

/** Tempo que falta até `alvo` (ISO), atualizado a cada segundo. */
export function useFaltam(alvo?: string | null): number | null {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!alvo) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [alvo]);
  if (!alvo) return null;
  return Math.max(0, Date.parse(alvo) - agora);
}

export function foraDaBlack(b: BlackAgora, templateId?: number | null): boolean {
  return templateId != null && b.fora_ids.includes(templateId);
}

/**
 * Texto do selo do cartão de viagem, ou null quando não há o que destacar.
 * `parcelas` é o que a vitrine já manda (com a Black aplicada pelo servidor).
 */
export function seloDaBlack(
  b: BlackAgora | null,
  v: { templateId?: number | null; parcelas?: number | null; preco?: number | null; precoDe?: number | null; sobConsulta?: boolean },
): string | null {
  if (!b || v.sobConsulta || v.templateId == null || foraDaBlack(b, v.templateId)) return null;
  // Só destaca o que a Black DÁ: viagem só-WhatsApp não vende cartão no site,
  // e viagem que já parcelava 10x não ganhou nada com a Black.
  if (b.pix_hoje && b.pix_ids.includes(v.templateId) && pixDaBlack(b, v.preco, v.precoDe) != null) {
    return `${b.pix_percentual}% no PIX`;
  }
  if (b.parcelas_ids.includes(v.templateId) && (v.parcelas || 0) > 1) return `${v.parcelas}x sem juros`;
  return null;
}

/**
 * Preço por pessoa no PIX da sexta, ou null quando o PIX não baixa nada.
 * Mesma regra do servidor: 10% do preço CHEIO, sem somar com o desconto que a
 * data já tem. É só para MOSTRAR: quem calcula a cobrança é o servidor.
 */
export function pixDaBlack(b: BlackAgora | null, preco?: number | null, precoDe?: number | null): number | null {
  if (!b || !b.pix_hoje || !preco || preco <= 0) return null;
  const cheio = Math.max(preco, precoDe || 0);
  const noPix = Math.round(cheio * (100 - b.pix_percentual)) / 100;
  return noPix < preco - 0.004 ? noPix : null;
}

/** Preço no PIX de um roteiro agora, ou null (fora da sexta, roteiro fora da
 *  Black, sem PIX no site, ou data que já tem 10% ou mais). */
export function pixDoRoteiro(b: BlackAgora | null, templateId?: number | null, preco?: number | null, precoDe?: number | null): number | null {
  if (!b || templateId == null || foraDaBlack(b, templateId) || !b.pix_ids.includes(templateId)) return null;
  return pixDaBlack(b, preco, precoDe);
}

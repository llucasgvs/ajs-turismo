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

import { useEffect, useState } from "react";

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

/** A Black de agora, ou null fora dela (e enquanto a resposta não chega). */
export function useBlack(): BlackAgora | null {
  const [b, setB] = useState<BlackAgora | null>(null);
  useEffect(() => {
    let vivo = true;
    perguntar().then((d) => { if (vivo) setB(d); });
    return () => { vivo = false; };
  }, []);
  return b;
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

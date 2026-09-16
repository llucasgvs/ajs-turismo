/**
 * O que a página do combo e o checkout do combo têm em comum.
 *
 * Nasceu porque as duas telas tinham cópias de `rotuloFaixa` e `paraSelecao`,
 * e cópia é o jeito mais fácil de as contas desencontrarem.
 */
import type { DataSelecionavel } from "@/components/viagem/Datas";

/** Uma faixa de idade do combo, sem preço: quem cobra é cada viagem. */
export type FaixaDoCombo = { name: string; age_range: string; occupies_seat: boolean };

/** "Criança (5 a 6 anos)", ou só "Criança" quando a faixa não diz idade. */
export function rotuloFaixa(f: FaixaDoCombo): string {
  return f.age_range ? `${f.name} (${f.age_range})` : f.name;
}

/** A data de um roteiro do combo no formato que o seletor de datas entende. */
export function paraSelecao(d: {
  trip_id: number;
  departure_date: string;
  return_date?: string | null;
  price_per_person: number;
  original_price?: number | null;
  available_spots: number;
}): DataSelecionavel {
  return {
    id: d.trip_id,
    departure_date: d.departure_date,
    return_date: d.return_date ?? null,
    price_per_person: d.price_per_person,
    original_price: d.original_price ?? null,
    available_spots: d.available_spots,
  };
}

/**
 * Quanto falta para o combo sair de venda, para a página e o card avisarem.
 *
 * O combo vende numa janela (ex.: 15/09 a 31/10) e depois some. Sem aviso, a
 * pessoa que viu hoje volta em novembro e não entende para onde foi. Conta em
 * dias de Brasília, inclusive o último dia: "até 31/10" vale o dia 31 inteiro.
 */
export function prazoDoCombo(vendaFim?: string | null): { dias: number; ate: string; urgente: boolean } | null {
  if (!vendaFim) return null;
  const [y, m, d] = vendaFim.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const hojeSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hoje = Date.UTC(hojeSP.getFullYear(), hojeSP.getMonth(), hojeSP.getDate());
  const fim = Date.UTC(y, m - 1, d);
  const dias = Math.round((fim - hoje) / 86400000);
  if (dias < 0) return null;
  return { dias, ate: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`, urgente: dias <= 7 };
}

/** O texto do aviso, um só para a página e o card, para não dizerem coisas diferentes. */
export function textoDoPrazo(p: { dias: number; ate: string }): string {
  if (p.dias === 0) return `Último dia: o combo sai de venda hoje (${p.ate})`;
  if (p.dias === 1) return `Amanhã é o último dia do combo (até ${p.ate})`;
  if (p.dias <= 7) return `Últimos ${p.dias} dias do combo (até ${p.ate})`;
  return `Combo à venda só até ${p.ate} · faltam ${p.dias} dias`;
}

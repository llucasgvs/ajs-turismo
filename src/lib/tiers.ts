// Faixa de preço por categoria.
// Estrutura padronizada: nome da categoria + faixa de idade + valor.
// Mantém compatibilidade com faixas antigas salvas como { label, price }.
export interface PriceTier {
  name?: string;
  age_range?: string;
  price: number;
  /** O "de" da faixa. Só vitrine: nunca entra no valor cobrado. */
  original_price?: number | null;
  /** Desconta uma vaga do ônibus? Ausente = sim (faixas anteriores a esta opção). */
  occupies_seat?: boolean;
  label?: string; // legado
}

/** Rótulo exibido ao cliente: "Criança (5 a 12 anos)" ou só o nome se não houver idade. */
export function tierLabel(t: { name?: string; age_range?: string; label?: string }): string {
  const name = (t.name ?? t.label ?? "").trim();
  const age = (t.age_range ?? "").trim();
  return age ? `${name} (${age})` : name;
}

/** Faixa sem o campo ocupa poltrona: nada muda para as que já existiam. */
export function tierOccupiesSeat(t?: { occupies_seat?: boolean } | null): boolean {
  return t?.occupies_seat === undefined ? true : !!t.occupies_seat;
}

/**
 * Valor mostrado ao CLIENTE. Zero vira "Grátis": "R$ 0,00" parece campo não
 * preenchido, e o que é de graça vende melhor escrito por extenso.
 * No admin não use isto, lá o zero precisa aparecer como número.
 */
export function tierPriceLabel(price: number, fmt: (v: number) => string): string {
  return price > 0 ? `R$ ${fmt(price)}` : "Grátis";
}

/**
 * Quanto esta reserva custaria em OUTRA data, com as regras de hoje.
 * Espelha `_valor_na_data` em app/routers/bookings.py.
 *
 * Serve só para AVISAR: o valor pago nunca é recalculado ao trocar de data.
 * As faixas são resolvidas contra os preços da data NOVA; label que não existe
 * lá cai no preço padrão e conta como adulto, igual ao servidor (na dúvida,
 * cobra cheio).
 *
 * Nunca multiplique o preço padrão pelo número de pessoas para estimar isto.
 * Era o que a troca de data fazia, e mentia em toda reserva com criança: 3
 * adultos + 1 colo virava 4 x o valor cheio, e a tela pedia uma diferença que
 * ninguém devia. Criança de colo custa zero.
 */
export function valorNaData(
  reserva: {
    num_travelers: number;
    discount_amount?: number | null;
    tier_breakdown?: { label: string; qty: number }[] | null;
    selected_optionals?: { name: string; price: number }[] | null;
  },
  data: { price_per_person: number; price_tiers?: PriceTier[] | null },
  quartoSingle: string,
): number {
  const padrao = Number(data.price_per_person) || 0;
  const faixas = new Map(
    (data.price_tiers ?? []).map((t) => [tierLabel(t), Number(t.price) || 0]),
  );

  let base = 0;
  let pessoas = 0;
  let adultos = 0;
  for (const e of reserva.tier_breakdown ?? []) {
    const qty = Number(e.qty) || 0;
    if (qty <= 0) continue;
    const conhecida = faixas.has(e.label);
    base += (conhecida ? faixas.get(e.label)! : padrao) * qty;
    if (!conhecida) adultos += qty;
    pessoas += qty;
  }
  // Distribuição vazia ou que não fecha com o total: o servidor cai no cálculo
  // padrão, e aqui cai igual.
  if (!pessoas || pessoas !== reserva.num_travelers) {
    base = padrao * reserva.num_travelers;
    adultos = reserva.num_travelers;
  }

  // O quarto multiplica por ADULTO, o resto por pessoa.
  const opcionais = (reserva.selected_optionals ?? []).reduce(
    (s, o) =>
      s + (Number(o.price) || 0) * (o.name === quartoSingle ? adultos : reserva.num_travelers),
    0,
  );

  return Math.round((base + opcionais - (Number(reserva.discount_amount) || 0)) * 100) / 100;
}

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

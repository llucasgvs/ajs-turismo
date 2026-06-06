// Faixa de preço por categoria.
// Estrutura padronizada: nome da categoria + faixa de idade + valor.
// Mantém compatibilidade com faixas antigas salvas como { label, price }.
export interface PriceTier {
  name?: string;
  age_range?: string;
  price: number;
  label?: string; // legado
}

/** Rótulo exibido ao cliente: "Criança (5 a 12 anos)" ou só o nome se não houver idade. */
export function tierLabel(t: { name?: string; age_range?: string; label?: string }): string {
  const name = (t.name ?? t.label ?? "").trim();
  const age = (t.age_range ?? "").trim();
  return age ? `${name} (${age})` : name;
}

// Desconto "de / por". O valor cobrado é sempre o "por"; o "de" e o percentual
// são só vitrine e nunca entram no cálculo da cobrança.

/** Percentual de desconto entre o "de" e o "por". Nulo quando não há desconto. */
export function discountPercent(original?: number | null, price?: number | null): number | null {
  const de = Number(original) || 0;
  const por = Number(price) || 0;
  if (de <= 0 || por <= 0 || de <= por) return null;
  return Math.round(((de - por) / de) * 10000) / 100; // 2 casas
}

/**
 * O "de" a partir do "por" e do percentual, em centavos exatos.
 * R$ 216,00 com 10% dá R$ 240,00; R$ 199,00 com 10% dá R$ 221,11.
 */
export function originalFromPercent(price?: number | null, percent?: number | null): number | null {
  const por = Number(price) || 0;
  const p = Number(percent) || 0;
  if (por <= 0 || p <= 0 || p >= 100) return null;
  return Math.round((por / (1 - p / 100)) * 100) / 100;
}

/** Texto curto do percentual, sem casas inúteis: 10 e não 10,00. */
export function percentText(pct: number | null): string {
  if (pct === null) return "";
  return String(Math.round(pct * 100) / 100).replace(".", ",");
}

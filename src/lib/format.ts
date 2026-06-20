/** Formata valor em BRL sempre com 2 casas decimais. Ex: 699,90 */
export function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata valor de parcela (divisão exata, sem Math.ceil). Ex: 699,90 / 3 = 233,30 */
export function fmtInstallment(price: number, installments: number): string {
  return fmtBRL(price / installments);
}

/**
 * Rótulo de vagas. Bate-e-volta / data aberta usam 9999 como "ilimitado":
 * nesses casos mostramos "Vagas disponíveis" em vez do número cru "9999".
 */
const UNLIMITED_SPOTS = 999;
export function spotsLabel(n: number): string {
  if (n >= UNLIMITED_SPOTS) return "Vagas disponíveis";
  return `${n} vaga${n !== 1 ? "s" : ""}`;
}
export function isUnlimitedSpots(n: number): boolean {
  return n >= UNLIMITED_SPOTS;
}

/**
 * Prazo de encerramento das vendas: N dias antes da saída (deve bater com o
 * BOOKING_CUTOFF_DAYS do backend, que é a regra autoritativa).
 */
export const BOOKING_CUTOFF_DAYS = 4;
export function salesClosed(departureISO?: string | null): boolean {
  if (!departureISO) return false;
  const dep = new Date(departureISO).getTime();
  if (isNaN(dep)) return false;
  return dep <= Date.now() + BOOKING_CUTOFF_DAYS * 86400000;
}

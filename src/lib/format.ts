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
 * CPF e telefone ficam salvos só como número no banco. Estas duas formatam
 * tanto ao digitar quanto ao exibir, e são idempotentes: aplicar num valor
 * já formatado devolve o mesmo valor.
 */
export function formatCPF(v?: string | null): string {
  const d = (v ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Trata fixo e celular. A versão antiga do admin quebrava o fixo de 10 dígitos
 * em "(41) 33335-487"; esta é a mesma lógica que o checkout já usa em produção.
 */
export function formatPhone(v?: string | null): string {
  const d = (v ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
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

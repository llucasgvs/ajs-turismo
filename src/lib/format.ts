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

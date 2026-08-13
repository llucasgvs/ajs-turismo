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
 *
 * `null` chega quando a API decidiu não publicar o número por haver vaga de
 * sobra (ver app/core/vitrine.py). Trata igual ao ilimitado: o cliente vê que
 * tem vaga, sem o número exato. Só a escassez de verdade mostra a quantidade.
 */
const UNLIMITED_SPOTS = 999;
export function spotsLabel(n: number | null | undefined): string {
  if (n == null || n >= UNLIMITED_SPOTS) return "Vagas disponíveis";
  return `${n} vaga${n !== 1 ? "s" : ""}`;
}
export function isUnlimitedSpots(n: number | null | undefined): boolean {
  return n == null || n >= UNLIMITED_SPOTS;
}

/**
 * O roteiro está marcado como bate-e-volta pela etiqueta do painel?
 *
 * Existe para o caso que a data sozinha não resolve: sai 23:45 e volta às 16:00
 * do dia seguinte, sem dormir em hotel. Pelo calendário são dois dias, e a
 * página escrevia "1 dia / 1 noite", que é errado para quem dorme no ônibus.
 *
 * A etiqueta é a fonte da verdade, e não o número de noites, porque as noites
 * são recalculadas pela diferença de datas toda vez que o admin edita a data:
 * um valor corrigido na mão voltaria a ficar errado na primeira edição.
 *
 * Comparação frouxa (sem acento, sem caixa, sem espaços das pontas) porque a
 * etiqueta é texto livre digitado no painel.
 */
export function marcadoBateVolta(tag?: string | null): boolean {
  if (!tag) return false;
  const limpo = tag
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")   // "bate e vólta" -> "bate e volta"
    .replace(/[\s-]+/g, " ")          // hífen e espaço repetido viram um espaço
    .trim()
    .toLowerCase();
  return limpo === "bate e volta" || limpo === "bate volta";
}

/**
 * Ida e volta no mesmo dia, ou seja, bate-e-volta.
 *
 * Comparado no fuso de Brasília: fatiar o ISO cru usaria a data em UTC, que vira
 * o dia seguinte em saídas de fim de noite (23:45 BRT = 02:45 UTC) e faria um
 * bate-e-volta parecer viagem de dois dias.
 *
 * Serve para não escrever a mesma data duas vezes ("23 de ago. → 23 de ago."),
 * que ocupa espaço e não informa nada.
 */
export function mesmoDia(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const dia = (d: string) => new Date(d).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
  return dia(a) === dia(b);
}

/**
 * Tem vaga? `null` é "sobra vaga", então conta como sim. Só 0 é esgotado.
 */
export function temVaga(disponivel: number | null | undefined): boolean {
  return disponivel == null || disponivel > 0;
}

/**
 * Está acabando? Só quando a API publicou um número baixo de verdade. Com
 * `null` (vaga de sobra) não há escassez para anunciar.
 */
export function poucasVagas(disponivel: number | null | undefined): disponivel is number {
  return disponivel != null && disponivel > 0 && disponivel <= 5;
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

/**
 * Texto pronto para comparação de busca: minúsculas, sem acento e sem espaço
 * sobrando.
 *
 * Existe porque ninguém digita acento procurando viagem no celular. Sem isto,
 * "gramado" não achava "GRAMADO e CANELA", "foz do iguacu" não achava "FOZ DO
 * IGUAÇU" e "sao luis" não achava "São Luis do Purunã" - a pessoa concluía que
 * a AJS não tem o destino e ia embora.
 *
 * `normalize("NFD")` separa a letra do acento e o replace remove os acentos,
 * que no Unicode ficam na faixa 0300-036F.
 */
export function semAcento(texto: string | null | undefined): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

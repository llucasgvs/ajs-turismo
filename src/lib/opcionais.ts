/**
 * Por quanto multiplicar o preço de cada opcional.
 *
 * ESPELHO de `app/core/opcionais.py` no backend. As duas contas precisam dar o
 * MESMO centavo: o servidor é a autoridade, mas é esta que o cliente vê antes
 * de enviar. Divergir aqui é mostrar um preço e cobrar outro, que é pior do que
 * qualquer problema que a regra resolva.
 *
 * Se mexer numa, mexa na outra. Há teste no backend cobrindo os mesmos casos.
 */

export type Opcional = { name: string; price: number; por_adulto?: boolean };

/**
 * Quase todo opcional é POR PESSOA: transfer, ingresso, passeio, e nisso entra
 * criança e criança de colo.
 *
 * O quarto é POR ADULTO, porque quarto é vendido para dois e criança divide o
 * dos pais: um single de R$ 200 numa reserva de 1 adulto + 1 criança é UMA
 * cobrança, não duas.
 *
 * `por_adulto` ausente vale como false, de propósito: todo opcional cadastrado
 * antes desta opção existir é por pessoa, e mudar isso alteraria preço de coisa
 * já vendida.
 */
export function multiplicadorOpcional(
  opcional: Opcional,
  pessoas: number,
  adultos: number,
): number {
  return opcional.por_adulto ? Math.max(0, adultos) : pessoas;
}

/** Soma dos opcionais escolhidos, com o multiplicador certo em cada um. */
export function totalOpcionais(
  escolhidos: Opcional[],
  pessoas: number,
  adultos: number,
): number {
  return escolhidos.reduce(
    (s, o) => s + o.price * multiplicadorOpcional(o, pessoas, adultos),
    0,
  );
}

/** Espelha QUARTO_SINGLE em app/core/opcionais.py. */
export const QUARTO_SINGLE = "Quarto single - De solteiro";

/**
 * O quarto deixa de ser escolha e vira condição da viagem?
 *
 * Regra: viagem com hospedagem, UM adulto e ao menos uma criança.
 *
 * O motivo não é o quarto ficar incompleto, é que esse grupo não pode ser
 * encaixado com um desconhecido: criança chora de madrugada e precisa de
 * cuidado e privacidade. Adulto sozinho divide quarto com outro adulto numa
 * boa, e por isso NÃO cai aqui.
 *
 * Espelho de `quarto_obrigatorio` no backend.
 */
export function quartoObrigatorio(
  temHospedagem: boolean | undefined,
  adultos: number,
  pessoas: number,
): boolean {
  return !!temHospedagem && adultos === 1 && pessoas > adultos;
}

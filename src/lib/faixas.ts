/**
 * Sugestões de faixa de preço oferecidas ao cadastrar uma data.
 *
 * Ficam aqui, e não em cada tela, porque a mesma lista aparece em três lugares
 * do painel: o formulário de data, o de edição e o de aplicar faixas em lote.
 * Estavam duplicadas, e trocar uma sugestão exigia lembrar dos três.
 *
 * O clique só PREENCHE os campos - tudo continua editável antes de salvar, e
 * nenhuma data já cadastrada é afetada.
 */
export type SugestaoFaixa = {
  rotulo: string;
  /** Idades, no formato que a validação entende: dois números ou "N+". */
  faixa?: string;
  preco?: string;
  /** Ausente = ocupa poltrona, que é o padrão de toda faixa. */
  ocupaPoltrona?: boolean;
};

export const SUGESTOES_FAIXA: SugestaoFaixa[] = [
  { rotulo: "Criança" },
  // Nasce pronta porque é sempre a mesma regra, e errar aqui custa caro nos
  // dois sentidos: marcar poltrona para quem viaja no colo tira um lugar
  // vendável do ônibus; cobrar de quem é isento gera reembolso e reclamação.
  { rotulo: "Criança de colo", faixa: "0 a 4 anos", preco: "0", ocupaPoltrona: false },
  { rotulo: "Idoso" },
  { rotulo: "Estudante" },
];

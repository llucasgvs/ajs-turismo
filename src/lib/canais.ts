/**
 * Nomes de tela para a origem das vendas. A regra que decide o canal fica no
 * backend (app/core/origem.py); aqui é só como cada um aparece no painel.
 */

export const CANAL_LABEL: Record<string, string> = {
  google_ads: "Anúncio do Google",
  google: "Google (busca normal)",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "Link no WhatsApp",
  ia: "ChatGPT ou outra IA",
  buscador: "Outro buscador",
  direto: "Entrou direto no site",
  outro: "Outro site",
  nao_identificado: "Não identificado",
};

// O nome que o anúncio leva no endereço (utm_campaign) para o nome da campanha.
export const CAMPANHA_LABEL: Record<string, string> = {
  "ilha-do-mel": "Ilha do Mel",
  "foz-do-iguacu": "Foz do Iguaçu",
  "marca-ajs": "busca pelo nome",
  sem_nome: "campanha sem nome",
};

export const COMO_CONHECEU_OPCOES: [string, string][] = [
  ["instagram", "Instagram"],
  ["google", "Google"],
  ["indicacao", "Indicação de alguém"],
  ["ja_cliente", "Já viajou com a AJS"],
  ["facebook", "Facebook"],
  ["outro", "Outro"],
];
export const COMO_CONHECEU_LABEL: Record<string, string> = {
  ...Object.fromEntries(COMO_CONHECEU_OPCOES),
  nao_informado: "Não informado",
};

export function nomeDaCampanha(campanha?: string | null): string {
  return campanha ? CAMPANHA_LABEL[campanha] || campanha : "";
}

export function nomeDoCanal(canal: string, campanha?: string | null): string {
  const nome = CANAL_LABEL[canal] || canal;
  if (canal !== "google_ads" || !campanha) return nome;
  return `${nome} · ${nomeDaCampanha(campanha)}`;
}

import { arrumaMaiusculas } from "@/lib/seoViagem";

/**
 * Atalhos de tipo na página de viagens ("Bate e volta", "Réveillon 2027"...).
 *
 * Cada atalho é a MESMA página de viagens, só que filtrada e com endereço
 * próprio (/viagens?tipo=reveillon). Para o cliente é um filtro; para o
 * Google, uma página com título e abertura próprios, que disputa buscas como
 * "réveillon saindo de Curitiba".
 *
 * O tipo sai do que já está cadastrado, principalmente dos selos que o dono
 * coloca no roteiro (os mesmos que aparecem nos cartões). Nada novo no admin.
 * Atalho sem nenhuma viagem não aparece: o Réveillon some sozinho depois da
 * temporada.
 */

export type TipoId = "bate-e-volta" | "com-hospedagem" | "praia" | "aereo" | "reveillon" | "combos";

type Roteiro = {
  title: string;
  tag: string | null;
  category: string;
  includes: string[];
  quote_only?: boolean;
  dates: { departure_date: string; return_date: string }[];
};

const ORDEM: TipoId[] = ["bate-e-volta", "com-hospedagem", "praia", "aereo", "reveillon", "combos"];

/** Só estes viram página para o Google. Combos hoje é 1 item: seria página
 *  fraca, então fica só como filtro para o cliente. */
const INDEXAVEIS = new Set<TipoId>(["bate-e-volta", "com-hospedagem", "praia", "aereo", "reveillon"]);

export function tipoValido(v: unknown): TipoId | null {
  return typeof v === "string" && (ORDEM as string[]).includes(v) ? (v as TipoId) : null;
}

export function tipoIndexavel(t: TipoId): boolean {
  return INDEXAVEIS.has(t);
}

const dia = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function aereo(r: Roteiro): boolean {
  return /a[ée]reo/i.test(r.tag || "")
    || /com a[ée]reo/i.test(r.title)
    || (r.includes || []).some((i) => /a[ée]re[oa]s?\b/i.test(i));
}

function bateEVolta(r: Roteiro): boolean {
  if (aereo(r)) return false;
  return /bate e volta/i.test(r.tag || "")
    || /bate e volta/i.test(r.title)
    || (r.dates || []).some((d) => d.return_date && dia(d.departure_date) === dia(d.return_date));
}

export function ehDoTipo(t: TipoId, r: Roteiro): boolean {
  if (r.quote_only) return false;
  switch (t) {
    case "aereo": return aereo(r);
    case "bate-e-volta": return bateEVolta(r);
    case "com-hospedagem":
      return !aereo(r) && !bateEVolta(r)
        && (r.includes || []).some((i) => /hosped|hotel|pousada|resort/i.test(i));
    case "praia": return (r.category || "").trim().toLowerCase() === "praia";
    case "reveillon": return /r[ée]veillon/i.test(r.tag || "") || /r[ée]veillon/i.test(r.title);
    case "combos": return false; // combos não são roteiros; a página os mostra à parte
  }
}

function anoDoReveillon(roteiros: Roteiro[]): string {
  for (const r of roteiros) {
    const m = r.title.match(/r[ée]veillon\s+(\d{4})/i);
    if (m) return m[1];
  }
  return "";
}

export function rotulo(t: TipoId, roteiros: Roteiro[]): string {
  switch (t) {
    case "bate-e-volta": return "Bate e volta";
    case "com-hospedagem": return "Com hospedagem";
    case "praia": return "Praia";
    case "aereo": return "Com aéreo";
    case "reveillon": {
      const ano = anoDoReveillon(roteiros.filter((r) => ehDoTipo("reveillon", r)));
      return ano ? `Réveillon ${ano}` : "Réveillon";
    }
    case "combos": return "Combos";
  }
}

/** Atalhos com pelo menos uma viagem, na ordem da fileira. */
export function tiposDisponiveis(roteiros: Roteiro[], quantosCombos: number): { id: TipoId; rotulo: string }[] {
  return ORDEM
    .filter((t) => (t === "combos" ? quantosCombos > 0 : roteiros.some((r) => ehDoTipo(t, r))))
    .map((t) => ({ id: t, rotulo: rotulo(t, roteiros) }));
}

function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** Topo da página e texto do Google para cada atalho. Sem preço, de propósito:
 *  o Google guarda o texto por dias e a promoção muda o valor. */
export function cabecalho(t: TipoId, roteiros: Roteiro[]): { titulo: string; destaque: string; texto: string; descricaoGoogle: string } {
  switch (t) {
    case "bate-e-volta":
      return {
        titulo: "Bate e volta", destaque: "saindo de Curitiba",
        texto: "Passeios de um dia, com saída e volta no mesmo dia: praia, parques, cidades históricas e passeios de trem perto de Curitiba. Escolha a data e reserve online.",
        descricaoGoogle: "Excursões bate e volta saindo de Curitiba: praia, parques, cidades históricas e passeios de trem. Saída e volta no mesmo dia, com reserva online.",
      };
    case "com-hospedagem":
      return {
        titulo: "Excursões com hospedagem", destaque: "saindo de Curitiba",
        texto: "Viagens de ônibus com hospedagem inclusa para aproveitar o destino com calma: serra, praia, termas e cidades turísticas.",
        descricaoGoogle: "Excursões de ônibus com hospedagem inclusa saindo de Curitiba: serra, praia, termas e cidades turísticas. Reserve online.",
      };
    case "praia":
      return {
        titulo: "Excursões para a praia", destaque: "saindo de Curitiba",
        texto: "Do litoral do Paraná e de Santa Catarina ao Nordeste: viagens de praia com saída de Curitiba, de um dia ou com hospedagem.",
        descricaoGoogle: "Excursões e viagens para a praia saindo de Curitiba: litoral do Paraná, Santa Catarina e Nordeste. Bate e volta ou com hospedagem.",
      };
    case "aereo":
      return {
        titulo: "Viagens com aéreo", destaque: "saindo de Curitiba",
        texto: "Pacotes com voo saindo de Curitiba e hospedagem inclusa, para o Nordeste, o Rio de Janeiro, Minas Gerais e outros destinos.",
        descricaoGoogle: "Pacotes de viagem com aéreo saindo de Curitiba e hospedagem inclusa: Nordeste, Rio de Janeiro, Minas Gerais e mais.",
      };
    case "reveillon": {
      const lista = roteiros.filter((r) => ehDoTipo("reveillon", r));
      const ano = anoDoReveillon(lista);
      const destinos = lista.map((r) =>
        arrumaMaiusculas(r.title.replace(/^.*?r[ée]veillon\s+\d{4}\s+(em|no|na)\s+/i, "").split(" - ")[0].trim()));
      const onde = destinos.length ? `: ${juntar(destinos)}` : "";
      return {
        titulo: ano ? `Réveillon ${ano}` : "Réveillon", destaque: "saindo de Curitiba",
        texto: `Passe a virada do ano viajando com a AJS${onde}. Escolha o destino e reserve online.`,
        descricaoGoogle: `Passe a virada do ano viajando com a AJS Turismo${onde}, com saída de Curitiba. Reserve online.`,
      };
    }
    case "combos":
      return {
        titulo: "Combos", destaque: "com desconto",
        texto: "Viagens juntas em um pacote, com desconto. Você escolhe a data de cada uma.",
        descricaoGoogle: "",
      };
  }
}

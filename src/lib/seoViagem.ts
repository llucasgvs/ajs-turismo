/**
 * Título e descrição da página do roteiro no Google (e na prévia do link no
 * WhatsApp). Não muda nada do que aparece DENTRO da página: card, nome, fotos e
 * preço continuam iguais.
 *
 * Montado a partir do que já está cadastrado no roteiro, para que viagem nova
 * já nasça com um texto bom sem ninguém precisar escrever.
 *
 * Regras de propósito:
 *  - sem preço: o Google guarda o texto por dias, e a promoção muda o valor;
 *  - Réveillon e "sob cotação" mantêm o nome que já tinham;
 *  - o texto escrito à mão no admin (seo_titulo / seo_descricao) vale por cima;
 *  - função pura e sem exceção: quem chama cai no texto antigo se algo falhar.
 */

type Roteiro = {
  title: string;
  destination?: string | null;
  seo_titulo?: string | null;
  seo_descricao?: string | null;
  short_description?: string | null;
  includes?: string[] | null;
  departure_locations?: string[] | null;
  quote_only?: boolean;
};

type Data = { departure_date?: string | null; return_date?: string | null } | null;

const UFS = new Set(
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "),
);
const ESTADOS = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo",
  "Goiás", "Maranhão", "Mato Grosso do Sul", "Mato Grosso", "Minas Gerais", "Pará", "Paraíba",
  "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul",
  "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins", "Europa",
];
// Siglas que ficam em maiúscula mesmo não sendo estado.
const SIGLAS = new Set(["MSC", "BR"]);
const MINUSCULAS = new Set(["e", "de", "do", "da", "dos", "das", "em", "com", "x", "a", "o", "no", "na"]);
const LIMITE_DESCRICAO = 160;

/** "ILHA DO MEL - PR" vira "Ilha do Mel - PR". Só mexe em palavra toda em
 *  maiúscula: o que já foi escrito com cuidado fica como está. */
export function arrumaMaiusculas(texto: string): string {
  return texto
    .split(" ")
    .map((p, i) => {
      const letras = p.replace(/[^\p{L}]/gu, "");
      if (!letras || letras !== letras.toLocaleUpperCase("pt-BR") || letras === letras.toLocaleLowerCase("pt-BR")) return p;
      if (UFS.has(letras) || SIGLAS.has(letras)) return p;
      const baixa = p.toLocaleLowerCase("pt-BR");
      if (i > 0 && MINUSCULAS.has(letras.toLocaleLowerCase("pt-BR"))) return baixa;
      return baixa.charAt(0).toLocaleUpperCase("pt-BR") + baixa.slice(1);
    })
    .join(" ");
}

/** Tira do fim o estado ("- PR", "- Rio Grande do Sul", "- Europa"). O nome
 *  por extenso só sai quando o lugar já está no nome: "Paraty - Rio de Janeiro"
 *  vira "Paraty", mas "Cidades Históricas - Minas Gerais" mantém o estado,
 *  senão ninguém sabe onde é. */
function semEstado(nome: string, destino: string): string {
  const cidade = destino.split(" - ")[0].trim().toLocaleLowerCase("pt-BR");
  const lugarNoNome = !!cidade && nome.toLocaleLowerCase("pt-BR").includes(cidade);
  let n = nome.trim();
  for (let i = 0; i < 2; i++) {
    const m = n.match(/^(.*\S)\s*-\s*([^-]+)$/);
    if (!m) break;
    const fim = m[2].trim();
    const ehEstado = UFS.has(fim.toUpperCase()) && fim.length === 2
      || (lugarNoNome && ESTADOS.some((e) => e.toLocaleLowerCase("pt-BR") === fim.toLocaleLowerCase("pt-BR")));
    if (!ehEstado) break;
    n = m[1].trim();
  }
  return n;
}

type Partes = { nome: string; complemento: string; opcionais: string; aereo: boolean };

function partes(r: Roteiro): Partes {
  let titulo = arrumaMaiusculas(r.title.replace(/\s+/g, " ").trim());
  // "Gramado e Canela - RS | Bate e volta": o que vem depois da barra é detalhe.
  let complemento = "";
  const barra = titulo.split(" | ");
  if (barra.length > 1) {
    titulo = barra[0];
    complemento = barra.slice(1).join(" ").trim().toLocaleLowerCase("pt-BR");
  }
  // "- Opcionais Paraguai e Argentina" sai do título e vai para a descrição.
  let opcionais = "";
  const op = titulo.match(/^(.*?)\s*-?\s*Opcionais\s+(.+)$/i);
  if (op) {
    titulo = op[1];
    opcionais = op[2].trim();
  }
  let aereo = (r.departure_locations || []).some((l) => /aeroporto/i.test(l));
  const ae = titulo.match(/^(.*?)\s+com\s+a[ée]reo\b(.*)$/i);
  if (ae) {
    titulo = `${ae[1]}${ae[2]}`;
    aereo = true;
  }
  const nome = semEstado(titulo, r.destination || "").replace(/\s+-\s*$/, "").trim();
  return { nome, complemento, opcionais, aereo };
}

function cidadesDeEmbarque(locais: string[]): string[] {
  const cidades: string[] = [];
  for (const l of locais) {
    let c = l.split("·")[0].trim();
    if (!l.includes("·") && /curitiba/i.test(l)) c = "Curitiba";
    if (c && !cidades.includes(c)) cidades.push(c);
  }
  return cidades;
}

function lista(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function dias(data: Data): number | null {
  if (!data?.departure_date || !data?.return_date) return null;
  const dia = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
  const ida = Date.parse(dia(data.departure_date));
  const volta = Date.parse(dia(data.return_date));
  if (!Number.isFinite(ida) || !Number.isFinite(volta) || volta < ida) return null;
  return Math.round((volta - ida) / 86400000) + 1;
}

export function tituloNoGoogle(r: Roteiro): string {
  const manual = (r.seo_titulo || "").trim();
  if (manual) return manual;
  return tituloAutomatico(r);
}

export function descricaoNoGoogle(r: Roteiro, data: Data): string {
  const manual = (r.seo_descricao || "").trim();
  if (manual) return manual;
  return descricaoAutomatica(r, data);
}

/** O que o site escreve sozinho. O admin mostra isto quando o campo está vazio. */
export function tituloAutomatico(r: Roteiro): string {
  const t = arrumaMaiusculas(r.title.replace(/\s+/g, " ").trim());
  if (r.quote_only || /^r[ée]veillon/i.test(t)) return t;
  const { nome, complemento, aereo } = partes(r);
  const trem = nome.match(/^Trem\s*-\s*(.+)$/i);
  const base = trem ? `Passeio de trem ${trem[1]}` : aereo ? `${nome} com aéreo` : `Excursão ${nome}`;
  const comComplemento = complemento ? `${base} ${complemento}` : base;
  return /curitiba/i.test(nome) ? comComplemento : `${comComplemento} saindo de Curitiba`;
}

export function descricaoAutomatica(r: Roteiro, data: Data): string {
  const reserva = (r.short_description || "").trim();
  if (r.quote_only) return reserva;
  const { nome, complemento, opcionais, aereo } = partes(r);

  const n = dias(data);
  // Ônibus que sai à noite e volta no dia seguinte ainda é "bate e volta"
  // quando o próprio roteiro diz isso.
  const duracao = /bate e volta/.test(complemento) || n === 1
    ? "bate e volta" : n && n > 1 ? `${n} dias` : "viagem";
  const cidades = cidadesDeEmbarque(r.departure_locations || []);
  const saida = aereo
    ? " com aéreo saindo de Curitiba"
    : /curitiba/i.test(nome) ? "" : ` saindo de ${lista(cidades.length ? cidades : ["Curitiba"])}`;
  const nomeDoTitulo = /^r[ée]veillon/i.test(nome) ? nome : nome.replace(/^Trem\s*-\s*/i, "Trem ");
  let texto = `${nomeDoTitulo}: ${duracao}${saida}.`;

  const itens = (r.includes || [])
    .map((i) => arrumaMaiusculas(i.split(" - ")[0].split("(")[0].replace(/\s+/g, " ").trim()))
    .filter(Boolean);
  const fecho = opcionais ? ` Opcionais para ${arrumaMaiusculas(opcionais)}.` : "";
  const cabem: string[] = [];
  for (const i of itens) {
    const tentativa = `${texto} Inclui ${lista([...cabem, i])}.${fecho}`;
    if (tentativa.length > LIMITE_DESCRICAO) break;
    cabem.push(i);
  }
  if (cabem.length) texto = `${texto} Inclui ${lista(cabem)}.`;
  else if (reserva && `${texto} ${reserva}`.length <= LIMITE_DESCRICAO + 40) texto = `${texto} ${reserva}`;
  if (fecho && `${texto}${fecho}`.length <= LIMITE_DESCRICAO + 20) texto += fecho;
  return texto;
}

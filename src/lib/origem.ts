/**
 * De onde o visitante veio: anúncio do Google, Instagram, busca, WhatsApp...
 *
 * Na entrada do site, anota no próprio aparelho a etiqueta que o anúncio põe
 * no endereço (gclid, utm_*) e o site que mandou a pessoa para cá. Quando ela
 * abre uma reserva, isso vai junto e o servidor decide o canal (a regra fica
 * lá, em app/core/origem.py, para não depender da versão do site em cache).
 *
 * Guarda duas visitas: a PRIMEIRA (quem apresentou a AJS) e a ÚLTIMA que veio
 * de algum lugar (quem trouxe a pessoa de volta para comprar). Entrar digitando
 * o endereço não apaga a última: só conta como origem se não houver nenhuma.
 *
 * Mesma regra de analytics.ts: NUNCA pode quebrar o site. Tudo em try/catch,
 * sem cookie, sem dado pessoal, sem nada na tela.
 */

const CHAVE = "ajs_origem";
const VALIDADE_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias
const PARAMS = [
  "gclid", "gbraid", "wbraid", "fbclid",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
] as const;

// Quem manda a pessoa de volta sem ser "origem": o próprio site, o login do
// Google e o retorno do pagamento. Sem isto, voltar do banco viraria "outro site".
const IGNORAR = [
  "ajsturismo.com.br", "vercel.app", "localhost", "127.0.0.1",
  "accounts.google.com", "asaas.com",
];

type Toque = Partial<Record<(typeof PARAMS)[number] | "ref" | "pagina" | "em", string>>;
type Guardado = { primeira?: Toque; ultima?: Toque };

function ignorado(host: string): boolean {
  return IGNORAR.some((d) => host === d || host.endsWith("." + d)) || host === window.location.hostname;
}

function ler(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE) || "{}") as Guardado;
    const vivo = (t?: Toque) => {
      const quando = t?.em ? Date.parse(t.em) : NaN;
      return t && Number.isFinite(quando) && Date.now() - quando < VALIDADE_MS ? t : undefined;
    };
    return { primeira: vivo(g.primeira), ultima: vivo(g.ultima) };
  } catch {
    return {};
  }
}

/** Chamado uma vez a cada carregamento do site (ver AnotaOrigem). */
export function anotarVisita(): void {
  try {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.pathname.startsWith("/admin")) return; // o painel não é visita

    const toque: Toque = { pagina: url.pathname.slice(0, 200), em: new Date().toISOString() };
    let temEtiqueta = false;
    for (const p of PARAMS) {
      const v = url.searchParams.get(p);
      if (v) {
        toque[p] = v.slice(0, 255);
        temEtiqueta = true;
      }
    }
    let host = "";
    try {
      host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    } catch {
      host = "";
    }
    const externo = !!host && !ignorado(host);
    if (externo) toque.ref = host;

    const g = ler();
    if (temEtiqueta || externo) {
      // Veio de algum lugar: é a nova "última", e a primeira se ainda não havia.
      localStorage.setItem(CHAVE, JSON.stringify({ primeira: g.primeira || toque, ultima: toque }));
    } else if (!g.primeira && !host) {
      // Entrada direta e nada guardado: fica registrada como direta.
      localStorage.setItem(CHAVE, JSON.stringify({ primeira: toque, ultima: toque }));
    }
    // Navegação interna, retorno do pagamento ou direta com origem guardada:
    // não muda nada.
  } catch {
    // Silêncio proposital: aba anônima, armazenamento cheio, etc.
  }
}

/** O que vai junto ao abrir a reserva. Sem nada anotado, não manda nada. */
export function origemDaVisita(): { origem_visita?: Guardado } {
  try {
    if (typeof window === "undefined") return {};
    const g = ler();
    if (!g.primeira && !g.ultima) return {};
    return { origem_visita: { primeira: g.primeira || g.ultima, ultima: g.ultima || g.primeira } };
  } catch {
    return {};
  }
}

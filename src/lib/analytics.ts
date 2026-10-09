/**
 * Envio de eventos ao Google Analytics.
 *
 * Regra desta camada: NUNCA pode quebrar o site. Toda função é envolvida em
 * try/catch e sai em silêncio se o GA não estiver disponível (bloqueador de
 * anúncios, script ainda carregando, navegação privada, etc.). Nenhum retorno
 * é usado para decidir nada no checkout.
 */

type Gtag = (...args: unknown[]) => void;

function getGtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof g === "function" ? g : null;
}

/** Dispara um evento com segurança: se algo falhar, o site segue igual. */
function enviar(evento: string, dados: Record<string, unknown>) {
  try {
    const gtag = getGtag();
    if (!gtag) return;
    gtag("event", evento, dados);
  } catch {
    // Silêncio proposital.
  }
}

/**
 * Etapa 1 do funil: a pessoa abriu a página de um roteiro.
 * Cada visualização conta (não é deduplicado, é o comportamento correto aqui).
 */
export function trackViewItem(dados: {
  id: string | number;
  name?: string | null;
  price?: number | null;
  category?: string | null;
}) {
  const { id, name, price, category } = dados;
  if (!id || !name) return;
  const valor = Number(price);
  enviar("view_item", {
    currency: "BRL",
    value: Number.isFinite(valor) && valor > 0 ? valor : 0,
    items: [
      {
        item_id: String(id),
        item_name: name,
        item_category: category || undefined,
        price: Number.isFinite(valor) && valor > 0 ? valor : undefined,
      },
    ],
  });
}

/**
 * Etapa 2 do funil: a pessoa entrou no checkout (reserva aberta).
 * Deduplicado por sessão para não inflar quando a página é atualizada.
 */
export function trackBeginCheckout(dados: {
  code: string;
  amount?: number | null;
  tripTitle?: string | null;
  travelers?: number | null;
}) {
  try {
    const { code, amount, tripTitle, travelers } = dados;
    if (!code) return;

    const chave = `ga_checkout_${code}`;
    try {
      if (sessionStorage.getItem(chave)) return; // já contado nesta sessão
      sessionStorage.setItem(chave, "1");
    } catch {
      // Sem sessionStorage: segue, no pior caso conta a mais numa atualização.
    }

    const valor = Number(amount);
    const pessoas = Number(travelers);
    enviar("begin_checkout", {
      currency: "BRL",
      value: Number.isFinite(valor) && valor > 0 ? valor : 0,
      items: tripTitle
        ? [
            {
              item_id: code,
              item_name: tripTitle,
              quantity: Number.isFinite(pessoas) && pessoas > 0 ? pessoas : 1,
            },
          ]
        : undefined,
    });
  } catch {
    // Silêncio proposital.
  }
}

/**
 * Registra a compra concluída - no máximo UMA vez por reserva.
 *
 * Dupla proteção contra contar a mesma venda duas vezes (o cliente pode
 * atualizar a tela de sucesso ou voltar nela):
 *   1. marca local, por código de reserva;
 *   2. transaction_id, que o próprio Google usa para descartar repetidos.
 */
export function trackPurchaseOnce(dados: {
  code: string;
  amount?: number | null;
  tripTitle?: string | null;
  travelers?: number | null;
}) {
  try {
    const { code, amount, tripTitle, travelers } = dados;
    if (!code) return;

    const gtag = getGtag();
    if (!gtag) return;

    const chave = `ga_purchase_${code}`;
    try {
      if (localStorage.getItem(chave)) return; // já enviado antes
      localStorage.setItem(chave, "1");
    } catch {
      // Sem localStorage (navegação privada): segue mesmo assim - o
      // transaction_id ainda protege contra duplicidade do lado do Google.
    }

    const valor = Number(amount);
    const pessoas = Number(travelers);

    gtag("event", "purchase", {
      transaction_id: code,
      value: Number.isFinite(valor) && valor > 0 ? valor : 0,
      currency: "BRL",
      items: tripTitle
        ? [
            {
              item_id: code,
              item_name: tripTitle,
              quantity: Number.isFinite(pessoas) && pessoas > 0 ? pessoas : 1,
            },
          ]
        : undefined,
    });
  } catch {
    // Silêncio proposital: medição nunca pode atrapalhar a compra.
  }
}

/**
 * Quem é este visitante no Google Analytics, lido dos cookies que o próprio GA
 * grava. Vai junto ao abrir a reserva para que, quando o PIX confirmar pelo
 * servidor (longe do navegador), a compra caia na mesma pessoa e na mesma
 * sessão que veio do anúncio, e não como "acesso direto".
 *
 * Mesma regra do resto do arquivo: nunca lança erro. Sem GA (bloqueador, aba
 * anônima), devolve um objeto vazio e o checkout segue igual.
 */
export function visitanteGA(): { ga_client_id?: string; ga_session_id?: string } {
  try {
    if (typeof document === "undefined") return {};
    const cookies: Record<string, string> = {};
    for (const par of document.cookie.split(";")) {
      const i = par.indexOf("=");
      if (i > 0) cookies[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
    }
    // _ga = "GA1.1.<numero>.<numero>": o id do visitante são as duas últimas partes.
    const ga = (cookies["_ga"] || "").split(".");
    const client = ga.length >= 4 ? `${ga[ga.length - 2]}.${ga[ga.length - 1]}` : "";
    if (!/^\d+\.\d+$/.test(client)) return {};

    // _ga_<ID> guarda a sessão em um de dois formatos:
    //   antigo "GS1.1.<sessao>.<...>"   novo "GS2.1.s<sessao>$o3$g1$t..."
    let sessao = "";
    const nome = Object.keys(cookies).find((k) => k.startsWith("_ga_"));
    const valor = nome ? cookies[nome] : "";
    if (valor.startsWith("GS1.")) {
      sessao = valor.split(".")[2] || "";
    } else if (valor.startsWith("GS2.")) {
      const resto = valor.split(".").slice(2).join(".");
      sessao = (resto.split("$").find((p) => p.startsWith("s")) || "").slice(1);
    }
    return /^\d+$/.test(sessao) ? { ga_client_id: client, ga_session_id: sessao } : { ga_client_id: client };
  } catch {
    return {};
  }
}

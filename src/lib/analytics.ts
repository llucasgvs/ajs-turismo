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

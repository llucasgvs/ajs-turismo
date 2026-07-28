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

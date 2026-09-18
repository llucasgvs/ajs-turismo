"use client";

/* O que a página do Financeiro e a de Resumo têm em comum. */

export type Tipo = "pagar" | "receber";

export function hojeISO() {
  return new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
}

/** Dias até uma data, em dias de calendário de Brasília. */
export function diasAte(iso: string): number {
  const hoje = new Date(hojeISO() + "T00:00:00");
  const alvo = new Date(iso.slice(0, 10) + "T00:00:00");
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** Um seletor de uma escolha só, numa caixa única: é filtro, não aba. */
export function Segmentado({ valor, opcoes, onChange }: { valor: string; opcoes: { k: string; label: string; n?: number }[]; onChange: (k: string) => void }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-0.5 overflow-x-auto max-w-full">
      {opcoes.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            valor === o.k ? "bg-white text-navy-900 shadow-sm" : "text-gray-500 hover:text-navy-700"}`}>
          {o.label}{o.n != null && <span className={`ml-1.5 tabular-nums ${valor === o.k ? "text-gray-400" : "text-gray-400"}`}>{o.n}</span>}
        </button>
      ))}
    </div>
  );
}


/* ─── Cache de leitura ───────────────────────────────────────────────────────
 * Cada chamada à API custa ~1,5 s (servidor nos EUA, banco em São Paulo), e o
 * admin troca de mês e de aba o tempo todo. O que já foi carregado fica aqui,
 * por URL, e aparece na hora; a busca de novo acontece só quando algo mudou
 * (`versao` sobe a cada lançamento, pagamento, edição) ou quando o dado tem
 * mais de 2 minutos. Vive só enquanto a página está aberta. */
type Entrada = { versao: number; ts: number; dados: unknown };
const cache = new Map<string, Entrada>();
const emVoo = new Map<string, Promise<unknown>>();
const VALIDADE_MS = 2 * 60 * 1000;

export function lerCache<T>(chave: string, versao: number): T | null {
  const e = cache.get(chave);
  if (!e || e.versao !== versao || Date.now() - e.ts > VALIDADE_MS) return null;
  return e.dados as T;
}

export function buscar<T>(chave: string, versao: number, fetcher: () => Promise<T>): Promise<T> {
  const pronto = lerCache<T>(chave, versao);
  if (pronto !== null) return Promise.resolve(pronto);
  const k = `${chave}@${versao}`;
  const andando = emVoo.get(k);
  if (andando) return andando as Promise<T>;
  const p = fetcher().then((dados) => {
    cache.set(chave, { versao, ts: Date.now(), dados });
    emVoo.delete(k);
    return dados;
  }).catch((e) => { emVoo.delete(k); throw e; });
  emVoo.set(k, p);
  return p;
}

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


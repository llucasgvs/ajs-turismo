"use client";

/**
 * Card do painel: de onde vieram as vendas dos últimos 30 dias.
 *
 * Uma lista só, cada venda contada uma vez (a regra está no backend, em
 * GET /bookings/admin/origens). O dono pediu simples: canal, quantas vendas e
 * quanto. Busca os próprios dados para não mexer na carga do resto do painel.
 */
import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fmtBRL } from "@/lib/format";
import { CANAL_LABEL, COMO_CONHECEU_LABEL, nomeDaCampanha } from "@/lib/canais";
import { SkelLinhas } from "@/components/admin/Skeleton";

type Linha = { canal: string; vendas: number; valor: number; detalhes: { nome: string; vendas: number }[] };
type Resumo = { dias: number; canais: Linha[]; sem_origem: { vendas: number; valor: number } };

const NOME: Record<string, string> = { ...CANAL_LABEL, balcao: "Balcão" };

function detalhe(l: Linha): string {
  if (!l.detalhes.length) return "";
  const nome = (n: string) => (l.canal === "balcao" ? COMO_CONHECEU_LABEL[n] || n : nomeDaCampanha(n));
  return l.detalhes.map((d) => `${nome(d.nome)} ${d.vendas}`).join(" · ");
}

export function OrigemDasVendas() {
  const [dados, setDados] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiFetch("/bookings/admin/origens?dias=30")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (vivo) setDados(d); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  const maior = Math.max(1, ...(dados?.canais ?? []).map((c) => c.vendas));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-navy-800 flex items-center gap-2 text-sm">
          <Globe size={14} className="text-navy-400" /> De onde vieram as vendas
        </h3>
        <span className="text-[11px] text-gray-400">últimos 30 dias</span>
      </div>

      {!dados && !erro && <div className="p-5"><SkelLinhas n={4} altura="h-8" /></div>}
      {erro && <div className="py-10 text-center text-gray-400 text-xs">Não foi possível carregar agora.</div>}

      {dados && (
        <div className="px-5 py-4 space-y-3">
          {dados.canais.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              As vendas novas vão aparecer aqui com a origem de cada uma.
            </p>
          ) : dados.canais.map((l) => {
            const sub = detalhe(l);
            return (
              <div key={l.canal}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-navy-800 truncate">{NOME[l.canal] || l.canal}</span>
                  <span className="text-navy-700 tabular-nums whitespace-nowrap">
                    <b>{l.vendas}</b> {l.vendas === 1 ? "venda" : "vendas"}
                    <span className="text-gray-400"> · R$ {fmtBRL(l.valor)}</span>
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                  <div className={`h-full rounded-full ${l.canal === "google_ads" ? "bg-gold-400" : "bg-navy-300"}`}
                    style={{ width: `${Math.max(4, Math.round((l.vendas / maior) * 100))}%` }} />
                </div>
                {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
              </div>
            );
          })}
          {dados.sem_origem.vendas > 0 && (
            <p className="text-[11px] text-gray-400 pt-1">
              Sem origem registrada: {dados.sem_origem.vendas} {dados.sem_origem.vendas === 1 ? "venda" : "vendas"} (anteriores a esta mudança).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

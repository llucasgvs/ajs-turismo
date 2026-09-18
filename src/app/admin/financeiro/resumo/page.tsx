"use client";

/* Resumo do Financeiro: totais por período e por categoria. Página própria,
 * como Listas está para Reservas: é leitura, e as abas do Financeiro são a
 * operação do dia (lançar, pagar, receber). */

import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet, ShoppingBag } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fmtBRL } from "@/lib/format";
import { Skel } from "@/components/admin/Skeleton";
import { Segmentado, hojeISO, buscar, lerCache, type Tipo } from "../_shared";

type Bloco = { em_aberto: number; qtd_em_aberto: number; atrasado: number; qtd_atrasadas: number; quitado: number; qtd_quitadas: number; previsto: number; total: number };
type Resumo = { pagar: Bloco; receber: Bloco; saldo: number; saldo_realizado: number;
  vendas: { bruto: number; liquido: number; taxas: number; qtd: number }; saldo_com_vendas: number;
  por_categoria: Record<Tipo, { categoria: string; quitado: number; em_aberto: number; total: number; qtd: number }[]> };

const PERIODOS = [
  { k: "mes", label: "Este mês" }, { k: "3m", label: "Últimos 3 meses" }, { k: "ano", label: "Este ano" },
  { k: "12m", label: "Próximos 12 meses" }, { k: "tudo", label: "Tudo" },
] as const;

function periodo(k: (typeof PERIODOS)[number]["k"]): { de?: string; ate?: string } {
  const h = new Date(hojeISO() + "T12:00:00");
  const iso = (d: Date) => d.toLocaleDateString("sv");
  const fimMes = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  if (k === "mes") return { de: iso(new Date(h.getFullYear(), h.getMonth(), 1)), ate: iso(fimMes(h)) };
  if (k === "3m") return { de: iso(new Date(h.getFullYear(), h.getMonth() - 2, 1)), ate: iso(fimMes(h)) };
  if (k === "ano") return { de: `${h.getFullYear()}-01-01`, ate: `${h.getFullYear()}-12-31` };
  if (k === "12m") return { de: iso(new Date(h.getFullYear(), h.getMonth(), 1)), ate: iso(fimMes(new Date(h.getFullYear(), h.getMonth() + 11, 1))) };
  return {};
}

export default function ResumoPage() {
  const versao = 0;
  const [per, setPer] = useState<(typeof PERIODOS)[number]["k"]>("mes");
  const [dados, setDados] = useState<Resumo | null>(null);

  useEffect(() => {
    const { de, ate } = periodo(per);
    const ps = new URLSearchParams();
    if (de) ps.set("de", de);
    if (ate) ps.set("ate", ate);
    const chave = `/financeiro/resumo?${ps}`;
    const pronto = lerCache<Resumo>(chave, versao);
    setDados(pronto ?? null);
    buscar<Resumo>(chave, versao, () => apiFetch(chave).then((r) => r.json())).then(setDados).catch(() => { if (!pronto) setDados(null); });
  }, [per, versao]);

  const Linha = ({ rotulo, valor, qtd, cor }: { rotulo: string; valor: number; qtd?: number; cor?: string }) => (
    <div className="flex items-baseline justify-between gap-2 py-1.5">
      <span className="text-sm text-gray-600">{rotulo}{qtd != null && <span className="text-gray-400 text-xs"> · {qtd}</span>}</span>
      <span className={`font-bold tabular-nums text-sm ${cor ?? "text-navy-800"}`}>R$ {fmtBRL(valor)}</span>
    </div>
  );

  const Painel = ({ tipo, b }: { tipo: Tipo; b: Bloco }) => {
    const pagar = tipo === "pagar";
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-bold uppercase tracking-wide ${pagar ? "text-red-600" : "text-emerald-600"}`}>{pagar ? "A pagar" : "A receber"}</p>
          {pagar ? <ArrowUpCircle size={16} className="text-red-500" /> : <ArrowDownCircle size={16} className="text-emerald-500" />}
        </div>
        <p className={`font-display font-black text-2xl tabular-nums ${pagar ? "text-red-600" : "text-emerald-600"}`}>R$ {fmtBRL(b.total)}</p>
        <p className="text-[11px] text-gray-400 mb-3">{pagar ? "pago" : "recebido"} + em aberto{Math.abs(b.total - b.previsto) > 0.009 && <> · previsto {fmtBRL(b.previsto)}</>}</p>
        <div className="divide-y divide-gray-50 border-t border-gray-100">
          <Linha rotulo={pagar ? "Pagas" : "Recebidas"} valor={b.quitado} qtd={b.qtd_quitadas} cor="text-emerald-600" />
          <Linha rotulo="Em aberto" valor={b.em_aberto} qtd={b.qtd_em_aberto} />
          <Linha rotulo="Atrasadas" valor={b.atrasado} qtd={b.qtd_atrasadas} cor={b.atrasado > 0 ? "text-red-600" : "text-gray-400"} />
        </div>
      </div>
    );
  };

  const Categorias = ({ tipo }: { tipo: Tipo }) => {
    const itens = dados?.por_categoria[tipo] ?? [];
    const max = Math.max(1, ...itens.map((c) => c.total));
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{tipo === "pagar" ? "Gastos por categoria" : "Recebimentos por categoria"}</p>
        {itens.length === 0 ? <p className="text-sm text-gray-400">Nada no período.</p> : (
          <div className="space-y-2.5">
            {itens.map((c) => (
              <div key={c.categoria}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-navy-800 font-semibold">{c.categoria} <span className="text-gray-400 text-xs font-normal">· {c.qtd}</span></span>
                  <span className="tabular-nums font-bold text-navy-800">R$ {fmtBRL(c.total)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden flex">
                  <div className={`h-full ${tipo === "pagar" ? "bg-red-400" : "bg-emerald-500"}`} style={{ width: `${(c.quitado / max) * 100}%` }} title={`quitado R$ ${fmtBRL(c.quitado)}`} />
                  <div className={`h-full ${tipo === "pagar" ? "bg-red-200" : "bg-emerald-200"}`} style={{ width: `${(c.em_aberto / max) * 100}%` }} title={`em aberto R$ ${fmtBRL(c.em_aberto)}`} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-400">Barra cheia = quitado · barra clara = em aberto</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-black text-2xl md:text-3xl text-navy-800">Resumo financeiro</h1>
        <p className="text-gray-500 text-sm mt-0.5">Vendas, contas a pagar e a receber, por período e por categoria</p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-bold text-navy-800">Período</p>
        <Segmentado valor={per} onChange={(v) => setPer(v as typeof per)} opcoes={PERIODOS.map((p) => ({ k: p.k, label: p.label }))} />
      </div>
      {!dados ? <div className="grid md:grid-cols-2 gap-4">{[0, 1].map((i) => <Skel key={i} className="h-48 rounded-2xl" />)}</div> : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* As vendas (site e balcão) pela MESMA conta do Dashboard, por
                data de confirmação. Entram pelo LÍQUIDO no saldo: é o que cai
                na conta depois da taxa do Asaas. */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-navy-600">Vendas de viagens</p>
                <ShoppingBag size={16} className="text-navy-500" />
              </div>
              <p className="font-display font-black text-2xl tabular-nums text-navy-800">R$ {fmtBRL(dados.vendas.liquido)}</p>
              <p className="text-[11px] text-gray-400 mb-3">líquido, já sem a taxa do Asaas</p>
              <div className="divide-y divide-gray-50 border-t border-gray-100">
                <Linha rotulo="Vendas confirmadas" valor={dados.vendas.bruto} qtd={dados.vendas.qtd} />
                <Linha rotulo="Taxas do Asaas" valor={dados.vendas.taxas} cor="text-gray-500" />
                <Linha rotulo="Fica para a AJS" valor={dados.vendas.liquido} cor="text-emerald-600" />
              </div>
            </div>
            <Painel tipo="receber" b={dados.receber} />
            <Painel tipo="pagar" b={dados.pagar} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Saldo do período</p>
                <Wallet size={16} className="text-navy-500" />
              </div>
              <p className={`font-display font-black text-2xl tabular-nums ${dados.saldo_com_vendas >= 0 ? "text-navy-800" : "text-red-600"}`}>R$ {fmtBRL(dados.saldo_com_vendas)}</p>
              <p className="text-[11px] text-gray-400 mb-3">vendas líquidas + a receber − a pagar</p>
              <div className="divide-y divide-gray-50 border-t border-gray-100">
                <Linha rotulo="Vendas líquidas" valor={dados.vendas.liquido} cor="text-emerald-600" />
                <Linha rotulo="A receber (contas)" valor={dados.receber.total} cor="text-emerald-600" />
                <Linha rotulo="A pagar (contas)" valor={-dados.pagar.total} cor="text-red-600" />
                <Linha rotulo="Atrasado (pagar + receber)" valor={dados.pagar.atrasado + dados.receber.atrasado} qtd={dados.pagar.qtd_atrasadas + dados.receber.qtd_atrasadas} cor={dados.pagar.atrasado + dados.receber.atrasado > 0 ? "text-red-600" : "text-gray-400"} />
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Categorias tipo="pagar" />
            <Categorias tipo="receber" />
          </div>
        </>
      )}
    </div>
  );
}


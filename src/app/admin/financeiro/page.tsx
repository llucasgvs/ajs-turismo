"use client";

/* Financeiro: contas a pagar e a receber, lançadas na mão.
 *
 * Separado do Dashboard de propósito: aqui não entra venda do site, reserva
 * nem viagem. É o que a AJS paga (luz, servidor, ônibus, aluguel) e o que
 * recebe por fora (comissão, hotel, repasse). A junção com a receita do site
 * fica para uma etapa seguinte.
 *
 * Três telas num arquivo: o Mês (a principal), a Lista com filtros, e as
 * Recorrentes. Todo número vem pronto do servidor (`/financeiro/mes`); a tela
 * não soma nada, senão os dois desencontram. */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2,
  Plus, Repeat, RotateCcw, Search, X, Pencil, Wallet, Ban, Copy,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { erroDaApi, fmtBRL, fmtDia } from "@/lib/format";
import { Skel } from "@/components/admin/Skeleton";
import { useFecharComEsc } from "@/hooks/useFecharComEsc";
import { Segmentado, hojeISO, diasAte, type Tipo } from "./_shared";

type Status = "pendente" | "paga" | "atrasada" | "cancelada";

type Parcela = {
  id: number; conta_id: number; tipo: Tipo; descricao: string; categoria: string;
  contraparte: string | null; vencimento: string; valor: number;
  pago_em: string | null; valor_pago: number | null; observacao: string | null;
  cancelada: boolean; status: Status; recorrencia: "nenhuma" | "mensal" | "anual";
};

type Conta = {
  id: number; tipo: Tipo; descricao: string; categoria: string; contraparte: string | null;
  observacao: string | null; valor: number; recorrencia: "nenhuma" | "mensal" | "anual";
  primeiro_vencimento: string; recorrencia_fim: string | null; ativa: boolean;
  parcelas_em_aberto: number; proximo_vencimento: string | null;
};

type ResumoTipo = { previsto: number; total: number; quitado: number; em_aberto: number; atrasado: number; qtd_atrasadas: number };
type Mes = { ano: number; mes: number; receber: ResumoTipo; pagar: ResumoTipo; saldo_previsto: number; saldo_realizado: number; parcelas: Parcela[] };
type Categorias = Record<Tipo, string[]>;

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const RECORRENCIA = { nenhuma: "Única", mensal: "Mensal", anual: "Anual" } as const;

const STATUS_CLS: Record<Status, string> = {
  pendente: "bg-blue-50 text-blue-700",
  paga: "bg-emerald-50 text-emerald-700",
  atrasada: "bg-red-50 text-red-700",
  cancelada: "bg-gray-100 text-gray-400",
};
const STATUS_TXT: Record<Status, string> = { pendente: "Pendente", paga: "Quitada", atrasada: "Atrasada", cancelada: "Cancelada" };


/** Uma conta que vence hoje não pode parecer igual a uma de daqui a três
 *  semanas: selo âmbar nos próximos 3 dias, só para as em aberto. */
function Prazo({ p }: { p: Parcela }) {
  if (p.status !== "pendente") return null;
  const d = diasAte(p.vencimento);
  if (d > 3) return null;
  const texto = d <= 0 ? "vence hoje" : d === 1 ? "vence amanhã" : `vence em ${d} dias`;
  return <span className="ml-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">{texto}</span>;
}

/* ─── Página ─── */

export default function FinanceiroPage() {
  const [aba, setAba] = useState<"mes" | "lista" | "recorrentes">("mes");
  const [categorias, setCategorias] = useState<Categorias | null>(null);
  const [novo, setNovo] = useState<{ tipo: Tipo; base?: Parcela } | null>(null);
  const [versao, setVersao] = useState(0);         // incrementa para as abas recarregarem
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    apiFetch("/financeiro/categorias").then((r) => r.json()).then(setCategorias).catch(() => setCategorias({ pagar: [], receber: [] }));
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-navy-800">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-0.5">Contas a pagar e a receber, fora das vendas do site</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setNovo({ tipo: "receber" })}
            className="flex items-center gap-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <ArrowDownCircle size={16} /> A receber
          </button>
          <button onClick={() => setNovo({ tipo: "pagar" })}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <Plus size={16} /> A pagar
          </button>
        </div>
      </div>

      {/* Abas com sublinhado, e não pílulas: as pílulas ficam para os filtros
          dentro de cada aba, senão os dois níveis parecem a mesma coisa. */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
        {([
          ["mes", "Mês a mês", "as contas de cada mês, para pagar e receber"],
          ["lista", "Lançamentos", "todos, com busca e filtros"],
          ["recorrentes", "Recorrentes", "as contas que repetem"],
        ] as const).map(([k, label, dica]) => (
          <button key={k} onClick={() => setAba(k)} title={dica}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              aba === k ? "border-gold-500 text-navy-900" : "border-transparent text-gray-500 hover:text-navy-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === "mes" && <AbaMes versao={versao} onMudou={recarregar} onDuplicar={(p) => setNovo({ tipo: p.tipo, base: p })} />}
      {aba === "lista" && <AbaLista versao={versao} onMudou={recarregar} categorias={categorias} onDuplicar={(p) => setNovo({ tipo: p.tipo, base: p })} />}
      {aba === "recorrentes" && <AbaRecorrentes versao={versao} onMudou={recarregar} categorias={categorias} />}

      {novo && categorias && (
        <NovaContaModal tipo={novo.tipo} base={novo.base} categorias={categorias[novo.tipo]} onClose={() => setNovo(null)}
          onSaved={() => { setNovo(null); recarregar(); }} />
      )}
    </div>
  );
}

/* ─── Aba: Mês ─── */

function AbaMes({ versao, onMudou, onDuplicar }: { versao: number; onMudou: () => void; onDuplicar: (p: Parcela) => void }) {
  const hoje = new Date(hojeISO() + "T12:00:00");
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [dados, setDados] = useState<Mes | null>(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todas" | Tipo>("todas");

  useEffect(() => {
    let cancelado = false;
    setDados(null); setErro("");
    apiFetch(`/financeiro/mes?ano=${ano}&mes=${mes}`)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (!cancelado) setDados(d); })
      .catch(() => { if (!cancelado) setErro("Não foi possível carregar o mês."); });
    return () => { cancelado = true; };
  }, [ano, mes, versao]);

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear()); setMes(d.getMonth() + 1);
  };
  const ehHoje = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;

  const parcelas = useMemo(() => (dados?.parcelas ?? []).filter((p) => filtro === "todas" || p.tipo === filtro), [dados, filtro]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => mudarMes(-1)} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50"><ChevronLeft size={16} /></button>
        <div className="min-w-[180px] text-center">
          <p className="font-display font-black text-lg text-navy-800 leading-tight">{MESES[mes - 1]} {ano}</p>
          {!ehHoje && <button onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth() + 1); }} className="text-[11px] text-navy-500 underline">voltar para hoje</button>}
        </div>
        <button onClick={() => mudarMes(1)} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50"><ChevronRight size={16} /></button>
      </div>

      {erro && <p className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{erro}</p>}

      {!dados && !erro && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-24 rounded-2xl" />)}</div>
      )}

      {dados && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* O total é quitado + em aberto: o aluguel pago por 1.950 conta
                1.950, não os 2.000 previstos. O previsto aparece quando difere. */}
            <Card titulo="A receber" valor={dados.receber.total} cor="text-emerald-600" icone={ArrowDownCircle}
              sub={`${fmtBRL(dados.receber.quitado)} recebido · ${fmtBRL(dados.receber.em_aberto)} em aberto${Math.abs(dados.receber.total - dados.receber.previsto) > 0.009 ? ` · previsto ${fmtBRL(dados.receber.previsto)}` : ""}`} />
            <Card titulo="A pagar" valor={dados.pagar.total} cor="text-red-600" icone={ArrowUpCircle}
              sub={`${fmtBRL(dados.pagar.quitado)} pago · ${fmtBRL(dados.pagar.em_aberto)} em aberto${Math.abs(dados.pagar.total - dados.pagar.previsto) > 0.009 ? ` · previsto ${fmtBRL(dados.pagar.previsto)}` : ""}`} />
            <Card titulo="Saldo do mês" valor={dados.saldo_previsto} sub={`já realizado ${fmtBRL(dados.saldo_realizado)}`} cor={dados.saldo_previsto >= 0 ? "text-navy-700" : "text-red-600"} icone={Wallet} />
            <Card titulo="Atrasados"
              valor={dados.pagar.atrasado + dados.receber.atrasado}
              sub={`${dados.pagar.qtd_atrasadas + dados.receber.qtd_atrasadas} ${dados.pagar.qtd_atrasadas + dados.receber.qtd_atrasadas === 1 ? "conta" : "contas"}`}
              cor={dados.pagar.atrasado + dados.receber.atrasado > 0 ? "text-red-600" : "text-gray-400"} icone={AlertTriangle} />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-bold text-navy-800">Contas de {MESES[mes - 1].toLowerCase()}</p>
            <Segmentado
              valor={filtro}
              onChange={(v) => setFiltro(v as "todas" | Tipo)}
              opcoes={[
                { k: "todas", label: "Todas", n: dados.parcelas.length },
                { k: "pagar", label: "A pagar", n: dados.parcelas.filter((p) => p.tipo === "pagar").length },
                { k: "receber", label: "A receber", n: dados.parcelas.filter((p) => p.tipo === "receber").length },
              ]}
            />
          </div>

          <Tabela parcelas={parcelas} onMudou={onMudou} onDuplicar={onDuplicar} vazio="Nenhuma conta neste mês. Lance a primeira nos botões acima." />
        </>
      )}
    </div>
  );
}

function Card({ titulo, valor, sub, cor, icone: Icon }: { titulo: string; valor: number; sub: string; cor: string; icone: typeof Wallet }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{titulo}</p>
        <Icon size={14} className={cor} />
      </div>
      <p className={`font-display font-black text-lg xl:text-2xl tabular-nums whitespace-nowrap ${cor}`}>R$ {fmtBRL(valor)}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── Aba: Todas ─── */

function AbaLista({ versao, onMudou, categorias, onDuplicar }: { versao: number; onMudou: () => void; categorias: Categorias | null; onDuplicar: (p: Parcela) => void }) {
  const [tipo, setTipo] = useState<"" | Tipo>("");
  const [status, setStatus] = useState<"" | "aberta" | "atrasada" | "paga" | "cancelada">("aberta");
  const [categoria, setCategoria] = useState("");
  const [q, setQ] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 30;

  // Mudou filtro, volta para a primeira página.
  useEffect(() => { setPagina(1); }, [tipo, status, categoria, q, de, ate]);

  useEffect(() => {
    const t = setTimeout(() => {
      const ps = new URLSearchParams();
      if (tipo) ps.set("tipo", tipo);
      if (status) ps.set("status", status);
      if (categoria) ps.set("categoria", categoria);
      if (q.trim()) ps.set("q", q.trim());
      if (de) ps.set("de", de);
      if (ate) ps.set("ate", ate);
      ps.set("limit", String(POR_PAGINA));
      ps.set("skip", String((pagina - 1) * POR_PAGINA));
      setParcelas(null);
      apiFetch(`/financeiro/parcelas?${ps}`).then((r) => r.json())
        .then((d) => { setParcelas(d.items ?? []); setTotal(d.total ?? 0); })
        .catch(() => { setParcelas([]); setTotal(0); });
    }, 250);
    return () => clearTimeout(t);
  }, [tipo, status, categoria, q, de, ate, versao, pagina]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const cats = tipo ? (categorias?.[tipo] ?? []) : [...(categorias?.pagar ?? []), ...(categorias?.receber ?? [])];
  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição ou fornecedor"
            className={`${sel} w-full pl-9`} />
        </div>
        <select value={tipo} onChange={(e) => { setTipo(e.target.value as "" | Tipo); setCategoria(""); }} className={sel}>
          <option value="">Pagar e receber</option><option value="pagar">A pagar</option><option value="receber">A receber</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={sel}>
          <option value="aberta">Em aberto</option><option value="atrasada">Atrasadas</option><option value="paga">Quitadas</option><option value="cancelada">Canceladas</option><option value="">Todas</option>
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={sel}>
          <option value="">Toda categoria</option>{[...new Set(cats)].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={sel} title="Vencimento a partir de" />
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={sel} title="Vencimento até" />
      </div>
      {parcelas === null ? <Skel className="h-40 rounded-2xl" /> : (
        <>
          <Tabela parcelas={parcelas} onMudou={onMudou} onDuplicar={onDuplicar} vazio="Nada com esses filtros." mostrarTipo />
          {total > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{total} {total === 1 ? "lançamento" : "lançamentos"} · página {pagina} de {paginas}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
                <button onClick={() => setPagina((p) => Math.min(paginas, p + 1))} disabled={pagina >= paginas}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Aba: Recorrentes ─── */

function AbaRecorrentes({ versao, onMudou, categorias }: { versao: number; onMudou: () => void; categorias: Categorias | null }) {
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [encerrando, setEncerrando] = useState<Conta | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setContas(null);
    apiFetch("/financeiro/contas?recorrentes=true&ativas=true").then((r) => r.json()).then(setContas).catch(() => setContas([]));
  }, [versao]);

  const encerrar = async () => {
    if (!encerrando) return;
    setOcupado(true);
    try {
      const r = await apiFetch(`/financeiro/contas/${encerrando.id}/encerrar`, { method: "POST" });
      if (r.ok) { setEncerrando(null); onMudou(); }
    } finally { setOcupado(false); }
  };

  if (contas === null) return <Skel className="h-40 rounded-2xl" />;
  if (contas.length === 0) return <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-2xl p-6 text-center">Nenhuma conta recorrente ativa. Ao lançar uma conta, escolha "Mensal" ou "Anual".</p>;

  return (
    <div className="space-y-2">
      {contas.map((c) => (
        <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gold-100 text-gold-600">
            <Repeat size={16} strokeWidth={2.5} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy-800 text-sm truncate">{c.descricao}{c.contraparte && <span className="text-gray-400 font-normal"> · {c.contraparte}</span>}</p>
            <p className="text-xs text-gray-400">
              {RECORRENCIA[c.recorrencia]} · dia {c.primeiro_vencimento.slice(8, 10)} · {c.categoria}
              {c.proximo_vencimento && <> · próxima em {fmtDia(c.proximo_vencimento)}</>}
              {c.recorrencia_fim && <> · até {fmtDia(c.recorrencia_fim)}</>}
            </p>
          </div>
          <p className={`font-bold tabular-nums text-sm ${c.tipo === "pagar" ? "text-red-600" : "text-emerald-600"}`}>R$ {fmtBRL(c.valor)}</p>
          <button onClick={() => setEditando(c)} title="Editar a regra (vale daqui para a frente)"
            className="w-8 h-8 rounded-lg border border-gray-200 text-navy-600 hover:bg-gray-50 flex items-center justify-center"><Pencil size={13} /></button>
          <button onClick={() => setEncerrando(c)} title="Encerrar: cancela as parcelas futuras"
            className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center"><Ban size={13} /></button>
        </div>
      ))}

      {editando && categorias && (
        <EditarContaModal conta={editando} categorias={categorias[editando.tipo]} onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); onMudou(); }} />
      )}
      {encerrando && (
        <Confirmar titulo="Encerrar esta conta?" onClose={() => setEncerrando(null)} onConfirm={encerrar} loading={ocupado} rotulo="Encerrar"
          texto={<>As parcelas futuras de <strong>{encerrando.descricao}</strong> serão canceladas. As que já foram quitadas ficam no histórico.</>} />
      )}
    </div>
  );
}

/* ─── Tabela de parcelas (Mês e Todas) ─── */

function Tabela({ parcelas, onMudou, onDuplicar, vazio, mostrarTipo }: { parcelas: Parcela[]; onMudou: () => void; onDuplicar: (p: Parcela) => void; vazio: string; mostrarTipo?: boolean }) {
  const [quitando, setQuitando] = useState<Parcela | null>(null);
  const [editando, setEditando] = useState<Parcela | null>(null);
  const [cancelando, setCancelando] = useState<Parcela | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const reabrir = async (p: Parcela) => {
    setOcupado(p.id);
    try { await apiFetch(`/financeiro/parcelas/${p.id}/reabrir`, { method: "POST" }); onMudou(); }
    finally { setOcupado(null); }
  };
  const cancelar = async () => {
    if (!cancelando) return;
    setOcupado(cancelando.id);
    try { const r = await apiFetch(`/financeiro/parcelas/${cancelando.id}/cancelar`, { method: "POST" }); if (r.ok) { setCancelando(null); onMudou(); } }
    finally { setOcupado(null); }
  };

  if (parcelas.length === 0) {
    return <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-2xl p-6 text-center">{vazio}</p>;
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-3 py-2.5 font-bold">Vence</th>
                <th className="text-left px-3 py-2.5 font-bold">Conta</th>
                <th className="text-left px-3 py-2.5 font-bold hidden xl:table-cell">Categoria</th>
                <th className="text-right px-3 py-2.5 font-bold">Valor</th>
                <th className="text-left px-3 py-2.5 font-bold hidden md:table-cell">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parcelas.map((p) => {
                const aberta = p.status === "pendente" || p.status === "atrasada";
                return (
                  <tr key={p.id} className={`${p.cancelada ? "opacity-50" : ""} hover:bg-gray-50/60`}>
                    <td className="px-3 py-3 whitespace-nowrap tabular-nums text-navy-800 text-xs md:text-sm">
                      {fmtDia(p.vencimento)}
                      {p.recorrencia !== "nenhuma" && <Repeat size={12} className="inline ml-1.5 text-gold-500" strokeWidth={2.5} aria-label="recorrente" />}
                      <Prazo p={p} />
                    </td>
                    <td className="px-3 py-3 min-w-[140px]">
                      <p className="font-semibold text-navy-800 leading-tight">
                        {mostrarTipo && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${p.tipo === "pagar" ? "bg-red-400" : "bg-emerald-500"}`} />}
                        {p.descricao}
                      </p>
                      {p.contraparte && <p className="text-xs text-gray-400">{p.contraparte}</p>}
                      <span className={`md:hidden inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_CLS[p.status]}`}>{STATUS_TXT[p.status]}</span>
                      {p.status === "paga" && p.pago_em && (
                        <p className="text-[11px] text-emerald-600">{p.tipo === "pagar" ? "pago" : "recebido"} em {fmtDia(p.pago_em)}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-500 hidden xl:table-cell whitespace-nowrap">{p.categoria}</td>
                    <td className={`px-3 py-3 text-right whitespace-nowrap tabular-nums font-bold text-xs md:text-sm ${p.tipo === "pagar" ? "text-red-600" : "text-emerald-600"}`}>
                      {/* Quitada: o que de fato saiu/entrou é o número principal;
                          o previsto fica embaixo quando difere. */}
                      {p.tipo === "pagar" ? "−" : "+"} R$ {fmtBRL(p.status === "paga" && p.valor_pago != null ? p.valor_pago : p.valor)}
                      {p.status === "paga" && p.valor_pago != null && Math.abs(p.valor_pago - p.valor) > 0.009 && (
                        <p className="text-[10px] font-normal text-gray-400">previsto {fmtBRL(p.valor)}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_CLS[p.status]}`}>{STATUS_TXT[p.status]}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {aberta && (
                          <button onClick={() => setQuitando(p)} disabled={ocupado === p.id}
                            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50 ${p.tipo === "pagar" ? "bg-navy-700 hover:bg-navy-600" : "bg-emerald-500 hover:bg-emerald-400"}`}>
                            <Check size={12} /><span className="hidden md:inline">{p.tipo === "pagar" ? "Pagar" : "Receber"}</span>
                          </button>
                        )}
                        {!p.cancelada && (
                          <button onClick={() => onDuplicar(p)} title="Lançar outra igual a esta"
                            className="w-8 h-8 rounded-lg border border-gray-200 text-navy-600 hover:bg-gray-50 flex items-center justify-center"><Copy size={12} /></button>
                        )}
                        {p.status === "paga" && (
                          <button onClick={() => reabrir(p)} disabled={ocupado === p.id} title="Desfazer a quitação"
                            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center disabled:opacity-50">
                            {ocupado === p.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          </button>
                        )}
                        {aberta && (
                          <>
                            <button onClick={() => setEditando(p)} title="Editar esta parcela"
                              className="w-8 h-8 rounded-lg border border-gray-200 text-navy-600 hover:bg-gray-50 flex items-center justify-center"><Pencil size={12} /></button>
                            <button onClick={() => setCancelando(p)} title="Cancelar esta parcela"
                              className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center"><X size={12} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {quitando && <QuitarModal parcela={quitando} onClose={() => setQuitando(null)} onSaved={() => { setQuitando(null); onMudou(); }} />}
      {editando && <EditarParcelaModal parcela={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); onMudou(); }} />}
      {cancelando && (
        <Confirmar titulo="Cancelar esta parcela?" rotulo="Cancelar parcela" onClose={() => setCancelando(null)} onConfirm={cancelar} loading={ocupado === cancelando.id}
          texto={<><strong>{cancelando.descricao}</strong> de {fmtDia(cancelando.vencimento)}, R$ {fmtBRL(cancelando.valor)}. Só esta parcela; a conta recorrente continua.</>} />
      )}
    </>
  );
}

/* ─── Modais ─── */

function Moldura({ titulo, sub, onClose, children }: { titulo: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  useFecharComEsc(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between gap-2 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div><h3 className="font-bold text-navy-800 text-base">{titulo}</h3>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 -mr-2 -mt-1 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

const campo = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300";
const rotulo = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

function numero(v: string): number {
  return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
}

/** Vencimento sugerido ao duplicar: o mesmo dia, um mês depois (o caso
 *  típico é "a mesma conta de novo no mês que vem"). */
function umMesDepois(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();     // último dia do mês seguinte
  const alvo = new Date(y, m, Math.min(d, ultimo));
  return alvo.toLocaleDateString("sv");
}

function NovaContaModal({ tipo, base, categorias, onClose, onSaved }: { tipo: Tipo; base?: Parcela; categorias: string[]; onClose: () => void; onSaved: () => void }) {
  const [descricao, setDescricao] = useState(base?.descricao ?? "");
  const [categoria, setCategoria] = useState(base?.categoria ?? categorias[0] ?? "");
  const [contraparte, setContraparte] = useState(base?.contraparte ?? "");
  const [valor, setValor] = useState(base ? fmtBRL(base.status === "paga" && base.valor_pago != null ? base.valor_pago : base.valor) : "");
  const [vencimento, setVencimento] = useState(base ? umMesDepois(base.vencimento) : hojeISO());
  const [recorrencia, setRecorrencia] = useState<"nenhuma" | "mensal" | "anual">("nenhuma");
  const [fim, setFim] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro("");
    if (descricao.trim().length < 2) { setErro("Descreva a conta."); return; }
    if (numero(valor) <= 0) { setErro("Informe o valor."); return; }
    if (!vencimento) { setErro("Informe o vencimento."); return; }
    setSalvando(true);
    try {
      const r = await apiFetch("/financeiro/contas", {
        method: "POST",
        body: JSON.stringify({
          tipo, descricao: descricao.trim(), categoria, contraparte: contraparte.trim() || null,
          observacao: obs.trim() || null, valor: numero(valor), recorrencia,
          primeiro_vencimento: vencimento, recorrencia_fim: recorrencia !== "nenhuma" && fim ? fim : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(erroDaApi(d, "Não foi possível salvar.")); return; }
      onSaved();
    } catch { setErro("Erro de conexão."); }
    finally { setSalvando(false); }
  };

  return (
    <Moldura titulo={tipo === "pagar" ? "Nova conta a pagar" : "Novo valor a receber"} sub={base ? `Copiada de "${base.descricao}" (${fmtDia(base.vencimento)}). Ajuste o que mudou.` : undefined} onClose={onClose}>
      <form onSubmit={enviar} className="p-5 space-y-4">
        <div>
          <label className={rotulo}>{tipo === "pagar" ? "Conta" : "Descrição"}</label>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} autoFocus
            placeholder={tipo === "pagar" ? "Luz do escritório" : "Comissão do Hotel Recanto"} className={campo} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={campo}>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={rotulo}>{tipo === "pagar" ? "Fornecedor" : "Quem paga"} <span className="text-gray-300 normal-case font-normal">(opcional)</span></label>
            <input value={contraparte} onChange={(e) => setContraparte(e.target.value)} maxLength={200} placeholder={tipo === "pagar" ? "Copel" : "Hotel Recanto"} className={campo} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${campo} pl-9 tabular-nums`} />
            </div>
          </div>
          <div>
            <label className={rotulo}>{recorrencia === "nenhuma" ? "Vencimento" : "Primeiro vencimento"}</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={campo} />
          </div>
        </div>
        <div>
          <label className={rotulo}>Repete</label>
          <div className="flex gap-2">
            {(["nenhuma", "mensal", "anual"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRecorrencia(r)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${recorrencia === r ? "bg-navy-800 text-white border-navy-800" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {r === "nenhuma" ? "Não" : RECORRENCIA[r]}
              </button>
            ))}
          </div>
          {recorrencia !== "nenhuma" && (
            <div className="mt-2">
              <label className={rotulo}>Até <span className="text-gray-300 normal-case font-normal">(opcional; vazio = sem fim)</span></label>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} min={vencimento} className={campo} />
              <p className="text-[11px] text-gray-400 mt-1">Todo {recorrencia === "mensal" ? "mês" : "ano"} no dia {vencimento ? vencimento.slice(8, 10) : "…"}. Cada parcela pode ser ajustada depois sem mexer na regra.</p>
            </div>
          )}
        </div>
        <div>
          <label className={rotulo}>Observação <span className="text-gray-300 normal-case font-normal">(opcional)</span></label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className={campo} />
        </div>
        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm">Cancelar</button>
          <button type="submit" disabled={salvando}
            className={`flex-1 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2 ${tipo === "pagar" ? "bg-navy-700 hover:bg-navy-600" : "bg-emerald-500 hover:bg-emerald-400"}`}>
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
          </button>
        </div>
      </form>
    </Moldura>
  );
}

function QuitarModal({ parcela, onClose, onSaved }: { parcela: Parcela; onClose: () => void; onSaved: () => void }) {
  const [quando, setQuando] = useState(hojeISO());
  const [quanto, setQuanto] = useState(fmtBRL(parcela.valor));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const pagar = parcela.tipo === "pagar";

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(""); setSalvando(true);
    try {
      const r = await apiFetch(`/financeiro/parcelas/${parcela.id}/quitar`, {
        method: "POST", body: JSON.stringify({ pago_em: quando || null, valor_pago: numero(quanto) }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(erroDaApi(d, "Não foi possível quitar.")); return; }
      onSaved();
    } catch { setErro("Erro de conexão."); }
    finally { setSalvando(false); }
  };

  return (
    <Moldura titulo={pagar ? "Marcar como paga" : "Marcar como recebida"} sub={`${parcela.descricao} · vence ${fmtDia(parcela.vencimento)}`} onClose={onClose}>
      <form onSubmit={enviar} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>{pagar ? "Pago em" : "Recebido em"}</label>
            <input type="date" value={quando} onChange={(e) => setQuando(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={rotulo}>Valor {pagar ? "pago" : "recebido"}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input value={quanto} onChange={(e) => setQuanto(e.target.value)} inputMode="decimal" className={`${campo} pl-9 tabular-nums`} />
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-400">Previsto: R$ {fmtBRL(parcela.valor)}. Se pagou com desconto ou juros, ajuste o valor: o previsto fica registrado.</p>
        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm">Voltar</button>
          <button type="submit" disabled={salvando}
            className={`flex-1 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2 ${pagar ? "bg-navy-700 hover:bg-navy-600" : "bg-emerald-500 hover:bg-emerald-400"}`}>
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {pagar ? "Confirmar pagamento" : "Confirmar recebimento"}
          </button>
        </div>
      </form>
    </Moldura>
  );
}

function EditarParcelaModal({ parcela, onClose, onSaved }: { parcela: Parcela; onClose: () => void; onSaved: () => void }) {
  const [descricao, setDescricao] = useState(parcela.descricao);
  const [contraparte, setContraparte] = useState(parcela.contraparte ?? "");
  const [valor, setValor] = useState(fmtBRL(parcela.valor));
  const [vencimento, setVencimento] = useState(parcela.vencimento);
  const [obs, setObs] = useState(parcela.observacao ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro("");
    if (numero(valor) <= 0) { setErro("Informe o valor."); return; }
    setSalvando(true);
    try {
      const r = await apiFetch(`/financeiro/parcelas/${parcela.id}`, {
        method: "PUT",
        body: JSON.stringify({ descricao: descricao.trim(), contraparte: contraparte.trim() || null, valor: numero(valor), vencimento, observacao: obs.trim() || null }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(erroDaApi(d, "Não foi possível salvar.")); return; }
      onSaved();
    } catch { setErro("Erro de conexão."); }
    finally { setSalvando(false); }
  };

  return (
    <Moldura titulo="Editar parcela" sub={parcela.recorrencia !== "nenhuma" ? "Só esta parcela. A regra da conta recorrente não muda." : undefined} onClose={onClose}>
      <form onSubmit={enviar} className="p-5 space-y-4">
        <div><label className={rotulo}>Descrição</label><input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} className={campo} /></div>
        <div><label className={rotulo}>{parcela.tipo === "pagar" ? "Fornecedor" : "Quem paga"}</label><input value={contraparte} onChange={(e) => setContraparte(e.target.value)} maxLength={200} className={campo} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={rotulo}>Valor</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={`${campo} pl-9 tabular-nums`} /></div></div>
          <div><label className={rotulo}>Vencimento</label><input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={campo} /></div>
        </div>
        <div><label className={rotulo}>Observação</label><textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className={campo} /></div>
        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm">Cancelar</button>
          <button type="submit" disabled={salvando} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
          </button>
        </div>
      </form>
    </Moldura>
  );
}

function EditarContaModal({ conta, categorias, onClose, onSaved }: { conta: Conta; categorias: string[]; onClose: () => void; onSaved: () => void }) {
  const [descricao, setDescricao] = useState(conta.descricao);
  const [categoria, setCategoria] = useState(conta.categoria);
  const [contraparte, setContraparte] = useState(conta.contraparte ?? "");
  const [valor, setValor] = useState(fmtBRL(conta.valor));
  const [fim, setFim] = useState(conta.recorrencia_fim ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro("");
    if (numero(valor) <= 0) { setErro("Informe o valor."); return; }
    setSalvando(true);
    try {
      const r = await apiFetch(`/financeiro/contas/${conta.id}`, {
        method: "PUT",
        body: JSON.stringify({ descricao: descricao.trim(), categoria, contraparte: contraparte.trim() || null, valor: numero(valor), recorrencia_fim: fim || null }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(erroDaApi(d, "Não foi possível salvar.")); return; }
      onSaved();
    } catch { setErro("Erro de conexão."); }
    finally { setSalvando(false); }
  };

  return (
    <Moldura titulo="Editar conta recorrente" sub="Vale para as parcelas ainda não quitadas. As quitadas ficam como estão." onClose={onClose}>
      <form onSubmit={enviar} className="p-5 space-y-4">
        <div><label className={rotulo}>Descrição</label><input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} className={campo} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={rotulo}>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={campo}>{categorias.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className={rotulo}>{conta.tipo === "pagar" ? "Fornecedor" : "Quem paga"}</label><input value={contraparte} onChange={(e) => setContraparte(e.target.value)} maxLength={200} className={campo} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={rotulo}>Valor</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={`${campo} pl-9 tabular-nums`} /></div></div>
          <div><label className={rotulo}>Até <span className="text-gray-300 normal-case font-normal">(vazio = sem fim)</span></label><input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={campo} /></div>
        </div>
        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm">Cancelar</button>
          <button type="submit" disabled={salvando} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
          </button>
        </div>
      </form>
    </Moldura>
  );
}

function Confirmar({ titulo, texto, rotulo, onClose, onConfirm, loading }: { titulo: string; texto: React.ReactNode; rotulo: string; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  useFecharComEsc(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay p-0 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal p-6 space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle size={26} className="text-red-500" /></div>
          <h3 className="font-bold text-navy-800 text-lg">{titulo}</h3>
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3.5">{texto}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm">Voltar</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} {rotulo}
          </button>
        </div>
      </div>
    </div>
  );
}

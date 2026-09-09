"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Package, Plus, Pencil, AlertCircle, AlertTriangle, Check,
  Loader2, X, Power, Search, ShoppingCart,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { invalidateAdminCache } from "@/lib/adminCache";
import { cpfValido, erroDaApi, fmtBRL, formatCPF, formatPhone } from "@/lib/format";
import { Skel } from "@/components/admin/Skeleton";
import { useFecharComEsc } from "@/hooks/useFecharComEsc";

type RoteiroDoCombo = {
  template_id: number;
  title: string;
  slug: string | null;
  preco_desde: number | null;
  preco_ate: number | null;
  preco_tabela_desde: number | null;
  desconto_proprio_pct: number | null;
  datas_abertas: number;
};

type Combo = {
  id: number;
  nome: string;
  slug: string | null;
  descricao: string | null;
  desconto_pct: number;
  venda_inicio: string | null;
  venda_fim: string | null;
  is_active: boolean;
  status: "desligado" | "agendado" | "vendendo" | "encerrado" | "sem_data";
  roteiros: RoteiroDoCombo[];
  preco_cheio_desde: number | null;
  preco_com_desconto_desde: number | null;
  preco_com_desconto_ate: number | null;
  preco_tabela_desde: number | null;
  desconto_total_pct: number | null;
  roteiros_com_desconto: number;
  roteiros_sem_data: number;
};

type Roteiro = { id: number; title: string; active_dates_count: number; is_active: boolean };

/* O status vem pronto do servidor, derivado da janela mais o interruptor. A tela
   só escolhe a cor: recalcular aqui abriria espaço para os dois discordarem. */
const SELO: Record<Combo["status"], { texto: string; classe: string }> = {
  vendendo: { texto: "Vendendo", classe: "bg-emerald-100 text-emerald-700" },
  agendado: { texto: "Agendado", classe: "bg-blue-100 text-blue-700" },
  encerrado: { texto: "Encerrado", classe: "bg-gray-100 text-gray-500" },
  desligado: { texto: "Desligado", classe: "bg-gray-100 text-gray-500" },
  // Acontece sozinho quando a última data de um roteiro vence. O combo sai da
  // vitrine sem ninguém salvar nada, e o painel precisa dizer por quê.
  sem_data: { texto: "Sem data", classe: "bg-gold-100 text-gold-700" },
};

/** "[TESTE] ILHA DO MEL - PR" vira "Ilha do Mel".
 *
 *  Serve para o nome automático do combo: juntar os títulos crus daria
 *  "ILHA DO MEL - PR + BOMBINHAS - SC", que ninguém usaria. */
function nomeCurto(titulo: string): string {
  const limpo = titulo.replace(/^\[[^\]]*\]\s*/, "").split(" - ")[0].split(" | ")[0].trim();
  return limpo
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((p) => (["e", "da", "de", "do", "das", "dos", "com"].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** Nome sugerido a partir dos roteiros escolhidos, na ordem escolhida. */
function nomeAutomatico(titulos: string[]): string {
  if (titulos.length === 0) return "";
  return `Combo ${titulos.map(nomeCurto).join(" + ")}`;
}

/** "2026-11-30" vira "30/11". Sem `new Date`, que interpretaria como UTC e
 *  mostraria o dia anterior para quem está a oeste de Greenwich. */
function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function janela(c: Combo): string {
  if (!c.venda_inicio && !c.venda_fim) return "Sem prazo";
  if (c.venda_inicio && c.venda_fim) return `${dataCurta(c.venda_inicio)} a ${dataCurta(c.venda_fim)}`;
  if (c.venda_fim) return `Até ${dataCurta(c.venda_fim)}`;
  return `A partir de ${dataCurta(c.venda_inicio)}`;
}

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[] | null>(null);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState<Combo | null>(null);
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [vendendo, setVendendo] = useState<Combo | null>(null);

  const carregar = async () => {
    try {
      const r = await apiFetch("/combos/admin-list");
      if (!r.ok) throw new Error(String(r.status));
      setCombos(await r.json());
      setErro("");
    } catch {
      setErro("Não foi possível carregar os combos. Tente recarregar a página.");
    }
  };

  useEffect(() => {
    carregar();
    apiFetch("/templates/admin-list")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: Roteiro[]) => setRoteiros(Array.isArray(lista) ? lista : []))
      .catch(() => { /* o formulário avisa quando a lista não veio */ });
  }, []);

  const alternar = async (c: Combo) => {
    setOcupado(c.id);
    try {
      const r = await apiFetch(`/combos/${c.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.detail || "Não foi possível alterar."); return; }
      await carregar();
    } finally { setOcupado(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-navy-800">Combos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Roteiros vendidos juntos com desconto, durante um período.
          </p>
        </div>
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus size={16} /> Novo combo
        </button>
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      {!combos && !erro && (
        <div className="space-y-3">{[0, 1].map((i) => <Skel key={i} className="h-[132px] rounded-2xl" />)}</div>
      )}

      {combos?.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <Package size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhum combo criado ainda.</p>
          <p className="text-gray-400 text-xs mt-1">
            Um combo junta dois ou mais roteiros com desconto, e vende só no período que você definir.
          </p>
        </div>
      )}

      <div className="space-y-3 stagger-in">
        {combos?.map((c) => (
          <div key={c.id} className="card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-navy-800">{c.nome}</h2>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${SELO[c.status].classe}`}>
                    {SELO[c.status].texto}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-100 text-gold-700">
                    {c.desconto_pct.toString().replace(".", ",")}% off
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {janela(c)} · {c.roteiros.length} roteiros
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => alternar(c)} disabled={ocupado === c.id}
                  title={c.is_active ? "Desligar" : "Ligar"}
                  className={`flex items-center gap-1.5 border font-bold py-2 px-3 rounded-xl transition-colors text-xs disabled:opacity-50 ${
                    c.is_active
                      ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                      : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {ocupado === c.id ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                  <span className="hidden sm:inline">{c.is_active ? "Desligar" : "Ligar"}</span>
                </button>
                {/* Só aparece com o combo ligado e com data em todas as pernas:
                    é exatamente quando o servidor aceita a venda, e oferecer o
                    botão para depois recusar seria pior que não oferecer. */}
                {c.is_active && c.roteiros_sem_data === 0 && (
                  <button
                    onClick={() => setVendendo(c)} title="Vender pelo balcão"
                    className="flex items-center gap-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2 px-3 rounded-xl transition-colors text-xs"
                  >
                    <ShoppingCart size={13} /><span className="hidden sm:inline">Vender</span>
                  </button>
                )}
                <button
                  onClick={() => setEditando(c)} title="Editar"
                  className="flex items-center gap-1.5 border border-navy-200 text-navy-700 hover:bg-navy-50 font-bold py-2 px-3 rounded-xl transition-colors text-xs"
                >
                  <Pencil size={13} /><span className="hidden sm:inline">Editar</span>
                </button>
              </div>
            </div>

            {/* O alerta que decide se o combo pode ser anunciado. Fica ANTES da
                lista de roteiros porque é o que precisa ser visto primeiro. */}
            {c.roteiros_sem_data > 0 && (
              <div className="flex items-start gap-2 mt-3 bg-gold-50 border border-gold-200 rounded-xl px-3.5 py-2.5">
                <AlertTriangle size={15} className="text-gold-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-navy-700">
                  {c.roteiros_sem_data === 1
                    ? "Um roteiro deste combo está sem data aberta"
                    : `${c.roteiros_sem_data} roteiros deste combo estão sem data aberta`}
                  , então o cliente não teria o que escolher. Abra data antes de anunciar.
                </p>
              </div>
            )}

            <div className="mt-3 border border-gray-100 rounded-xl divide-y divide-gray-100">
              {c.roteiros.map((r) => (
                <div key={r.template_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-navy-800 truncate">{r.title}</p>
                    <p className={`text-[11px] mt-0.5 ${r.datas_abertas === 0 ? "text-gold-700 font-semibold" : "text-gray-400"}`}>
                      {r.datas_abertas === 0
                        ? "sem data à venda"
                        : `${r.datas_abertas} data${r.datas_abertas === 1 ? "" : "s"} à venda`}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    {r.preco_desde != null && (
                      <p className="text-sm text-navy-800 tabular-nums">
                        {r.preco_tabela_desde != null && (
                          <span className="text-gray-400 line-through mr-1.5 text-xs">R$ {fmtBRL(r.preco_tabela_desde)}</span>
                        )}
                        R$ {fmtBRL(r.preco_desde)}
                        {/* A faixa só aparece quando as datas custam valores
                            diferentes. Repetir o mesmo número dos dois lados
                            não informaria nada. */}
                        {r.preco_ate != null && <span className="text-gray-400"> a R$ {fmtBRL(r.preco_ate)}</span>}
                      </p>
                    )}
                    {/* Aparece só quando o roteiro já desconta sozinho: é o
                        desconto que o combo vai somar em cima. */}
                    {r.desconto_proprio_pct != null && (
                      <p className="text-[11px] text-gold-700 font-semibold mt-0.5">
                        já com {r.desconto_proprio_pct.toString().replace(".", ",")}% off
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {c.preco_cheio_desde != null && c.preco_com_desconto_desde != null && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-gray-400 line-through text-sm tabular-nums">
                    R$ {fmtBRL(c.preco_tabela_desde ?? c.preco_cheio_desde)}
                  </span>
                  <span className="font-black text-navy-800 tabular-nums">
                    R$ {fmtBRL(c.preco_com_desconto_desde)}
                    {c.preco_com_desconto_ate != null && (
                      <span className="font-bold text-gray-500"> a R$ {fmtBRL(c.preco_com_desconto_ate)}</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">por pessoa</span>
                </div>
                {/* A explicação entra SÓ quando o valor é uma faixa. Antes havia
                    um "a partir de" fixo, que era falso em combo cujas datas
                    custam todas o mesmo. */}
                {c.preco_com_desconto_ate != null && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Varia porque há datas de preços diferentes. O menor valor vale escolhendo as datas mais baratas.
                  </p>
                )}

                {/* O aviso do desconto somado. Só aparece quando algum roteiro
                    já tem promoção, porque só aí os dois se acumulam. */}
                {c.roteiros_com_desconto > 0 && c.desconto_total_pct != null && (
                  <div className="flex items-start gap-2 mt-2.5 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2.5">
                    <AlertTriangle size={14} className="text-gold-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-navy-700">
                      {c.roteiros_com_desconto === 1 ? "Um roteiro deste combo já vende" : `${c.roteiros_com_desconto} roteiros deste combo já vendem`} com
                      desconto próprio. Somando com os {c.desconto_pct.toString().replace(".", ",")}% do combo,
                      o cliente paga <strong>{c.desconto_total_pct.toString().replace(".", ",")}% abaixo do preço anunciado</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {vendendo && (
        <VendaComboForm combo={vendendo} onClose={() => { setVendendo(null); carregar(); }} />
      )}

      {(criando || editando) && (
        <ComboForm
          combo={editando}
          roteiros={roteiros}
          onClose={() => { setCriando(false); setEditando(null); }}
          onSaved={() => { setCriando(false); setEditando(null); carregar(); }}
        />
      )}

    </div>
  );
}

/* ─── Formulário ─── */

function ComboForm({ combo, roteiros, onClose, onSaved }: {
  combo: Combo | null;
  roteiros: Roteiro[];
  onClose: () => void;
  onSaved: () => void;
}) {
  useFecharComEsc(true, onClose);
  const [nome, setNome] = useState(combo?.nome ?? "");
  // Enquanto ninguém digitar, o nome acompanha os roteiros escolhidos. Ao
  // primeiro toque no campo ele para de acompanhar: sobrescrever "Combo Verão"
  // porque o admin trocou um roteiro seria pior que não sugerir nada.
  const [nomeManual, setNomeManual] = useState(!!combo);
  const [descricao, setDescricao] = useState(combo?.descricao ?? "");
  const [desconto, setDesconto] = useState(String(combo?.desconto_pct ?? 15));
  // "de X por Y" é como o dono precifica. O percentual continua sendo o que é
  // gravado, porque rateia sozinho entre pernas de preços diferentes e vale
  // igual para criança; o campo abaixo só faz a conta para ele.
  const [precoAlvo, setPrecoAlvo] = useState("");
  const [soma, setSoma] = useState<{
    preco_cheio_desde: number;
    preco_cheio_ate: number | null;
    preco_tabela_desde: number | null;
    roteiros: {
      template_id: number; title: string; datas_abertas: number;
      preco_desde: number | null; preco_ate: number | null;
      preco_tabela_desde: number | null; desconto_proprio_pct: number | null;
    }[];
  } | null>(null);
  const [inicio, setInicio] = useState(combo?.venda_inicio ?? "");
  const [fim, setFim] = useState(combo?.venda_fim ?? "");
  // Ordem importa: é como o combo aparece na vitrine, então a seleção guarda
  // a sequência de clique em vez de reordenar por id.
  const [escolhidos, setEscolhidos] = useState<number[]>(combo?.roteiros.map((r) => r.template_id) ?? []);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Busca a soma dos escolhidos para montar o "de/por". Uma chamada por
  // mudança de seleção, e só com dois ou mais: abaixo disso não há combo.
  useEffect(() => {
    if (escolhidos.length < 2) { setSoma(null); return; }
    let cancelado = false;
    apiFetch(`/combos/simulacao/preco?ids=${escolhidos.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelado) setSoma(d); })
      .catch(() => { if (!cancelado) setSoma(null); });
    return () => { cancelado = true; };
  }, [escolhidos]);

  useEffect(() => {
    if (nomeManual) return;
    const titulos = escolhidos
      .map((id) => roteiros.find((r) => r.id === id)?.title)
      .filter((t): t is string => !!t);
    setNome(nomeAutomatico(titulos));
  }, [escolhidos, roteiros, nomeManual]);

  const pct = parseFloat(desconto.replace(",", ".")) || 0;
  const cheio = soma?.preco_cheio_desde ?? 0;
  const semDataEscolhido = (soma?.roteiros ?? []).filter((r) => r.datas_abertas === 0);
  const comPromocao = (soma?.roteiros ?? []).filter((r) => r.desconto_proprio_pct != null);
  const tabela = soma?.preco_tabela_desde ?? cheio;
  // O desconto que o cliente enxerga: combo somado à promoção que o roteiro já
  // tem. É este número que precisa aparecer ANTES de o dono fechar o valor.
  const totalPct = cheio > 0 && tabela > 0 && pct > 0
    ? Math.round((1 - (cheio * (1 - pct / 100)) / tabela) * 1000) / 10
    : 0;

  // Digitar o preço final define o percentual, e mexer no percentual atualiza o
  // preço. Os dois campos mostram a mesma decisão de dois jeitos.
  const aoDigitarAlvo = (v: string) => {
    setPrecoAlvo(v);
    const alvo = parseFloat(v.replace(",", "."));
    if (cheio > 0 && alvo > 0 && alvo < cheio) {
      setDesconto((Math.round((1 - alvo / cheio) * 10000) / 100).toString());
    }
  };
  const aoDigitarPct = (v: string) => {
    setDesconto(v);
    const p = parseFloat(v.replace(",", "."));
    if (cheio > 0 && p > 0 && p < 100) {
      setPrecoAlvo((Math.round(cheio * (1 - p / 100) * 100) / 100).toFixed(2));
    }
  };
  const valido = nome.trim().length >= 3 && escolhidos.length >= 2 && pct > 0 && pct < 100
    && semDataEscolhido.length === 0;

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return roteiros
      .filter((r) => r.is_active)
      .filter((r) => !t || r.title.toLowerCase().includes(t))
      .slice(0, 40);
  }, [roteiros, busca]);

  const alternar = (id: number) =>
    setEscolhidos((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const salvar = async () => {
    if (!valido) { setErro("Dê um nome, escolha ao menos dois roteiros e um desconto entre 1 e 99."); return; }
    setSalvando(true); setErro("");
    try {
      const corpo = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        template_ids: escolhidos,
        desconto_pct: pct,
        venda_inicio: inicio || null,
        venda_fim: fim || null,
      };
      const r = await apiFetch(combo ? `/combos/${combo.id}` : "/combos", {
        method: combo ? "PUT" : "POST",
        body: JSON.stringify(corpo),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        const d = e.detail;
        setErro(typeof d === "string" ? d : Array.isArray(d) ? (d[0]?.msg ?? "Confira os campos.") : "Não foi possível salvar.");
        setSalvando(false);
        return;
      }
      onSaved();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-display font-black text-navy-900 text-lg">
            {combo ? "Editar combo" : "Novo combo"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-navy-700 transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {erro && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{erro}</div>}

          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Nome</label>
              {nomeManual && escolhidos.length >= 2 && (
                <button onClick={() => setNomeManual(false)}
                  className="text-[11px] text-navy-500 hover:text-navy-700 underline underline-offset-2">
                  usar o automático
                </button>
              )}
            </div>
            <input value={nome} onChange={(e) => { setNome(e.target.value); setNomeManual(true); }} maxLength={120}
              placeholder="Escolha os roteiros e o nome aparece aqui"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Descrição <span className="text-gray-400 font-normal normal-case">(opcional)</span>
            </label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2}
              placeholder="Três praias em um pacote só."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
          </div>

          {/* Preço: o dono pensa em "de 505 por 455", então digita o POR e o
              percentual sai da conta. O que é gravado continua sendo o
              percentual. */}
          <div className="rounded-xl border border-gray-200 p-3.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">Preço do combo</label>
            {escolhidos.length < 2 ? (
              <p className="text-sm text-gray-400">Escolha os roteiros para ver o valor.</p>
            ) : (
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <span className="block text-[11px] text-gray-400 mb-1">De</span>
                  <span className="block text-lg text-gray-400 line-through tabular-nums">
                    {cheio > 0 ? `R$ ${fmtBRL(cheio)}` : "R$ 0,00"}
                  </span>
                </div>
                <div className="w-32">
                  <span className="block text-[11px] text-gray-400 mb-1">Por</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">R$</span>
                    <input type="number" min="0" step="0.01" value={precoAlvo}
                      onChange={(e) => aoDigitarAlvo(e.target.value)} placeholder="455"
                      className="w-full pl-9 pr-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
                  </div>
                </div>
                <div className="w-24">
                  <span className="block text-[11px] text-gray-400 mb-1">Desconto</span>
                  <div className="relative">
                    <input type="number" min="1" max="99" step="0.01" value={desconto}
                      onChange={(e) => aoDigitarPct(e.target.value)}
                      className="w-full pl-3 pr-7 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">%</span>
                  </div>
                </div>
              </div>
            )}
            {escolhidos.length >= 2 && (
              <p className="text-[11px] text-gray-400 mt-2">
                Valor por pessoa.
                {soma?.preco_cheio_ate
                  ? ` Há datas de preços diferentes: escolhendo as mais caras, o cheio vai a R$ ${fmtBRL(soma.preco_cheio_ate)}.`
                  : " Todas as datas custam o mesmo, então o valor é exato."}
              </p>
            )}

            {comPromocao.length > 0 && totalPct > 0 && (
              <div className="flex items-start gap-2 mt-3 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-gold-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-navy-700">
                  <p>
                    {comPromocao.length === 1 ? "Este roteiro já vende" : "Estes roteiros já vendem"} com desconto próprio:{" "}
                    {comPromocao.map((r) => `${nomeCurto(r.title)} (${r.desconto_proprio_pct!.toString().replace(".", ",")}%)`).join(", ")}.
                  </p>
                  <p className="mt-1">
                    Com os {pct.toString().replace(".", ",")}% do combo, o cliente pagará{" "}
                    <strong>{totalPct.toString().replace(".", ",")}% abaixo do preço anunciado</strong>
                    {tabela > cheio && <> (de R$ {fmtBRL(tabela)})</>}.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Vende de</label>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">até</label>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 -mt-2">
            Datas vazias significam que o combo vende enquanto estiver ligado.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Roteiros <span className="text-gray-400 font-normal normal-case">({escolhidos.length} escolhidos, mínimo 2)</span>
            </label>

            {escolhidos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {escolhidos.map((id, i) => {
                  const r = roteiros.find((x) => x.id === id);
                  return (
                    <button key={id} onClick={() => alternar(id)}
                      className="flex items-center gap-1.5 bg-navy-50 border border-navy-200 text-navy-700 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-navy-100 transition-colors">
                      <span className="text-navy-400">{i + 1}</span>
                      {r?.title ?? `Roteiro ${id}`}
                      <X size={11} />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar roteiro"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
            </div>

            {semDataEscolhido.length > 0 && (
              <div className="flex items-start gap-2 mb-2 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-gold-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-navy-700">
                  {semDataEscolhido.length === 1 ? "Um roteiro escolhido está" : `${semDataEscolhido.length} roteiros escolhidos estão`} sem
                  data à venda. O combo não pode ser salvo assim: abra uma data ou troque o roteiro.
                </p>
              </div>
            )}

            <div className="border border-gray-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-gray-100">
              {lista.length === 0 && (
                <p className="text-sm text-gray-400 px-3 py-4 text-center">Nenhum roteiro encontrado.</p>
              )}
              {lista.map((r) => {
                const marcado = escolhidos.includes(r.id);
                return (
                  <button key={r.id} onClick={() => alternar(r.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      marcado ? "bg-navy-700 border-navy-700" : "border-gray-300"}`}>
                      {marcado && <Check size={11} className="text-white" />}
                    </span>
                    <span className="flex-1 text-sm text-navy-800 truncate">{r.title}</span>
                    {/* Sem data aberta o roteiro não tem o que vender, e o
                        combo nasceria travado. Avisa aqui, na escolha. */}
                    <span className={`text-[11px] whitespace-nowrap ${r.active_dates_count === 0 ? "text-gold-700 font-semibold" : "text-gray-400"}`}>
                      {r.active_dates_count === 0 ? "sem data" : `${r.active_dates_count} datas`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} disabled={salvando}
            className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !valido}
            className="flex-1 bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
            {salvando ? <><Loader2 size={15} className="animate-spin" /> Salvando</> : <><Check size={15} /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Venda de combo pelo balcão ───
 *
 * Uma venda vira N reservas, uma por perna. A tela existe porque montar isso na
 * mão pelo painel de reservas significaria criar três vendas, calcular o rateio
 * do desconto de cabeça e torcer para as três terem vaga.
 */

type DataDoRoteiro = {
  trip_id: number;
  departure_date: string;
  price_per_person: number;
  available_spots: number;
};

type RoteiroComDatas = { template_id: number; title: string; datas: DataDoRoteiro[] };

type Acompanhante = { full_name: string; cpf: string; birth_date: string };

type PernaVendida = {
  booking_code: string;
  titulo: string;
  data: string | null;
  valor_cheio: number;
  desconto: number;
  valor_final: number;
};

type VendaFeita = {
  combo_nome: string;
  combo_grupo: string;
  valor_cheio: number;
  desconto_total: number;
  valor_final: number;
  pernas: PernaVendida[];
};

function dataLonga(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function VendaComboForm({ combo, onClose }: { combo: Combo; onClose: () => void }) {
  useFecharComEsc(true, onClose);

  const [datas, setDatas] = useState<RoteiroComDatas[] | null>(null);
  // template_id -> trip_id escolhido
  const [escolha, setEscolha] = useState<Record<number, string>>({});
  // template_id -> preço combinado, quando fugiu da tabela
  const [override, setOverride] = useState<Record<number, string>>({});
  const [mostrarPreco, setMostrarPreco] = useState(false);

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [pessoas, setPessoas] = useState(1);
  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>([]);
  const [pagamento, setPagamento] = useState("whatsapp");
  const [obs, setObs] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [feita, setFeita] = useState<VendaFeita | null>(null);
  const [buscaCpf, setBuscaCpf] = useState<"parado" | "buscando" | "achou" | "novo">("parado");
  const timerCpf = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await apiFetch(`/combos/${combo.id}/datas`);
        const d = await res.json();
        if (cancelado) return;
        setDatas(d);
        // Pré-seleciona a primeira data de cada roteiro. Na maioria das vendas
        // é a que o cliente quer, e o admin só troca o que precisa.
        const inicial: Record<number, string> = {};
        for (const r of d as RoteiroComDatas[]) {
          if (r.datas.length) inicial[r.template_id] = String(r.datas[0].trip_id);
        }
        setEscolha(inicial);
      } catch {
        if (!cancelado) setErro("Não foi possível carregar as datas.");
      }
    })();
    return () => { cancelado = true; };
  }, [combo.id]);

  const trocarPessoas = (n: number) => {
    const limite = Math.max(1, Math.min(n, vagaMinima || 99));
    setPessoas(limite);
    setAcompanhantes((antes) => {
      const precisa = limite - 1;
      if (precisa > antes.length) {
        return [...antes, ...Array.from({ length: precisa - antes.length },
          () => ({ full_name: "", cpf: "", birth_date: "" }))];
      }
      return antes.slice(0, precisa);
    });
  };

  const buscarPorCpf = (v: string) => {
    const formatado = formatCPF(v);
    setCpf(formatado);
    const limpo = formatado.replace(/\D/g, "");
    if (limpo.length < 11) { setBuscaCpf("parado"); return; }
    setBuscaCpf("buscando");
    if (timerCpf.current) clearTimeout(timerCpf.current);
    timerCpf.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/bookings/admin/lookup-cpf?cpf=${limpo}`);
        const d = await res.json();
        if (d.found) {
          setBuscaCpf("achou");
          setNome(d.full_name || "");
          setTelefone(d.phone ? formatPhone(d.phone) : "");
          setNascimento(d.birth_date ? d.birth_date.slice(0, 10) : "");
        } else {
          setBuscaCpf("novo");
        }
      } catch {
        setBuscaCpf("parado");
      }
    }, 400);
  };

  const pernas = useMemo(() => {
    if (!datas) return [];
    return datas.map((r) => {
      const escolhida = r.datas.find((d) => String(d.trip_id) === escolha[r.template_id]) ?? null;
      const combinado = parseFloat((override[r.template_id] ?? "").replace(",", "."));
      const preco = Number.isFinite(combinado) && combinado > 0
        ? combinado
        : (escolhida?.price_per_person ?? 0);
      return { roteiro: r, escolhida, preco };
    });
  }, [datas, escolha, override]);

  /* A vaga que limita a venda é a MENOR entre as pernas: o combo não pode ser
     vendido para mais gente do que cabe na perna mais cheia. Sem isto o admin
     preencheria a ficha inteira para o servidor recusar no fim. */
  const vagaMinima = useMemo(() => {
    const vagas = pernas.map((p) => p.escolhida?.available_spots ?? 0);
    return vagas.length ? Math.min(...vagas) : 0;
  }, [pernas]);

  const cheio = pernas.reduce((s, p) => s + p.preco * pessoas, 0);
  const desconto = Math.round(cheio * combo.desconto_pct) / 100;
  const final = Math.round((cheio - desconto) * 100) / 100;

  const faltaData = pernas.some((p) => !p.escolhida);
  /* Trocar de data pode reduzir o teto de gente sem que `pessoas` acompanhe:
     o admin escolheria 6, mudaria para uma data com 4 lugares e só descobriria
     ao enviar. O servidor recusa, mas depois da ficha inteira preenchida. */
  const passouDaVaga = !faltaData && pessoas > vagaMinima;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (faltaData) { setErro("Escolha a data de cada roteiro."); return; }
    if (passouDaVaga) { setErro(`Só cabem ${vagaMinima} pessoas neste combo.`); return; }
    if (!cpfValido(cpf)) { setErro("CPF inválido. Confira os números."); return; }
    if (!nome.trim()) { setErro("Informe o nome do titular."); return; }
    const digitos = telefone.replace(/\D/g, "");
    if (digitos.length < 10 || digitos.length > 11) { setErro("Telefone inválido. Informe DDD e número."); return; }
    for (let i = 0; i < acompanhantes.length; i++) {
      if (!acompanhantes[i].full_name.trim()) { setErro(`Informe o nome do acompanhante ${i + 1}.`); return; }
      if (!cpfValido(acompanhantes[i].cpf)) { setErro(`CPF do acompanhante ${i + 1} inválido.`); return; }
    }

    setSalvando(true);
    try {
      const res = await apiFetch("/combos/venda-externa", {
        method: "POST",
        body: JSON.stringify({
          combo_id: combo.id,
          pernas: pernas.map((p) => {
            const combinado = parseFloat((override[p.roteiro.template_id] ?? "").replace(",", "."));
            return {
              trip_id: p.escolhida!.trip_id,
              price_override: Number.isFinite(combinado) && combinado > 0 ? combinado : undefined,
            };
          }),
          traveler_name: nome,
          traveler_cpf: cpf,
          traveler_phone: telefone,
          traveler_birth_date: nascimento || undefined,
          num_travelers: pessoas,
          companions: acompanhantes.filter((c) => c.full_name.trim()),
          payment_method: pagamento,
          notes: obs || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setErro(erroDaApi(d, "Não foi possível registrar a venda.")); return; }
      /* A venda criou N reservas e baixou vaga em N viagens. Sem avisar, o
         painel de Reservas e o Dashboard continuariam mostrando o cache de
         antes da venda ao serem abertos. */
      invalidateAdminCache();
      setFeita(d);
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  };

  /* Depois de vender, o recibo. As reservas já existem e não há o que desfazer
     aqui, então a tela troca de assunto: mostra os códigos, que é o que o admin
     precisa copiar para o cliente. */
  if (feita) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check size={16} />
            </span>
            <div>
              <h3 className="font-bold text-navy-800 text-base">Combo vendido</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="font-mono text-navy-600 font-semibold">{feita.combo_grupo}</span>
                {" · "}{feita.pernas.length} reservas, uma por viagem
              </p>
            </div>
          </div>
          <div className="p-5 overflow-y-auto space-y-3">
            {feita.pernas.map((p) => (
              <div key={p.booking_code} className="border border-gray-100 rounded-xl px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-navy-800">{p.booking_code}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{p.titulo}</p>
                    {p.data && <p className="text-[11px] text-gray-400 mt-0.5">{dataLonga(p.data)}</p>}
                  </div>
                  <p className="text-sm text-navy-800 tabular-nums whitespace-nowrap">R$ {fmtBRL(p.valor_final)}</p>
                </div>
              </div>
            ))}
            <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">Total pago</span>
              <span className="font-black text-navy-800 tabular-nums">R$ {fmtBRL(feita.valor_final)}</span>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-100">
            <button onClick={onClose}
              className="w-full bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={enviar}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-bold text-navy-800 text-base truncate">Vender {combo.nome}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              WhatsApp ou presencial · {combo.desconto_pct.toString().replace(".", ",")}% off
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {erro && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {erro}
            </div>
          )}

          {!datas && <Skel className="h-32 rounded-xl" />}

          {datas && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Datas</p>
              {datas.map((r) => {
                const p = pernas.find((x) => x.roteiro.template_id === r.template_id)!;
                return (
                  <div key={r.template_id} className="border border-gray-100 rounded-xl px-3.5 py-3">
                    <p className="text-sm text-navy-800">{r.title}</p>
                    {r.datas.length === 0 ? (
                      <p className="text-xs text-gold-700 font-semibold mt-1.5">
                        Sem data à venda. Abra uma data neste roteiro para vender o combo.
                      </p>
                    ) : (
                      <>
                        <select
                          value={escolha[r.template_id] ?? ""}
                          onChange={(e) => setEscolha((a) => ({ ...a, [r.template_id]: e.target.value }))}
                          className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                        >
                          {r.datas.map((d) => (
                            <option key={d.trip_id} value={String(d.trip_id)}>
                              {dataLonga(d.departure_date)} · R$ {fmtBRL(d.price_per_person)} · {d.available_spots} vagas
                            </option>
                          ))}
                        </select>
                        {mostrarPreco && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-gray-500 whitespace-nowrap">Preço combinado</span>
                            <input
                              type="text" inputMode="decimal"
                              value={override[r.template_id] ?? ""}
                              onChange={(e) => setOverride((a) => ({ ...a, [r.template_id]: e.target.value }))}
                              placeholder={String(p.escolhida?.price_per_person ?? "")}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-navy-200"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={() => setMostrarPreco((v) => !v)}
                className="text-xs text-gray-400 hover:text-navy-700 underline">
                {mostrarPreco ? "Usar os preços de tabela" : "O preço combinado foi outro"}
              </button>
            </div>
          )}

          {/* Titular */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Titular</p>
            <div className="relative">
              <input value={cpf} onChange={(e) => buscarPorCpf(e.target.value)}
                placeholder="CPF" maxLength={14}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200" />
              {buscaCpf === "buscando" && (
                <Loader2 size={15} className="animate-spin text-gray-300 absolute right-3 top-2.5" />
              )}
              {buscaCpf === "achou" && (
                <Check size={15} className="text-emerald-500 absolute right-3 top-2.5" />
              )}
            </div>
            {buscaCpf === "achou" && (
              <p className="text-[11px] text-emerald-600">Cliente já cadastrado, dados preenchidos.</p>
            )}
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200" />
            <div className="grid grid-cols-2 gap-2.5">
              <input value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))}
                placeholder="Telefone" maxLength={15}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200" />
              <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-200" />
            </div>
          </div>

          {/* Pessoas */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Viajantes</p>
              {vagaMinima > 0 && (
                <span className="text-[11px] text-gray-400">cabem {vagaMinima} neste combo</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => trocarPessoas(pessoas - 1)}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">−</button>
              <span className="w-8 text-center font-bold text-navy-800 tabular-nums">{pessoas}</span>
              <button type="button" onClick={() => trocarPessoas(pessoas + 1)}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">+</button>
              <span className="text-xs text-gray-400">as mesmas pessoas viajam nos {pernas.length} roteiros</span>
            </div>
            {acompanhantes.map((c, i) => (
              <div key={i} className="grid grid-cols-2 gap-2.5">
                <input value={c.full_name}
                  onChange={(e) => setAcompanhantes((a) => a.map((x, k) => k === i ? { ...x, full_name: e.target.value } : x))}
                  placeholder={`Acompanhante ${i + 1}`}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200" />
                <input value={c.cpf}
                  onChange={(e) => setAcompanhantes((a) => a.map((x, k) => k === i ? { ...x, cpf: formatCPF(e.target.value) } : x))}
                  placeholder="CPF" maxLength={14}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200" />
              </div>
            ))}
          </div>

          {/* Pagamento */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pagamento</p>
            <select value={pagamento} onChange={(e) => setPagamento(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200">
              <option value="whatsapp">WhatsApp / presencial</option>
              <option value="pix">PIX</option>
              <option value="credit_card">Cartão</option>
              <option value="transfer">Transferência</option>
              <option value="bank_slip">Boleto</option>
            </select>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
              placeholder="Observações (opcional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200" />
          </div>
        </div>

        {/* O total fica no rodapé, sempre visível: é o número que o admin confere
            com o cliente antes de fechar. */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="text-xs text-gray-400">
              {pessoas} {pessoas === 1 ? "pessoa" : "pessoas"} · {pernas.length} viagens
              {desconto > 0 && <> · desconto de R$ {fmtBRL(desconto)}</>}
            </div>
            <div className="flex items-baseline gap-2">
              {desconto > 0 && (
                <span className="text-gray-400 line-through text-sm tabular-nums">R$ {fmtBRL(cheio)}</span>
              )}
              <span className="font-black text-navy-800 tabular-nums">R$ {fmtBRL(final)}</span>
            </div>
          </div>
          {passouDaVaga && (
            <p className="text-xs text-gold-700 bg-gold-50 border border-gold-200 rounded-lg px-3 py-2">
              Uma das viagens escolhidas só tem {vagaMinima} {vagaMinima === 1 ? "lugar" : "lugares"}.
              Reduza o número de viajantes ou escolha outra data.
            </p>
          )}
          <button type="submit" disabled={salvando || faltaData || passouDaVaga || !datas}
            className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {salvando ? "Registrando..." : `Confirmar venda de ${pernas.length} viagens`}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

/* Promoções: desconto com prazo, aplicado e retirado sozinho pelo servidor.
 *
 * A tela não calcula preço nenhum. Quem decide quanto cada data fica é o
 * servidor (`/promocoes/previa` antes de salvar, e a sincronização depois);
 * aqui só se monta a regra e se mostra o resultado. A prévia é obrigatória:
 * o botão de salvar só libera depois que ela foi vista para o formulário como
 * está, e qualquer mudança no formulário pede uma prévia nova. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgePercent, CalendarClock, Clock, Eye, Globe2, Hourglass, ListChecks, Loader2, Map as MapIcon, Pencil, Plus, Search, Sparkles, Square, Tag, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { erroDaApi, fmtBRL } from "@/lib/format";
import { Skel } from "@/components/admin/Skeleton";
import { useFecharComEsc } from "@/hooks/useFecharComEsc";
import { Segmentado } from "../financeiro/_shared";

type Situacao = "ativa" | "agendada" | "encerrada";
type Alcance = "site" | "roteiros" | "datas";

type Promocao = {
  id: number; nome: string; percentual: number; inicio: string; fim: string | null;
  alcance: Alcance; template_ids: number[]; trip_ids: number[]; excluir_template_ids: number[];
  situacao: Situacao; datas_com_desconto: number;
};
type DataOpcao = { id: number; saida: string; preco: number; original: number | null };
type Roteiro = { id: number; titulo: string; datas: DataOpcao[] };
type LinhaPrevia = {
  template_id: number; roteiro: string; datas: number; mudam: number; nao_mudam: number;
  exemplo: { data: string; preco_hoje: number; preco_cheio?: number; preco_promocao?: number; motivo?: string } | null;
};
type Previa = { roteiros: LinhaPrevia[]; datas_que_mudam: number; datas_que_nao_mudam: number };

const SITUACAO: Record<Situacao, { txt: string; cls: string }> = {
  ativa: { txt: "Valendo", cls: "bg-emerald-50 text-emerald-700" },
  agendada: { txt: "Agendada", cls: "bg-blue-50 text-blue-700" },
  encerrada: { txt: "Encerrada", cls: "bg-gray-100 text-gray-500" },
};

const campo = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300";
const rotulo = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

/* O Brasil não tem mais horário de verão: Brasília é sempre -03:00. Os campos
 * de data e hora do formulário são de Brasília, e vão ao servidor já com fuso. */
const FUSO = "-03:00";
function paraISO(dia: string, hora: string): string { return `${dia}T${hora}:00${FUSO}`; }
function partes(iso: string): { dia: string; hora: string } {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", ...o }).format(d);
  return { dia: f({ year: "numeric", month: "2-digit", day: "2-digit" }), hora: f({ hour: "2-digit", minute: "2-digit", hour12: false }) };
}
function quando(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function diaCurto(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" });
}
function hojeBRT(somaDias = 0): string {
  const d = new Date(Date.now() + somaDias * 86400000);
  return partes(d.toISOString()).dia;
}

/** Quanto falta, em palavras: "faltam 3 dias", "termina hoje às 23:59". */
function quantoFalta(iso: string, verbo: "termina" | "começa"): string {
  const ms = new Date(iso).getTime() - Date.now();
  const dias = Math.floor(ms / 86400000);
  const hora = new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  if (ms <= 0) return verbo === "termina" ? "terminando" : "começando";
  if (dias === 0) return `${verbo} hoje às ${hora}`;
  if (dias === 1) return `${verbo} amanhã às ${hora}`;
  return verbo === "termina" ? `faltam ${dias} dias` : `começa em ${dias} dias`;
}

/** Fração do período já decorrida (0 a 1). Sem fim, não há barra. */
function decorrido(p: Promocao): number | null {
  if (!p.fim) return null;
  const ini = new Date(p.inicio).getTime(), fim = new Date(p.fim).getTime();
  return Math.min(1, Math.max(0, (Date.now() - ini) / (fim - ini)));
}

function IconeAlcance({ a }: { a: Alcance }) {
  const I = a === "site" ? Globe2 : a === "roteiros" ? MapIcon : ListChecks;
  return <I size={12} className="flex-shrink-0" />;
}

function descreveAlcance(p: Promocao, nomes: Map<number, string>): string {
  if (p.alcance === "site") {
    const n = p.excluir_template_ids.length;
    return n ? `Site todo, exceto ${n} ${n === 1 ? "roteiro" : "roteiros"}` : "Site todo";
  }
  if (p.alcance === "roteiros") {
    const ts = p.template_ids.map((id) => nomes.get(id) ?? `#${id}`);
    return ts.length <= 2 ? ts.join(" e ") : `${ts.slice(0, 2).join(", ")} e mais ${ts.length - 2}`;
  }
  return `${p.trip_ids.length} ${p.trip_ids.length === 1 ? "data escolhida" : "datas escolhidas"}`;
}


export default function PromocoesPage() {
  const [lista, setLista] = useState<Promocao[] | null>(null);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [filtro, setFiltro] = useState<"todas" | Situacao>("todas");
  const [editando, setEditando] = useState<Promocao | "nova" | null>(null);
  const [vendoDatas, setVendoDatas] = useState<Promocao | null>(null);
  const [confirmar, setConfirmar] = useState<{ p: Promocao; acao: "encerrar" | "excluir" } | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      const [rl, rr] = await Promise.all([apiFetch("/promocoes"), apiFetch("/promocoes/roteiros")]);
      setLista(await rl.json());
      setRoteiros(await rr.json());
    } catch {
      setErro("Não foi possível carregar as promoções.");
      setLista([]);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomes = useMemo(() => new Map(roteiros.map((r) => [r.id, r.titulo])), [roteiros]);
  const contagem = useMemo(() => {
    const c = { todas: lista?.length ?? 0, ativa: 0, agendada: 0, encerrada: 0 };
    lista?.forEach((p) => { c[p.situacao] += 1; });
    return c;
  }, [lista]);
  const visiveis = (lista ?? []).filter((p) => filtro === "todas" || p.situacao === filtro);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-navy-800">Promoções</h1>
          <p className="text-gray-500 text-sm mt-0.5">Descontos com prazo, aplicados e retirados sozinhos nas datas</p>
        </div>
        <button onClick={() => setEditando("nova")}
          className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm self-start shadow-sm">
          <Plus size={16} /> Nova promoção
        </button>
      </div>

      <PainelAgora lista={lista} />

      {/* A regra que decide o preço quando duas promoções se encontram. */}
      <div className="mt-4 rounded-2xl border border-gold-300 bg-gold-50 px-4 sm:px-5 py-4 flex gap-3">
        <BadgePercent size={20} className="text-gold-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-navy-800 leading-relaxed">
          <p className="font-bold">Em cada data vale a promoção de MAIOR desconto. As promoções nunca somam.</p>
          <p className="mt-1">
            Exemplo: a Ilha tem 5% e o site todo entra com 4%. A Ilha continua com <strong>5%</strong>, e não 9%.
            Se o site todo tivesse 7%, a Ilha ficaria com 7% enquanto ele durasse e voltaria sozinha para os 5% no fim.
          </p>
          <p className="mt-1 text-navy-600">Para uma data nunca receber a promoção do site todo, marque o roteiro como &ldquo;fora da promoção&rdquo;.</p>
        </div>
      </div>

      {/* No celular o título vai em cima e o filtro rola de lado sem barra visível. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 mt-8">
        <p className="text-[11px] font-black tracking-[0.15em] text-gold-600 uppercase">Suas promoções</p>
        <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>div]:[scrollbar-width:none]">
        <Segmentado valor={filtro} onChange={(k) => setFiltro(k as typeof filtro)} opcoes={[
          { k: "todas", label: "Todas", n: contagem.todas },
          { k: "ativa", label: "Valendo", n: contagem.ativa },
          { k: "agendada", label: "Agendadas", n: contagem.agendada },
          { k: "encerrada", label: "Encerradas", n: contagem.encerrada },
        ]} />
        </div>
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {lista === null ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-28 rounded-2xl" />)}</div>
      ) : visiveis.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center mx-auto mb-3"><BadgePercent size={26} /></div>
          <p className="font-bold text-navy-800">
            {filtro === "todas" ? "Nenhuma promoção ainda" : `Nenhuma promoção ${SITUACAO[filtro as Situacao].txt.toLowerCase()}`}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Crie uma para dar desconto no site todo, em alguns roteiros ou em datas escolhidas. Ela liga e desliga sozinha no horário marcado.</p>
          {filtro === "todas" && (
            <button onClick={() => setEditando("nova")}
              className="mt-4 inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
              <Plus size={15} /> Criar a primeira
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visiveis.map((p) => (
            <CartaoPromocao key={p.id} p={p} nomes={nomes}
              onDatas={() => setVendoDatas(p)} onEditar={() => setEditando(p)}
              onEncerrar={() => setConfirmar({ p, acao: "encerrar" })} onExcluir={() => setConfirmar({ p, acao: "excluir" })} />
          ))}
        </div>
      )}

      {editando && (
        <Formulario
          promocao={editando === "nova" ? null : editando}
          roteiros={roteiros}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); carregar(); }}
        />
      )}
      {vendoDatas && <DatasDaPromocao p={vendoDatas} onClose={() => setVendoDatas(null)} />}
      {confirmar && (
        <Confirmar
          {...confirmar}
          onClose={() => setConfirmar(null)}
          onDone={() => { setConfirmar(null); carregar(); }}
        />
      )}
    </div>
  );
}


/** O topo da aba: o que o cliente está vendo AGORA no site. */
function PainelAgora({ lista }: { lista: Promocao[] | null }) {
  const ativas = (lista ?? []).filter((p) => p.situacao === "ativa").sort((a, b) => b.percentual - a.percentual);
  const proxima = (lista ?? []).filter((p) => p.situacao === "agendada").sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const datas = ativas.reduce((s, p) => s + p.datas_com_desconto, 0);
  const destaque = ativas[0];
  const frac = destaque ? decorrido(destaque) : null;
  return (
    <div className="bg-gradient-to-br from-navy-800 to-navy-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
      <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-gold-400/15 blur-2xl pointer-events-none" />
      <p className="text-[11px] font-black tracking-[0.15em] text-gold-300 uppercase flex items-center gap-1.5"><Sparkles size={12} /> Agora no site</p>
      {lista === null ? (
        <Skel className="h-16 w-64 bg-white/20 mt-3" />
      ) : destaque ? (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-end relative">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display font-black text-5xl text-gold-300 tabular-nums leading-none">{destaque.percentual.toLocaleString("pt-BR")}%</span>
              <span className="font-display font-black text-xl sm:text-2xl leading-tight truncate">{destaque.nome}</span>
            </div>
            <p className="text-navy-100 text-sm mt-2">
              {destaque.fim ? <>Até {quando(destaque.fim)} · {quantoFalta(destaque.fim, "termina")}</> : "Sem prazo de fim"}
              {ativas.length > 1 && <> · e mais {ativas.length - 1} {ativas.length === 2 ? "promoção" : "promoções"} valendo</>}
            </p>
            {frac !== null && (
              <div className="mt-3 h-1.5 bg-white/15 rounded-full overflow-hidden max-w-md">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500" style={{ width: `${Math.max(3, frac * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="flex gap-6 md:text-right">
            <div><p className="font-display font-black text-3xl tabular-nums leading-none">{datas}</p><p className="text-[11px] text-navy-200 mt-1 uppercase tracking-wide font-semibold">datas com desconto</p></div>
            <div><p className="font-display font-black text-3xl tabular-nums leading-none">{ativas.length}</p><p className="text-[11px] text-navy-200 mt-1 uppercase tracking-wide font-semibold">{ativas.length === 1 ? "promoção" : "promoções"}</p></div>
          </div>
        </div>
      ) : (
        <div className="mt-3 relative">
          <p className="font-display font-black text-2xl">Nenhuma promoção valendo</p>
          <p className="text-navy-100 text-sm mt-1">
            {proxima ? <>Próxima: <strong className="text-gold-300">{proxima.nome}</strong> ({proxima.percentual.toLocaleString("pt-BR")}%), {quantoFalta(proxima.inicio, "começa")}, {quando(proxima.inicio)}.</>
              : "O site está com os preços normais de cada data."}
          </p>
        </div>
      )}
    </div>
  );
}


function CartaoPromocao({ p, nomes, onDatas, onEditar, onEncerrar, onExcluir }: {
  p: Promocao; nomes: Map<number, string>;
  onDatas: () => void; onEditar: () => void; onEncerrar: () => void; onExcluir: () => void;
}) {
  const frac = p.situacao === "ativa" ? decorrido(p) : null;
  const apagado = p.situacao === "encerrada";
  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col ${
      p.situacao === "ativa" ? "border-gold-200" : "border-gray-100"}`}>
      <div className="p-4 sm:p-5 flex gap-4 flex-1">
        {/* O selo do desconto: azul e dourado, como a marca. */}
        <div className={`w-[72px] h-[72px] rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${
          apagado ? "bg-gray-100 text-gray-400" : "bg-navy-800 text-gold-300"}`}>
          <span className="font-display font-black text-2xl tabular-nums leading-none">{p.percentual.toLocaleString("pt-BR")}%</span>
          <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${apagado ? "text-gray-400" : "text-navy-200"}`}>off</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-display font-black text-lg leading-tight ${apagado ? "text-gray-500" : "text-navy-800"}`}>{p.nome}</p>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${SITUACAO[p.situacao].cls}`}>{SITUACAO[p.situacao].txt}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-navy-50 text-navy-700">
              <IconeAlcance a={p.alcance} /> {descreveAlcance(p, nomes)}
            </span>
            {p.situacao === "ativa" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-gold-50 text-gold-800">
                <Tag size={11} /> {p.datas_com_desconto} {p.datas_com_desconto === 1 ? "data" : "datas"} com desconto
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2.5 flex items-center gap-1.5">
            <CalendarClock size={12} className="text-gray-400" />
            {quando(p.inicio)} {p.fim ? `até ${quando(p.fim)}` : "· sem prazo de fim"}
          </p>
          {p.situacao === "ativa" && p.fim && (
            <div className="mt-2.5">
              <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                <span className="flex items-center gap-1"><Hourglass size={11} /> {quantoFalta(p.fim, "termina")}</span>
                <span className="tabular-nums">{Math.round((frac ?? 0) * 100)}% do período</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600" style={{ width: `${Math.max(3, (frac ?? 0) * 100)}%` }} />
              </div>
            </div>
          )}
          {p.situacao === "agendada" && (
            <p className="text-xs text-blue-700 font-semibold mt-2 flex items-center gap-1"><Clock size={11} /> {quantoFalta(p.inicio, "começa")}</p>
          )}
        </div>
      </div>
      {!apagado && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2 flex items-center gap-1 flex-wrap">
          {p.situacao === "ativa" && (
            <button onClick={onDatas} className="flex items-center gap-1.5 text-xs font-bold text-navy-700 hover:bg-white px-3 py-2 rounded-lg">
              <Eye size={13} /> Ver datas
            </button>
          )}
          <button onClick={onEditar} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:bg-white px-3 py-2 rounded-lg">
            <Pencil size={13} /> Editar
          </button>
          <span className="flex-1" />
          {p.situacao === "ativa" && (
            <button onClick={onEncerrar} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg">
              <Square size={12} /> Encerrar agora
            </button>
          )}
          {p.situacao === "agendada" && (
            <button onClick={onExcluir} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg">
              <Trash2 size={13} /> Excluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function Moldura({ titulo, sub, largo, onClose, children }: { titulo: string; sub?: string; largo?: boolean; onClose: () => void; children: React.ReactNode }) {
  useFecharComEsc(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white w-full ${largo ? "sm:max-w-3xl" : "sm:max-w-md"} rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-2 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div><h3 className="font-bold text-navy-800 text-base">{titulo}</h3>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 -mr-2 -mt-1 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}


/** Lista de roteiros com busca e caixas de marcar. */
function EscolheRoteiros({ roteiros, marcados, onChange, dica }: {
  roteiros: Roteiro[]; marcados: number[]; onChange: (ids: number[]) => void; dica: string;
}) {
  const [q, setQ] = useState("");
  const set = new Set(marcados);
  const filtrados = roteiros.filter((r) => r.titulo.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      {dica && <p className="text-sm text-navy-700 font-medium mb-2">{dica}</p>}
      <div className="relative mb-2">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar roteiro" className={`${campo} pl-9`} />
      </div>
      <div className="border border-gray-100 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-50">
        {filtrados.map((r) => (
          <label key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={set.has(r.id)} className="accent-navy-700"
              onChange={(e) => onChange(e.target.checked ? [...marcados, r.id] : marcados.filter((x) => x !== r.id))} />
            <span className="flex-1 min-w-0 truncate text-navy-800">{r.titulo}</span>
            <span className="text-xs text-gray-400 tabular-nums">{r.datas.length} {r.datas.length === 1 ? "data" : "datas"}</span>
          </label>
        ))}
        {filtrados.length === 0 && <p className="px-3 py-4 text-sm text-gray-400">Nenhum roteiro encontrado.</p>}
      </div>
      {marcados.length > 0 && <p className="text-xs text-navy-700 mt-1.5 font-semibold">{marcados.length} {marcados.length === 1 ? "roteiro marcado" : "roteiros marcados"}</p>}
    </div>
  );
}


function Formulario({ promocao, roteiros, onClose, onSaved }: {
  promocao: Promocao | null; roteiros: Roteiro[]; onClose: () => void; onSaved: () => void;
}) {
  const ini = promocao ? partes(promocao.inicio) : { dia: hojeBRT(), hora: "00:00" };
  const fim0 = promocao?.fim ? partes(promocao.fim) : { dia: hojeBRT(10), hora: "23:59" };
  const jaComecou = promocao?.situacao === "ativa";

  const [nome, setNome] = useState(promocao?.nome ?? "");
  const [pct, setPct] = useState(promocao ? String(promocao.percentual).replace(".", ",") : "");
  const [diaIni, setDiaIni] = useState(ini.dia);
  const [horaIni, setHoraIni] = useState(ini.hora);
  const [semFim, setSemFim] = useState(promocao ? !promocao.fim : false);
  const [diaFim, setDiaFim] = useState(fim0.dia);
  const [horaFim, setHoraFim] = useState(fim0.hora);
  const [alcance, setAlcance] = useState<Alcance>(promocao?.alcance ?? "site");
  const [tIds, setTIds] = useState<number[]>(promocao?.template_ids ?? []);
  const [excluir, setExcluir] = useState<number[]>(promocao?.excluir_template_ids ?? []);
  const [datas, setDatas] = useState<number[]>(promocao?.trip_ids ?? []);
  const [roteiroDatas, setRoteiroDatas] = useState<number | "">(() => {
    if (!promocao?.trip_ids.length) return "";
    const r = roteiros.find((x) => x.datas.some((d) => promocao.trip_ids.includes(d.id)));
    return r ? r.id : "";
  });
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [previaDe, setPreviaDe] = useState("");
  const [carregando, setCarregando] = useState<"" | "previa" | "salvar">("");
  const [erro, setErro] = useState("");

  const corpo = useMemo(() => ({
    nome: nome.trim(),
    percentual: parseFloat(pct.replace(",", ".")) || 0,
    inicio: paraISO(diaIni, horaIni),
    fim: semFim ? null : paraISO(diaFim, horaFim),
    alcance,
    template_ids: alcance === "roteiros" ? tIds : [],
    trip_ids: alcance === "datas" ? datas : [],
    excluir_template_ids: alcance === "site" ? excluir : [],
  }), [nome, pct, diaIni, horaIni, semFim, diaFim, horaFim, alcance, tIds, datas, excluir]);
  const chave = JSON.stringify(corpo);
  const previaValida = previa !== null && previaDe === chave;

  // Os avisos aparecem só depois da primeira tentativa: abrir o formulário
  // vazio e já ver tudo em vermelho afasta mais do que ajuda.
  const [tentou, setTentou] = useState(false);
  const problemas = useMemo(() => {
    const p: Partial<Record<"nome" | "pct" | "periodo" | "alcance", string>> = {};
    if (corpo.nome.length < 2) p.nome = "Dê um nome para a promoção.";
    if (!(corpo.percentual > 0 && corpo.percentual < 100)) p.pct = "Entre 0,01% e 99,99%.";
    if (!diaIni || !horaIni) p.periodo = "Informe quando começa.";
    else if (!semFim && (!diaFim || !horaFim)) p.periodo = "Informe quando termina, ou marque sem prazo.";
    else if (corpo.fim && new Date(corpo.fim) <= new Date(corpo.inicio)) p.periodo = "O fim precisa ser depois do início.";
    else if (corpo.fim && new Date(corpo.fim) <= new Date()) p.periodo = "O fim já passou.";
    if (alcance === "roteiros" && tIds.length === 0) p.alcance = "Marque pelo menos um roteiro.";
    if (alcance === "datas" && datas.length === 0) p.alcance = "Marque pelo menos uma data.";
    return p;
  }, [corpo, diaIni, horaIni, semFim, diaFim, horaFim, alcance, tIds, datas]);
  const aviso = (k: keyof typeof problemas) => tentou && problemas[k]
    ? <p data-campo-com-problema className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {problemas[k]}</p> : null;
  // O aviso geral some sozinho quando os campos são corrigidos.
  useEffect(() => {
    if (tentou && Object.keys(problemas).length === 0) setErro((e) => e.startsWith("Faltam informações") ? "" : e);
  }, [tentou, problemas]);

  const verPrevia = async () => {
    setTentou(true);
    if (Object.keys(problemas).length) {
      // O botão fica no pé do formulário e o campo com problema pode estar lá
      // em cima, fora da tela: avisa aqui embaixo e leva até ele.
      setPrevia(null);
      setErro("Faltam informações: confira os campos marcados em vermelho.");
      requestAnimationFrame(() => document.querySelector("[data-campo-com-problema]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setErro(""); setCarregando("previa");
    try {
      const r = await apiFetch(`/promocoes/previa${promocao ? `?editando=${promocao.id}` : ""}`, { method: "POST", body: chave });
      const j = await r.json();
      if (!r.ok) { setErro(erroDaApi(j, "Confira os campos.")); setPrevia(null); return; }
      setPrevia(j); setPreviaDe(chave);
    } catch { setErro("Erro de conexão."); }
    finally { setCarregando(""); }
  };

  const salvar = async () => {
    if (!previaValida) return;
    setErro(""); setCarregando("salvar");
    try {
      const r = await apiFetch(promocao ? `/promocoes/${promocao.id}` : "/promocoes", { method: promocao ? "PUT" : "POST", body: chave });
      if (!r.ok) { setErro(erroDaApi(await r.json(), "Não foi possível salvar.")); return; }
      onSaved();
    } catch { setErro("Erro de conexão."); }
    finally { setCarregando(""); }
  };

  const roteiroEscolhido = roteiros.find((r) => r.id === roteiroDatas);

  return (
    <Moldura largo titulo={promocao ? "Editar promoção" : "Nova promoção"}
      sub="O desconto é calculado sobre o preço cheio de cada data." onClose={onClose}>
      <div className="p-5 space-y-6">
        <div className="rounded-xl border border-gold-300 bg-gold-50 px-4 py-3 flex gap-3">
          <BadgePercent size={18} className="text-gold-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-navy-800 leading-snug">
            <strong>Em cada data vale a promoção de maior desconto, sem somar.</strong>{" "}
            Se uma data já tem um desconto igual ou maior, ela fica como está. A prévia mostra quais.
          </p>
        </div>
        <section>
          <div className="flex items-baseline gap-2 mb-2.5"><span className="w-5 h-5 rounded-full bg-navy-800 text-gold-300 text-[11px] font-black flex items-center justify-center flex-shrink-0">1</span><p className="font-bold text-navy-800 text-sm">O desconto</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
            <div>
              <label className={rotulo}>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} placeholder="Semana do Cliente"
                className={`${campo} ${tentou && problemas.nome ? "border-red-300" : ""}`} />
              {aviso("nome")}
            </div>
            <div>
              <label className={rotulo}>Desconto</label>
              <div className="relative">
                <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" placeholder="4"
                  className={`${campo} pr-8 tabular-nums font-bold text-navy-800 ${tentou && problemas.pct ? "border-red-300" : ""}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-600 text-sm font-black">%</span>
              </div>
              {aviso("pct")}
            </div>
          </div>
        </section>

        <section>
        <div className="flex items-baseline gap-2 mb-2.5"><span className="w-5 h-5 rounded-full bg-navy-800 text-gold-300 text-[11px] font-black flex items-center justify-center flex-shrink-0">2</span><p className="font-bold text-navy-800 text-sm">O período</p><p className="text-xs text-gray-400">horário de Brasília</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>Começa <span className="text-gray-300 normal-case font-normal">(Brasília)</span></label>
            <div className="flex gap-2">
              <input type="date" value={diaIni} disabled={jaComecou} onChange={(e) => setDiaIni(e.target.value)} className={`${campo} disabled:bg-gray-50 disabled:text-gray-400`} />
              <input type="time" value={horaIni} disabled={jaComecou} onChange={(e) => setHoraIni(e.target.value)} className={`${campo} w-28 disabled:bg-gray-50 disabled:text-gray-400`} />
            </div>
            {jaComecou && <p className="text-[11px] text-gray-400 mt-1">Já começou, então o início não muda.</p>}
          </div>
          <div>
            <label className={rotulo}>Termina <span className="text-gray-300 normal-case font-normal">(Brasília)</span></label>
            <div className="flex gap-2">
              <input type="date" value={diaFim} disabled={semFim} onChange={(e) => setDiaFim(e.target.value)} className={`${campo} disabled:bg-gray-50 disabled:text-gray-400`} />
              <input type="time" value={horaFim} disabled={semFim} onChange={(e) => setHoraFim(e.target.value)} className={`${campo} w-28 disabled:bg-gray-50 disabled:text-gray-400`} />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600 mt-1.5 cursor-pointer">
              <input type="checkbox" checked={semFim} onChange={(e) => setSemFim(e.target.checked)} className="accent-navy-700" />
              Sem prazo de fim
            </label>
          </div>
        </div>
        {aviso("periodo")}
        </section>

        <section>
          <div className="flex items-baseline gap-2 mb-2.5"><span className="w-5 h-5 rounded-full bg-navy-800 text-gold-300 text-[11px] font-black flex items-center justify-center flex-shrink-0">3</span><p className="font-bold text-navy-800 text-sm">Onde vale</p></div>
          <Segmentado valor={alcance} onChange={(k) => setAlcance(k as Alcance)} opcoes={[
            { k: "site", label: "Site todo" }, { k: "roteiros", label: "Roteiros escolhidos" }, { k: "datas", label: "Datas escolhidas" },
          ]} />
          <div className="mt-3">
            {alcance === "site" && (
              <>
                {/* Informação que decide dinheiro: em destaque, não em letra miúda. */}
                <div className="flex gap-3 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3 mb-3">
                  <AlertCircle size={18} className="text-gold-700 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-navy-800 leading-snug">
                    <p className="font-bold">Marque abaixo os roteiros que ficam FORA da promoção.</p>
                    <p className="mt-0.5">Por exemplo, os de Réveillon. Todos os outros entram.</p>
                    <p className="mt-1.5 font-semibold text-navy-700">Combos nunca entram: eles têm o desconto deles.</p>
                  </div>
                </div>
                <EscolheRoteiros roteiros={roteiros} marcados={excluir} onChange={setExcluir} dica="" />
              </>
            )}
            {alcance === "roteiros" && (
              <EscolheRoteiros roteiros={roteiros} marcados={tIds} onChange={setTIds} dica="Marque os roteiros que entram na promoção." />
            )}
            {alcance === "datas" && (
              <div className="space-y-2">
                <select value={roteiroDatas} onChange={(e) => setRoteiroDatas(e.target.value ? Number(e.target.value) : "")} className={campo}>
                  <option value="">Escolha o roteiro</option>
                  {roteiros.map((r) => <option key={r.id} value={r.id}>{r.titulo}</option>)}
                </select>
                {roteiroEscolhido && (
                  <div className="border border-gray-100 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-50">
                    {roteiroEscolhido.datas.map((d) => (
                      <label key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" className="accent-navy-700" checked={datas.includes(d.id)}
                          onChange={(e) => setDatas(e.target.checked ? [...datas, d.id] : datas.filter((x) => x !== d.id))} />
                        <span className="flex-1 text-navy-800 tabular-nums">{diaCurto(d.saida)}</span>
                        <span className="text-xs text-gray-500 tabular-nums">R$ {fmtBRL(d.preco)}</span>
                      </label>
                    ))}
                  </div>
                )}
                {datas.length > 0 && <p className="text-xs text-navy-700 font-semibold">{datas.length} data(s) marcada(s)</p>}
              </div>
            )}
          </div>
          {aviso("alcance")}
        </section>

        {/* Prévia */}
        <section className="border-t border-gray-100 pt-5">
          <div className="flex items-baseline gap-2 mb-2.5"><span className="w-5 h-5 rounded-full bg-navy-800 text-gold-300 text-[11px] font-black flex items-center justify-center flex-shrink-0">4</span><p className="font-bold text-navy-800 text-sm">Confira antes de salvar</p><p className="text-xs text-gray-400">como cada roteiro vai ficar</p></div>
          <button onClick={verPrevia} disabled={carregando !== ""}
            className="flex items-center gap-2 text-sm font-bold text-navy-700 border border-navy-200 hover:bg-navy-50 px-4 py-2.5 rounded-xl disabled:opacity-60">
            {carregando === "previa" ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
            {previa && !previaValida ? "Atualizar prévia" : "Ver prévia"}
          </button>
          {previa && !previaValida && <p className="text-xs text-amber-700 mt-2">O formulário mudou depois da prévia. Veja de novo antes de salvar.</p>}
          {previa && previaValida && (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl bg-navy-800 text-white px-4 py-3">
                  <p className="font-display font-black text-2xl text-gold-300 tabular-nums leading-none">{previa.datas_que_mudam}</p>
                  <p className="text-[11px] text-navy-100 mt-1">{previa.datas_que_mudam === 1 ? "data ganha" : "datas ganham"} o desconto</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <p className="font-display font-black text-2xl text-navy-800 tabular-nums leading-none">{previa.datas_que_nao_mudam}</p>
                  <p className="text-[11px] text-gray-500 mt-1">ficam como estão: já têm desconto igual ou maior, e vale o maior</p>
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50">
                      <th className="px-3 py-2 font-bold">Roteiro</th>
                      <th className="px-3 py-2 font-bold text-right">Mudam</th>
                      <th className="px-3 py-2 font-bold">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {previa.roteiros.map((l) => (
                      <tr key={l.template_id}>
                        <td className="px-3 py-2 text-navy-800">{l.roteiro}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.mudam} de {l.datas}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {l.exemplo?.preco_promocao != null ? (
                            <span className="tabular-nums">
                              {diaCurto(l.exemplo.data)}: <span className="line-through text-gray-400">R$ {fmtBRL(l.exemplo.preco_cheio ?? l.exemplo.preco_hoje)}</span>{" "}
                              <strong className="text-emerald-700">R$ {fmtBRL(l.exemplo.preco_promocao)}</strong>
                            </span>
                          ) : (
                            <span className="text-gray-400">{l.exemplo?.motivo ?? "sem mudança"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {previa.roteiros.length === 0 && (
                      <tr><td colSpan={3} className="px-3 py-4 text-gray-400">Nenhuma data futura é afetada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={salvar} disabled={!previaValida || carregando !== ""}
            title={previaValida ? "" : "Veja a prévia antes de salvar"}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {carregando === "salvar" && <Loader2 size={15} className="animate-spin" />}
            {promocao ? "Salvar alterações" : "Criar promoção"}
          </button>
        </div>
      </div>
    </Moldura>
  );
}


function DatasDaPromocao({ p, onClose }: { p: Promocao; onClose: () => void }) {
  const [linhas, setLinhas] = useState<{ trip_id: number; roteiro: string; saida: string; preco_antes: number; preco_promocao: number }[] | null>(null);
  useEffect(() => {
    apiFetch(`/promocoes/${p.id}/datas`).then((r) => r.json()).then(setLinhas).catch(() => setLinhas([]));
  }, [p.id]);
  return (
    <Moldura largo titulo={`${p.nome} · ${p.percentual.toLocaleString("pt-BR")}%`} sub="Datas com o desconto desta promoção agora" onClose={onClose}>
      <div className="p-5">
        {linhas === null ? <Skel className="h-40 rounded-xl" /> : linhas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma data com este desconto agora.</p>
        ) : (
          <div className="border border-gray-100 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[460px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50">
                  <th className="px-3 py-2 font-bold">Roteiro</th><th className="px-3 py-2 font-bold">Saída</th>
                  <th className="px-3 py-2 font-bold text-right">Antes</th><th className="px-3 py-2 font-bold text-right">Agora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {linhas.map((l) => (
                  <tr key={l.trip_id}>
                    <td className="px-3 py-2 text-navy-800">{l.roteiro}</td>
                    <td className="px-3 py-2 tabular-nums">{diaCurto(l.saida)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-400">R$ {fmtBRL(l.preco_antes)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">R$ {fmtBRL(l.preco_promocao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Moldura>
  );
}


function Confirmar({ p, acao, onClose, onDone }: { p: Promocao; acao: "encerrar" | "excluir"; onClose: () => void; onDone: () => void }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const ir = async () => {
    setCarregando(true); setErro("");
    try {
      const r = await apiFetch(acao === "encerrar" ? `/promocoes/${p.id}/encerrar` : `/promocoes/${p.id}`, { method: acao === "encerrar" ? "POST" : "DELETE" });
      if (!r.ok) { setErro(erroDaApi(await r.json().catch(() => ({})), "Não foi possível concluir.")); return; }
      onDone();
    } catch { setErro("Erro de conexão."); }
    finally { setCarregando(false); }
  };
  return (
    <Moldura titulo={acao === "encerrar" ? "Encerrar promoção?" : "Excluir promoção?"} onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-600">
          {acao === "encerrar"
            ? <>A promoção <strong>{p.nome}</strong> termina agora e as {p.datas_com_desconto} datas voltam ao preço de antes. Reservas já feitas mantêm o valor delas.</>
            : <>A promoção <strong>{p.nome}</strong> ainda não começou e será apagada. Nenhum preço muda.</>}
        </p>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Voltar</button>
          <button onClick={ir} disabled={carregando}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60">
            {carregando && <Loader2 size={15} className="animate-spin" />}
            {acao === "encerrar" ? "Encerrar agora" : "Excluir"}
          </button>
        </div>
      </div>
    </Moldura>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X, Plus, Search, User, Phone, CreditCard, Cake, Users, FileText, MapPin, DollarSign, MessageSquare, Clock, Copy, CheckCheck, Filter, Globe, Store, Loader2, ChevronDown, Pencil, AlertTriangle, Undo2, Ticket, Calendar, ArrowUpDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fmtBRL, spotsLabel, formatCPF, formatPhone } from "@/lib/format";
import { invalidateAdminCache, adminDirtyTs } from "@/lib/adminCache";
import { multiplicadorOpcional, QUARTO_SINGLE } from "@/lib/opcionais";
import { Skel } from "@/components/admin/Skeleton";
import { useFecharComEsc } from "@/hooks/useFecharComEsc";

const PAGE_SIZE = 25;

/** Ordem que o backend aplica quando o painel não pede nenhuma.
 *
 *  Espelha _ORDEM_PADRAO em app/routers/bookings.py, e serve só para escrever no
 *  seletor QUAL é o padrão daquela aba. Se mudar lá, mude aqui: fora de sincronia
 *  o rótulo mente, mas a lista continua certa, porque quem ordena é o servidor.
 *
 *  Cada aba responde a uma pergunta diferente: interesses e aguardando é "o que
 *  chegou agora", confirmadas é "que dinheiro entrou agora", concluídas é
 *  histórico de viagem. */
const ORDEM_PADRAO_ROTULO: Record<string, string> = {
  interesse: "Mais recentes",
  pending: "Mais recentes",
  confirmed: "Último pagamento",
  completed: "Saída mais distante",
};

// Cache da lista de viagens (dados de referência p/ dropdown + venda externa).
// Reservas em si NÃO são cacheadas - sempre refrescadas a cada visita.
const _tripsCache: { data: Trip[] | null; ts: number } = { data: null, ts: 0 };
const TRIPS_TTL = 60_000;

/* ─── Types ─── */
type Booking = {
  id: number;
  booking_code: string;
  trip_id: number;
  user_id: number | null;
  traveler_name: string | null;
  traveler_cpf: string | null;
  traveler_phone: string | null;
  traveler_birth_date: string | null;
  num_travelers: number;
  /** Poltronas ocupadas. Nulo nas reservas antigas: aí vale num_travelers. */
  seats_used?: number | null;
  price_per_person: number;
  total_amount: number;
  final_amount: number;
  payment_method: string | null;
  status: string;
  /** Confirmada sem passar pelo gateway (admin confirmou na mão). Derivado no
   *  backend pela ausência de cobrança no Asaas, não é um status separado. */
  confirmado_manual?: boolean;
  notes: string | null;
  travelers_info: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  updated_at: string | null;
  discount_amount: number;
  optionals_amount: number;
  installments: number;
  is_external: boolean;
  tier_breakdown?: { label: string; price: number; qty: number }[];
  selected_optionals?: { name: string; price: number }[];
  trip_title: string | null;
  trip_destination: string | null;
  trip_departure_date: string | null;
  trip_return_date: string | null;
  /** Mesmos instantes dos dois acima, mas declarados datetime na API: são a
   *  fonte confiável para mostrar horário. Os `_date` são declarados `date` no
   *  schema e só não truncam a hora por sorte. */
  trip_template_id?: number | null;
  trip_departure_at?: string | null;
  trip_return_at?: string | null;
  trip_quote_only?: boolean;
  trip_whatsapp_only?: boolean;
};

/** Marca a reserva que veio de roteiro sem cartão (só WhatsApp e PIX).
 *
 * É um ícone e não um selo escrito de propósito: a lista já tem código,
 * origem, status e meio de pagamento em cada linha, e mais uma palavra em
 * todas as linhas desses 12 roteiros cansaria a leitura. Quem precisa da
 * explicação passa o mouse. */
function SeloSemCartao({ b }: { b: Booking }) {
  if (!b.trip_whatsapp_only || b.trip_quote_only) return null;
  return (
    <span
      aria-label="Roteiro sem cartão"
      title="Roteiro sem cartão no site: só WhatsApp e PIX"
      className="inline-flex shrink-0 text-emerald-500 align-[-1px]"
    >
      <MessageSquare size={11} />
    </span>
  );
}

type Trip = { id: number; title: string; destination: string; price_per_person: number; available_spots: number; departure_date: string | null; return_date: string | null; template_id: number | null; is_active?: boolean; status?: string };

type TripFiltro = { trip_id: number; roteiro: string; departure_date: string | null; quote_only?: boolean; total: number };

type Counts = {
  interesse: number; pending: number; confirmed: number; completed: number;
  cancelled: number; refunded: number; all: number;
  stats: { confirmed_revenue: number; pending_value: number; month_count: number; month_value: number };
};

const STATUS_LABEL: Record<string, { label: string; color: string; border: string }> = {
  interesse:  { label: "Interesse",  color: "bg-amber-100 text-amber-700",     border: "border-l-amber-400" },
  pending:    { label: "Pendente",   color: "bg-blue-100 text-blue-700",       border: "border-l-blue-400" },
  confirmed:  { label: "Confirmado", color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400" },
  cancelled:  { label: "Cancelado",  color: "bg-red-100 text-red-700",         border: "border-l-red-400" },
  refunded:   { label: "Estornado",  color: "bg-orange-100 text-orange-700",   border: "border-l-orange-400" },
  completed:  { label: "Realizado",  color: "bg-gray-100 text-gray-600",       border: "border-l-gray-300" },
};

/**
 * O sistema cancela sozinho quem não pagou em 48h ou cuja data entrou no prazo
 * de encerramento, e deixa esse marcador nas observações. Serve para separar
 * "desistiu/foi cancelada na mão" de "o prazo acabou".
 */
const MARCA_EXPIRADA = "[expirada por falta de pagamento]";
/** Deixadas pelo backend quando a data da reserva é trocada. A segunda só
 *  aparece quando o valor pago não bate com o preço da data nova. */
const MARCA_DATA_ALTERADA = "[data alterada";
const MARCA_VALOR_DIVERGE = "valor diverge";
const teveTrocaDeData = (b: { notes?: string | null }) => (b.notes ?? "").includes(MARCA_DATA_ALTERADA);
const valorDiverge = (b: { notes?: string | null }) =>
  teveTrocaDeData(b) && (b.notes ?? "").includes(MARCA_VALOR_DIVERGE);
function statusVisual(
  b: { status: string; notes?: string | null; confirmado_manual?: boolean },
): { label: string; color: string; border: string; tag?: string; hint?: string } {
  const base = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
  if (b.status === "cancelled" && (b.notes ?? "").includes(MARCA_EXPIRADA)) {
    return { label: "Expirado", color: "bg-gray-100 text-gray-600", border: "border-l-gray-400" };
  }
  // Venda de verdade, mas o dinheiro não entrou pelo site: foi o admin que
  // confirmou. Continua verde de propósito, porque conta como receita igual.
  //
  // A pílula fica IDÊNTICA à de qualquer confirmada, e "manual" vem como
  // qualificador embaixo. Escrever as duas palavras dentro da pílula quebra a
  // linha na coluna de status e deixa uma linha com o dobro da altura das
  // outras, que foi o que despadronizou a tabela.
  if (b.status === "confirmed" && b.confirmado_manual) {
    return {
      ...base,
      tag: "manual",
      hint: "Confirmada pelo admin. O pagamento não passou pelo site.",
    };
  }
  return base;
}

/** Selo de status. Pílula sempre do mesmo tamanho; o qualificador, quando
 *  existe, entra abaixo em texto miúdo para não alterar a altura da linha. */
function SeloStatus({ st }: { st: ReturnType<typeof statusVisual> }) {
  return (
    <span className="inline-flex flex-col items-start gap-1" title={st.hint}>
      <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
        {st.label}
      </span>
      {st.tag ? (
        <span className="pl-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {st.tag}
        </span>
      ) : null}
    </span>
  );
}

const PAYMENT_LABEL: Record<string, string> = {
  whatsapp: "Presencial / WhatsApp",
  pix: "PIX",
  transfer: "Transferência",
  credit_card: "Cartão de crédito",
};

function paymentLabel(method: string | null, installments?: number): string {
  const base = PAYMENT_LABEL[method ?? ""] ?? method ?? "-";
  return installments && installments > 1 ? `${base} · ${installments}x` : base;
}

// Interesse de viagem que já passou = oportunidade (contatar para outra data).
const isPastTrip = (b: Booking) => !!b.trip_departure_date && new Date(b.trip_departure_date) < new Date();

/**
 * Idade em anos numa data de referência.
 *
 * A referência é a DATA DA SAÍDA, não hoje: para a agência o que importa é a
 * idade que a pessoa terá viajando, que é o que decide faixa de preço, meia
 * entrada e autorização de menor. Uma criança que faz 12 anos entre a reserva
 * e o embarque paga como 12. Sem data de saída, cai na idade de hoje.
 *
 * Meio-dia fixo evita o clássico escorregão de um dia por causa de fuso.
 */
function idadeEm(nascimento: string, referencia?: string | null): number | null {
  if (!nascimento) return null;
  const n = new Date(nascimento.slice(0, 10) + "T12:00:00");
  const r = referencia ? new Date(referencia.slice(0, 10) + "T12:00:00") : new Date();
  if (isNaN(n.getTime()) || isNaN(r.getTime())) return null;
  let anos = r.getFullYear() - n.getFullYear();
  const m = r.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && r.getDate() < n.getDate())) anos--;
  return anos >= 0 && anos < 130 ? anos : null;
}

/**
 * Roteiro sob cotação não tem data real: o sistema grava 01/01/2099 como
 * marcador. Usar isso como referência fazia um cliente de 2001 aparecer com
 * 97 anos. Também descarto qualquer referência absurdamente distante, porque
 * marcador futuro é sempre erro de leitura, nunca uma viagem de verdade.
 */
const ANOS_PLAUSIVEIS = 5;
function saidaUtilizavel(saida?: string | null, quoteOnly?: boolean): string | null {
  if (!saida || quoteOnly) return null;
  const d = new Date(saida.slice(0, 10) + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() + ANOS_PLAUSIVEIS);
  return d > limite ? null : saida;
}

/**
 * "· 25 anos na saída" ao lado da data de nascimento.
 *
 * Quando há data de saída o texto diz isso na cara, porque a idade viajando é
 * a que decide faixa de preço e autorização de menor. Sem data (roteiro sob
 * cotação) fica só "25 anos": escrever "25 anos hoje" ali do lado de uma data
 * de nascimento se lia como "faz aniversário hoje", que é outra informação.
 * Essa, quando é verdade, tem selo próprio.
 */
function IdadeAoLado({ nascimento, saida, quoteOnly }: { nascimento: string; saida?: string | null; quoteOnly?: boolean }) {
  const ref = saidaUtilizavel(saida, quoteOnly);
  const anos = idadeEm(nascimento, ref);
  if (anos === null) return null;
  return (
    <span className="text-gray-400 whitespace-nowrap" title={ref ? "Idade na data da saída" : "Idade atual (roteiro sem data definida)"}>
      · {plural(anos, "ano", "anos")}{ref ? " na saída" : ""}
    </span>
  );
}

function _dataMeioDia(iso?: string | null): Date | null {
  // Meio-dia fixo: com 00:00 o fuso empurra a data um dia para trás e o
  // aniversário aparece no dia errado.
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

/** Aniversário cai no dia da saída, durante a viagem, ou hoje? */
function quandoFazAniversario(
  nascimento: string,
  saida?: string | null,
  retorno?: string | null,
  quoteOnly?: boolean,
): "hoje" | "saida" | "viagem" | null {
  const n = _dataMeioDia(nascimento);
  if (!n) return null;

  const mesDia = `${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  // "sv" devolve AAAA-MM-DD, e o fuso da operação é o que vale para "hoje".
  const hoje = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
  if (hoje.slice(5) === mesDia) return "hoje";

  const ini = _dataMeioDia(saidaUtilizavel(saida, quoteOnly));
  if (!ini) return null;
  const fim = _dataMeioDia(retorno) ?? ini;

  // Percorre os anos que a viagem atravessa, para pegar quem faz aniversário
  // numa viagem de virada de ano (sai 30/12, volta 02/01).
  // Nascido em 29/02: em ano não bissexto o JS joga para 01/03, que é onde a
  // maioria das pessoas comemora mesmo.
  for (const ano of Array.from(new Set([ini.getFullYear(), fim.getFullYear()]))) {
    const dia = new Date(ano, n.getMonth(), n.getDate(), 12);
    if (dia >= ini && dia <= fim) {
      return dia.getTime() === ini.getTime() ? "saida" : "viagem";
    }
  }
  return null;
}

const _ANIVERSARIO_TEXTO = {
  hoje: "aniversário hoje",
  saida: "aniversário no dia da saída",
  viagem: "aniversário na viagem",
} as const;

/** Selo de aniversário. Fica invisível quando não é o caso, que é quase sempre. */
function AniversarioTag({ nascimento, saida, retorno, quoteOnly }: {
  nascimento: string; saida?: string | null; retorno?: string | null; quoteOnly?: boolean;
}) {
  const quando = quandoFazAniversario(nascimento, saida, retorno, quoteOnly);
  if (!quando) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
      <Cake size={9} /> {_ANIVERSARIO_TEXTO[quando]}
    </span>
  );
}

/**
 * Linha do tempo da reserva.
 *
 * Sobre o "Editado": `updated_at` no banco dispara em QUALQUER escrita, não só
 * quando o admin edita. O cliente gerar um PIX, o sistema confirmar o
 * pagamento, tudo mexe nele. Por isso as 11 reservas de produção mostravam
 * "Editado", e em 7 delas o horário batia em menos de 1 segundo com o
 * "Confirmado"/"Cancelado" logo acima: era o mesmo evento contado duas vezes.
 *
 * Agora o rótulo é "Última alteração", que é o que o campo realmente significa,
 * e ela some quando coincide com um evento já listado.
 */
const _JUNTOS_SEGUNDOS = 5;

function HistoricoReserva({ booking }: { booking: Booking }) {
  const ts = (d?: string | null) => (d ? new Date(d).getTime() : null);

  const eventos: { chave: string; rotulo: string; quando: string; ponto: string; texto: string }[] = [
    { chave: "criada", rotulo: "Criada", quando: booking.created_at, ponto: "bg-gray-300", texto: "text-gray-600" },
  ];
  if (booking.confirmed_at) {
    eventos.push({ chave: "confirmada", rotulo: "Confirmada", quando: booking.confirmed_at, ponto: "bg-emerald-500", texto: "text-emerald-700" });
  }
  if (booking.cancelled_at) {
    const estorno = booking.status === "refunded";
    eventos.push({
      chave: "encerrada",
      rotulo: estorno ? "Estornada" : "Cancelada",
      quando: booking.cancelled_at,
      ponto: estorno ? "bg-orange-500" : "bg-red-500",
      texto: estorno ? "text-orange-700" : "text-red-600",
    });
  }

  const alterada = ts(booking.updated_at);
  const jaListado = alterada !== null && eventos.some((e) => {
    const t = ts(e.quando);
    return t !== null && Math.abs(alterada - t) <= _JUNTOS_SEGUNDOS * 1000;
  });
  if (booking.updated_at && !jaListado) {
    eventos.push({ chave: "alterada", rotulo: "Última alteração", quando: booking.updated_at, ponto: "bg-gray-200", texto: "text-gray-400" });
  }

  eventos.sort((a, b) => (ts(a.quando) ?? 0) - (ts(b.quando) ?? 0));

  return (
    <ol className="relative pl-4 space-y-2.5">
      {/* trilho: começa e termina no centro dos pontos das pontas */}
      <span className="absolute left-[3px] top-[6px] bottom-[6px] w-px bg-gray-200" aria-hidden="true" />
      {eventos.map((e) => (
        <li key={e.chave} className="relative flex items-center gap-2 text-xs">
          <span className={`absolute -left-4 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full ring-2 ring-white ${e.ponto}`} aria-hidden="true" />
          <span className={`font-semibold ${e.texto}`}>{e.rotulo}</span>
          <span className="flex-1 border-b border-dashed border-gray-100" aria-hidden="true" />
          <span className="text-gray-400 tabular-nums whitespace-nowrap">{fmtDataHora(e.quando)}</span>
        </li>
      ))}
    </ol>
  );
}

/** plural(2,"reserva","reservas") → "2 reservas" */
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

function fmt(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Horário no fuso da operação. O banco grava em UTC, então sem o timeZone a
 * saída das 06:00 apareceria como 09:00 para quem está no Brasil.
 */
function hora(d?: string | null): string {
  if (!d) return "";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "";
  return t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

/** "05/08/2026 às 14:32" - para carimbos de tempo (histórico). */
function fmtDataHora(d?: string | null): string {
  if (!d) return "-";
  const h = hora(d);
  return h ? `${fmt(d)} às ${h}` : fmt(d);
}

/** "09/08/2026 · 06:00" - para data de viagem, onde o horário é operacional. */
function fmtDataHoraViagem(d?: string | null): string {
  if (!d) return "-";
  const h = hora(d);
  return h ? `${fmt(d)} · ${h}` : fmt(d);
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function WaitingBadge({ createdAt }: { createdAt: string }) {
  const days = daysSince(createdAt);
  if (days === 0) return null;
  const label = days === 1 ? "há 1 dia" : `há ${days} dias`;
  const cls =
    days >= 5
      ? "bg-red-100 text-red-600"
      : days >= 3
      ? "bg-amber-100 text-amber-600"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

// Glifo oficial do WhatsApp (lucide não tem ícone de marca).
function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function buildWaUrl(b: Booking) {
  const name = (b.traveler_name || "").split(" ")[0] || "tudo bem";
  const clean = (b.traveler_phone || "").replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const trip = b.trip_title || "sua viagem";
  const when = b.trip_quote_only ? "" : b.trip_departure_date ? ` (saída em ${fmtDataHoraViagem(b.trip_departure_at ?? b.trip_departure_date)})` : "";
  // Mensagem específica da viagem - o cliente reconhece o destino, não só um código.
  const msg = `Olá, ${name}! Aqui é a equipe da AJS Turismo. Estou entrando em contato sobre sua reserva da viagem *${trip}*${when}. (Código ${b.booking_code})`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

/* ─── Pagination ─── */
function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const items: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) items.push(i);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm">‹</button>
      {items.map((item, i) =>
        item === "…" ? (
          <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
        ) : (
          <button key={item} onClick={() => onPage(item as number)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
              page === item ? "bg-navy-800 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>{item}</button>
        )
      )}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm">›</button>
    </div>
  );
}

/* ─── Booking Detail Modal ─── */
/**
 * Troca a data da reserva por outra do MESMO roteiro.
 *
 * O valor pago não é recalculado, por decisão do dono: o dinheiro em geral já
 * entrou, e mexer nele criaria uma cobrança ou devolução que o sistema não sabe
 * executar sozinho. Quando o preço da data escolhida é diferente, este diálogo
 * mostra a diferença ANTES de confirmar, e a reserva fica marcada depois.
 */
function TrocarDataModal({ booking, datas, onClose, onDone }: {
  booking: Booking;
  datas: Trip[];
  onClose: () => void;
  onDone: () => void;
}) {
  useFecharComEsc(true, onClose);
  const [escolhida, setEscolhida] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [cienteFechada, setCienteFechada] = useState(false);
  const motivoOk = motivo.trim().length >= 3;

  const pago = Number(booking.final_amount) || 0;
  // Poltronas que a reserva ocupa: criança de colo não conta.
  const poltronas = booking.seats_used ?? booking.num_travelers;
  const agora = Date.now();
  const opcoes = datas
    .filter((t) => t.id !== booking.trip_id)
    .filter((t) => booking.trip_template_id == null || t.template_id === booking.trip_template_id)
    // Espelha as travas do servidor, para o seletor não oferecer o que vai ser
    // recusado: oculta, esgotada e cancelada ficam de fora sempre. `completed`
    // entra porque junta duas coisas: viagem que já aconteceu (barrada logo
    // abaixo pela data) e data que só fechou para venda por estar dentro do
    // prazo - essa ainda sai, e o admin pode mover reserva para lá.
    .filter((t) => t.is_active !== false && ["active", "completed"].includes(t.status ?? "active"))
    .filter((t) => !t.departure_date || new Date(t.departure_date).getTime() > agora)
    .filter((t) => (t.available_spots ?? 0) >= poltronas);
  const alvo = opcoes.find((t) => String(t.id) === escolhida);
  const alvoFechado = !!alvo && (alvo.status ?? "active") === "completed";

  // Comparação só para AVISAR. A conta oficial é a do servidor, e ela usa as
  // faixas de idade da data nova; aqui o preço por pessoa já cobre o caso comum.
  const custoNaNova = alvo ? (Number(alvo.price_per_person) || 0) * booking.num_travelers : null;
  const diferenca = custoNaNova === null ? null : Math.round((pago - custoNaNova) * 100) / 100;
  const diverge = diferenca !== null && Math.abs(diferenca) >= 0.01;

  const trocar = async () => {
    if (!alvo) { setErro("Escolha a nova data."); return; }
    if (!motivoOk) { setErro("Escreva o motivo da troca."); return; }
    if (alvoFechado && !cienteFechada) { setErro("Confirme que entendeu que esta data já está fechada."); return; }
    setSalvando(true); setErro("");
    try {
      const res = await apiFetch(`/bookings/${booking.booking_code}/trocar-data`, {
        method: "POST",
        body: JSON.stringify({
          trip_id: alvo.id,
          motivo: motivo.trim(),
          // Só vai marcado quando a data escolhida está mesmo fechada: o
          // servidor exige a marca, e mandar sempre esvaziaria a trava.
          ...(alvoFechado ? { permitir_data_fechada: true } : {}),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setErro(typeof e.detail === "string" ? e.detail : "Não foi possível trocar a data.");
        setSalvando(false);
        return;
      }
      invalidateAdminCache();
      onDone();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-display font-black text-navy-900 text-lg">Trocar a data</h3>
          <p className="text-gray-400 text-sm mt-0.5">
            {booking.trip_title ?? "Reserva"} · {booking.booking_code}
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-gray-50 px-3.5 py-3 text-sm">
            <p className="text-gray-400 text-xs uppercase font-semibold tracking-wide">Data atual</p>
            <p className="font-bold text-navy-800 mt-0.5">
              {fmtDataHoraViagem(booking.trip_departure_at ?? booking.trip_departure_date)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nova data</label>
            {/* Trocar de data zera a confirmação: marcar para uma saída e
                mudar para outra não pode carregar o consentimento junto. */}
            <select value={escolhida} onChange={(e) => { setEscolhida(e.target.value); setCienteFechada(false); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400">
              <option value="">Selecione...</option>
              {opcoes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.departure_date ? fmtDataHoraViagem(t.departure_date) : "sem data"} · R$ {fmtBRL(t.price_per_person)} · {spotsLabel(t.available_spots)}
                  {(t.status ?? "active") === "completed" ? " · FECHADA para vendas" : ""}
                </option>
              ))}
            </select>
            {opcoes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1.5">
                Nenhuma outra data disponível neste roteiro. A lista mostra só datas ainda por vir
                e com {plural(poltronas, "lugar livre", "lugares livres")}.
              </p>
            )}
          </div>

          {alvoFechado && (
            <div className="rounded-xl border border-gold-300 bg-gold-50 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gold-800 uppercase tracking-wide">
                <AlertTriangle size={12} /> Data fechada para vendas
              </p>
              <p className="text-sm text-navy-800 mt-1.5">
                Esta saída já entrou no prazo de encerramento, então o site não vende mais para
                ela. A viagem acontece normalmente e tem{" "}
                <span className="font-bold">{spotsLabel(alvo!.available_spots)}</span> — mover a
                reserva para cá é seguro, mas confirme com a operação que dá tempo de incluir
                {" "}{plural(booking.num_travelers, "a pessoa", "as pessoas")} na lista de embarque.
              </p>
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={cienteFechada} disabled={salvando}
                  onChange={(e) => setCienteFechada(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gold-400 text-gold-600 focus:ring-gold-400" />
                <span className="text-xs text-navy-700 font-semibold">
                  Entendi que esta data já está fechada e quero mover mesmo assim.
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Motivo <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={motivo} maxLength={300}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: previsão de chuva, cliente pediu"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Fica registrado na observação da reserva. Daqui a três meses, é a única resposta para
              &quot;por que essa reserva mudou de data?&quot;.
            </p>
          </div>

          {alvo && (
            diverge ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide">
                  <AlertTriangle size={12} /> Confira o valor
                </p>
                <p className="text-sm text-amber-800 mt-1.5">
                  Pago <span className="font-bold">R$ {fmtBRL(pago)}</span> · a data nova custa{" "}
                  <span className="font-bold">R$ {fmtBRL(custoNaNova!)}</span>
                </p>
                <p className="text-sm font-bold text-amber-900 mt-1">
                  {diferenca! > 0
                    ? `A cliente pagou R$ ${fmtBRL(Math.abs(diferenca!))} a mais.`
                    : `Faltam R$ ${fmtBRL(Math.abs(diferenca!))}.`}
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  O valor da reserva não muda. A diferença fica registrada na observação para você resolver com a cliente.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                <p className="text-sm text-emerald-800">
                  Mesmo valor: <span className="font-bold">R$ {fmtBRL(pago)}</span>. Nada a acertar.
                </p>
              </div>
            )
          )}

          {erro && <p className="text-sm text-red-500">{erro}</p>}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} disabled={salvando}
            className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50">
            Voltar
          </button>
          <button onClick={trocar} disabled={salvando || !alvo || !motivoOk || (alvoFechado && !cienteFechada)}
            className="flex-1 flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />} Trocar data
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, trip, onClose, onConfirm, onEdit, onCancel, onRefund, onTrocarData, actionLoading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: (code: string) => void;
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onRefund: (booking: Booking) => void;
  onTrocarData: (booking: Booking) => void;
  actionLoading: string | null;
}) {
  useFecharComEsc(true, onClose);
  const st = statusVisual(booking);
  const travelerName = booking.traveler_name || `Usuário #${booking.user_id}`;
  const [codeCopied, setCodeCopied] = useState(false);
  const copyCode = () => {
    navigator.clipboard.writeText(booking.booking_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };
  const companions: { full_name: string; cpf: string; birth_date: string }[] = (() => {
    try { return booking.travelers_info ? JSON.parse(booking.travelers_info) : []; }
    catch { return []; }
  })();
  const isLoading = actionLoading === booking.booking_code;
  const canAct = ["interesse", "confirmed", "pending"].includes(booking.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">
        {/* Alça no topo. No celular a folha ocupa 92% da tela e sobra pouca
            área para tocar fora dela, então precisa de um alvo visível de
            "fechar" além do X. */}
        <button onClick={onClose} aria-label="Fechar"
          className="sm:hidden w-full pt-3 pb-1.5 flex justify-center flex-shrink-0 active:bg-gray-50 rounded-t-3xl">
          <span className="h-1.5 w-12 rounded-full bg-gray-300" />
        </button>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-5 pb-4 pt-2 sm:pt-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <button onClick={copyCode} className="flex items-center gap-1.5 font-mono text-sm text-navy-700 font-bold hover:text-gold-600 transition-colors group">
              {booking.booking_code}
              {codeCopied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} className="text-gray-300 group-hover:text-gold-500 transition-colors" />}
            </button>
            <SeloStatus st={st} />
            {booking.is_external
              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700"><Store size={10} /> Externo</span>
              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Globe size={10} /> Via Site</span>
            }
            {booking.status === "interesse" && <WaitingBadge createdAt={booking.created_at} />}
          </div>
          {/* flex-shrink-0 e alvo de 40px: com muitos selos o X era espremido
              pela esquerda e virava difícil de acertar com o dedo. */}
          <button onClick={onClose} aria-label="Fechar"
            className="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Viagem */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MapPin size={11} /> Viagem</p>
            <p className="font-bold text-navy-800">{booking.trip_title ?? trip?.title ?? `Viagem #${booking.trip_id}`}</p>
            {(booking.trip_destination ?? trip?.destination) && (
              <p className="text-sm text-gray-500 mt-0.5">{booking.trip_destination ?? trip?.destination}</p>
            )}
            {booking.trip_quote_only ? (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Clock size={10} /> Sob cotação
              </p>
            ) : booking.trip_departure_date && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Clock size={10} />
                {fmtDataHoraViagem(booking.trip_departure_at ?? booking.trip_departure_date)}{(booking.trip_return_at ?? booking.trip_return_date) ? ` → ${fmtDataHoraViagem(booking.trip_return_at ?? booking.trip_return_date)}` : ""}
              </p>
            )}
          </section>

          {/* Titular */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><User size={11} /> Titular</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              <p className="font-semibold text-navy-800">{travelerName}</p>
              {booking.traveler_cpf && (
                <p className="text-gray-500 font-mono text-xs flex items-center gap-1.5"><CreditCard size={11} className="text-gray-400" />{formatCPF(booking.traveler_cpf)}</p>
              )}
              {booking.traveler_phone && (
                <div className="flex items-center gap-2">
                  <p className="text-gray-500 text-xs flex items-center gap-1.5"><Phone size={11} className="text-gray-400" />{formatPhone(booking.traveler_phone)}</p>
                  <a href={buildWaUrl(booking)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366] hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors">
                    <WhatsAppGlyph size={13} /> WhatsApp
                  </a>
                </div>
              )}
              {booking.traveler_birth_date && (
                <p className="text-gray-500 text-xs flex items-center gap-1.5"><Cake size={11} className="text-gray-400" />{fmt(booking.traveler_birth_date)} <IdadeAoLado nascimento={booking.traveler_birth_date} saida={booking.trip_departure_date} quoteOnly={booking.trip_quote_only} /> <AniversarioTag nascimento={booking.traveler_birth_date} saida={booking.trip_departure_date} retorno={booking.trip_return_date} quoteOnly={booking.trip_quote_only} /></p>
              )}
            </div>
          </section>

          {/* Acompanhantes */}
          {companions.length > 0 && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users size={11} /> Acompanhantes ({companions.length})</p>
              <div className="space-y-2">
                {companions.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <p className="font-semibold text-navy-800 text-sm">{c.full_name}</p>
                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5"><CreditCard size={11} className="text-gray-400" />{formatCPF(c.cpf)}</p>
                    {c.birth_date && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Cake size={11} className="text-gray-400" />{fmt(c.birth_date)} <IdadeAoLado nascimento={c.birth_date} saida={booking.trip_departure_date} quoteOnly={booking.trip_quote_only} /> <AniversarioTag nascimento={c.birth_date} saida={booking.trip_departure_date} retorno={booking.trip_return_date} quoteOnly={booking.trip_quote_only} /></p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Financeiro */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><DollarSign size={11} /> Financeiro</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
              {booking.tier_breakdown && booking.tier_breakdown.length > 0 ? (
                booking.tier_breakdown.map((t, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span>{t.qty} × {t.label} (R$ {fmtBRL(t.price)})</span>
                    <span>R$ {fmtBRL(t.qty * t.price)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-gray-600">
                  <span>{booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""} × R$ {fmtBRL(booking.price_per_person)}</span>
                  <span>R$ {fmtBRL(booking.total_amount)}</span>
                </div>
              )}
              {typeof booking.seats_used === "number" && booking.seats_used !== booking.num_travelers && (
                <div className="flex justify-between gap-2 text-[11px] text-navy-600 border-t border-gray-100 pt-2">
                  <span className="shrink-0">Ocupação no ônibus</span>
                  <span className="text-right">
                    {booking.num_travelers} pessoas · {booking.seats_used} poltrona{booking.seats_used !== 1 ? "s" : ""} ·{" "}
                    {booking.num_travelers - booking.seats_used} de colo
                  </span>
                </div>
              )}
              {booking.selected_optionals && booking.selected_optionals.length > 0 && (
                <div className="space-y-1 border-t border-gray-100 pt-2">
                  {(() => {
                    // Adulto = quem paga o valor cheio. Mesma definição do backend,
                    // e é ela que decide o multiplicador do quarto.
                    const adultos = booking.tier_breakdown?.length
                      ? booking.tier_breakdown
                          .filter(t => t.price >= (booking.price_per_person ?? 0))
                          .reduce((s, t) => s + t.qty, 0)
                      : booking.num_travelers;
                    return booking.selected_optionals!.map((o, i) => {
                      // O quarto multiplica por ADULTO; o resto, por pessoa. Esta
                      // linha usava `num_travelers` fixo, então numa reserva de
                      // 1 adulto + 1 criança mostrava "(2×) R$ 1.800,00" para um
                      // quarto de R$ 900 - e a soma das linhas não fechava com o
                      // total. O valor COBRADO sempre esteve certo; era só a
                      // exibição do painel.
                      const vezes = multiplicadorOpcional(
                        { name: o.name, price: o.price, por_adulto: o.name === QUARTO_SINGLE },
                        booking.num_travelers,
                        adultos,
                      );
                      return (
                        <div key={i} className="flex justify-between text-gold-700">
                          <span>+ {o.name} <span className="text-gray-400 text-xs">({vezes}×)</span></span>
                          <span>R$ {fmtBRL(o.price * vezes)}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              {booking.discount_amount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Desconto</span>
                  <span>− R$ {fmtBRL(booking.discount_amount)}</span>
                </div>
              )}
              {(() => {
                const juros = booking.final_amount - (booking.total_amount + (booking.optionals_amount || 0) - (booking.discount_amount || 0));
                return juros > 0.01 ? (
                  <div className="flex justify-between text-gray-500">
                    <span>Juros do parcelamento{booking.installments > 1 ? ` (${booking.installments}x)` : ""}</span>
                    <span>+ R$ {fmtBRL(juros)}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between font-bold text-navy-800 border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>R$ {fmtBRL(booking.final_amount)}</span>
              </div>
              <p className="text-xs text-gray-400">{PAYMENT_LABEL[booking.payment_method ?? ""] ?? booking.payment_method ?? "-"}{booking.installments > 1 ? ` · ${booking.installments}x` : ""}</p>
            </div>
          </section>

          {/* Data trocada com valor divergente: o dinheiro nao e mexido na troca,
              entao o acerto com a cliente fica pendente e precisa saltar aos olhos. */}
          {valorDiverge(booking) && (
            <section>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide">
                  <AlertTriangle size={12} /> Valor a acertar
                </p>
                <p className="text-sm text-amber-800 mt-1.5">
                  A data desta reserva foi trocada e o valor pago não bate com o preço da data atual.
                  Os números estão na observação abaixo.
                </p>
              </div>
            </section>
          )}

          {/* Observações */}
          {booking.notes && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MessageSquare size={11} /> Observações</p>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{booking.notes}</p>
            </section>
          )}

          {/* Histórico */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Clock size={11} /> Histórico</p>
            <HistoricoReserva booking={booking} />
          </section>
        </div>

        {/* Voucher: só depois de pago, que é quando o backend libera. */}
        {["confirmed", "completed"].includes(booking.status) && <VoucherButton booking={booking} />}

        {/* Actions */}
        {canAct && (
          <div className="p-4 border-t border-gray-100 flex gap-2">
            {/* Confirmar interesse é do dia a dia: continua sendo a ação
                principal, sólida e ocupando espaço. */}
            {booking.status === "interesse" && (
              <button onClick={() => { onConfirm(booking.booking_code); onClose(); }} disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
                <Check size={14} /> Confirmar
              </button>
            )}
            {/* Marcar paga é raro - só quando o cliente não conseguiu pagar no
                site. Discreto e do mesmo tamanho dos secundários, para não
                competir com o resto nem convidar a clique distraído. */}
            {booking.status === "pending" && (
              <button onClick={() => { onConfirm(booking.booking_code); onClose(); }} disabled={isLoading}
                title="Marcar como paga (recebida por fora do site)"
                className="flex items-center justify-center gap-1.5 border border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-bold py-3 px-3 sm:px-4 rounded-xl transition-colors disabled:opacity-50 text-sm whitespace-nowrap">
                <Check size={14} />
                <span className="hidden sm:inline">Marcar paga</span>
              </button>
            )}
            <button onClick={() => { onEdit(booking); onClose(); }} disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 border border-navy-300 text-navy-700 bg-navy-50 hover:bg-navy-100 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
              <Pencil size={14} /> Editar
            </button>
            <button onClick={() => { onTrocarData(booking); onClose(); }} disabled={isLoading} title="Trocar a data desta reserva"
              className="flex items-center justify-center gap-1.5 border border-navy-200 text-navy-600 hover:bg-navy-50 font-bold py-3 px-3 sm:px-4 rounded-xl transition-colors disabled:opacity-50 text-sm">
              <Calendar size={14} />
              <span className="hidden sm:inline">Trocar data</span>
            </button>
            {booking.status === "confirmed" && ["pix", "credit_card"].includes(booking.payment_method ?? "") ? (
              <button onClick={() => { onRefund(booking); onClose(); }} disabled={isLoading}
                className="flex items-center justify-center gap-1.5 border border-amber-300 text-amber-600 hover:bg-amber-50 font-bold py-3 px-3 sm:px-4 rounded-xl transition-colors disabled:opacity-50 text-sm">
                <Undo2 size={14} />
                <span className="hidden sm:inline">Estornar</span>
              </button>
            ) : (
              <button onClick={() => { onCancel(booking); onClose(); }} disabled={isLoading}
                className="flex items-center justify-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 font-bold py-3 px-3 sm:px-4 rounded-xl transition-colors disabled:opacity-50 text-sm">
                <X size={14} />
                <span className="hidden sm:inline">Cancelar</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Voucher da reserva (para o admin reenviar ao cliente) ─── */
function VoucherButton({ booking }: { booking: Booking }) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const filename = `voucher-${booking.booking_code}.pdf`;

  const baixar = async () => {
    if (busy) return;
    setBusy(true); setErro("");
    try {
      const res = await apiFetch(`/bookings/my/${booking.booking_code}/voucher`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();

      // No celular abre o compartilhamento nativo, que é o caminho direto para
      // o WhatsApp; no computador cai no download do arquivo.
      const file = new File([blob], filename, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Voucher ${booking.booking_code}` });
          return;
        } catch (e) {
          if ((e as DOMException)?.name === "AbortError") return;   // usuário desistiu
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setErro("Não foi possível gerar o voucher. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-4">
      <button onClick={baixar} disabled={busy}
        className="w-full flex items-center justify-center gap-2 border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
        {busy ? "Gerando..." : "Voucher do cliente"}
      </button>
      {erro && <p className="text-xs text-red-500 mt-1.5 text-center">{erro}</p>}
    </div>
  );
}

/* ─── Edit Booking Modal ─── */
function EditBookingModal({ booking, onClose, onSaved }: {
  booking: Booking;
  onClose: () => void;
  onSaved: () => void;
}) {
  useFecharComEsc(true, onClose);
  type Companion = { full_name: string; cpf: string; birth_date: string };

  const parsedCompanions: Companion[] = (() => {
    try { return booking.travelers_info ? JSON.parse(booking.travelers_info) : []; }
    catch { return []; }
  })();

  const [price, setPrice] = useState(String(booking.price_per_person));
  const [discount, setDiscount] = useState(String(booking.discount_amount || ""));
  const [paymentMethod, setPaymentMethod] = useState(booking.payment_method || "whatsapp");
  const [notes, setNotes] = useState(booking.notes || "");
  const [phone, setPhone] = useState(booking.traveler_phone || "");
  const [people, setPeople] = useState(booking.num_travelers);
  const [companions, setCompanions] = useState<Companion[]>(
    parsedCompanions.length > 0
      ? parsedCompanions
      : Array.from({ length: Math.max(0, booking.num_travelers - 1) }, () => ({ full_name: "", cpf: "", birth_date: "" }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const changePeople = (n: number) => {
    const clamped = Math.max(1, n);
    setPeople(clamped);
    setCompanions((prev) => {
      const need = clamped - 1;
      if (need > prev.length) return [...prev, ...Array.from({ length: need - prev.length }, () => ({ full_name: "", cpf: "", birth_date: "" }))];
      return prev.slice(0, need);
    });
  };

  const updateCompanion = (i: number, field: keyof Companion, value: string) => {
    setCompanions((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const priceNum = parseFloat(price) || 0;
  const discNum = parseFloat(discount) || 0;
  const total = priceNum * people - discNum;
  const changed = priceNum !== booking.price_per_person || discNum !== (booking.discount_amount || 0) || people !== booking.num_travelers;

  const PAYMENT_LABEL: Record<string, string> = {
    whatsapp: "Presencial / WhatsApp", pix: "PIX", transfer: "Transferência", credit_card: "Cartão de crédito",
  };

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch(`/bookings/${booking.booking_code}/edit`, {
        method: "PATCH",
        body: JSON.stringify({
          price_per_person: priceNum !== booking.price_per_person ? priceNum : undefined,
          discount_amount: discNum,
          payment_method: paymentMethod,
          notes: notes || null,
          traveler_phone: phone || undefined,
          num_travelers: people,
          companions: companions.map((c) => ({ full_name: c.full_name, cpf: c.cpf, birth_date: c.birth_date || undefined })),
        }),
      });
      if (!res.ok) { const e = await res.json(); setError(parseApiError(e)); return; }
      onSaved();
      onClose();
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-navy-800 text-base flex items-center gap-2"><Pencil size={15} /> Editar Reserva</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{booking.booking_code} · {booking.traveler_name || `Usuário #${booking.user_id}`}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          {/* Preço + Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Preço / pessoa</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">R$</span>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${priceNum !== booking.price_per_person ? "border-amber-300 bg-amber-50" : "border-gray-200"}`} />
              </div>
              {priceNum !== booking.price_per_person && <p className="text-[10px] text-amber-600 mt-1">Original: R$ {fmtBRL(booking.price_per_person)}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Desconto <span className="text-gray-400 font-normal normal-case">(R$)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">R$</span>
                <input type="number" min="0" step="0.01" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
          </div>

          {/* Pessoas + Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pessoas</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
                <button type="button" onClick={() => changePeople(people - 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">−</button>
                <span className="flex-1 text-center font-bold text-sm text-navy-800">{people}</span>
                <button type="button" onClick={() => changePeople(people + 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pagamento</label>
              <div className="relative">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                  {Object.entries(PAYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Telefone do titular</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" placeholder="(41) 99999-9999" value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
            </div>
          </div>

          {/* Acompanhantes */}
          {companions.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Users size={11} /> Acompanhantes ({companions.length})
              </label>
              {companions.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400">Acompanhante {i + 1}</p>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Nome completo" value={c.full_name}
                      onChange={(e) => updateCompanion(i, "full_name", e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <CreditCard size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" inputMode="numeric" placeholder="CPF" value={c.cpf}
                        onChange={(e) => updateCompanion(i, "cpf", formatCPF(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                    <div className="relative">
                      <Cake size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" value={c.birth_date}
                        onChange={(e) => updateCompanion(i, "birth_date", e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Observações</label>
            <div className="relative">
              <FileText size={13} className="absolute left-3 top-3 text-gray-400" />
              <textarea rows={2} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
            </div>
          </div>

          {/* Total */}
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${changed ? "bg-amber-50 border border-amber-200" : "bg-navy-50"}`}>
            <span className="text-gray-500">{people} × R$ {fmtBRL(priceNum)}{discNum > 0 ? ` − R$ ${fmtBRL(discNum)}` : ""}</span>
            <span className="font-black text-navy-800 text-base">R$ {fmtBRL(total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : <><Check size={15} /> Salvar alterações</>}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ─── Cancel Confirm Modal ─── */
function CancelConfirmModal({ booking, trip, onClose, onConfirm, loading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  useFecharComEsc(true, onClose);
  const travelerName = booking.traveler_name || `Usuário #${booking.user_id}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={26} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Cancelar reserva?</h3>
              <p className="text-gray-400 text-sm mt-1">Esta ação não pode ser desfeita.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
            <p className="font-mono text-xs text-gray-400">{booking.booking_code}</p>
            <p className="font-bold text-navy-800">{travelerName}</p>
            {trip && <p className="text-sm text-gray-500">{trip.title}</p>}
            <p className="text-xs text-gray-400">
              R$ {fmtBRL(booking.final_amount)} · {booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Voltar
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
              Cancelar reserva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Marcar Pago Modal ─── */
// Só aparece para reserva em "aguardando pagamento". O interesse confirma
// direto, porque ali nunca houve tentativa de pagamento pelo site.
function MarcarPagoModal({ booking, trip, onClose, onConfirm, loading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: (paymentMethod: string) => void;
  loading: boolean;
}) {
  useFecharComEsc(true, onClose);
  const travelerName = booking.traveler_name || `Usuário #${booking.user_id}`;
  // Transferência é o padrão porque é o caso que trouxe esta tela: cliente que
  // não conseguiu pagar no site e pagou por link de outro banco.
  const [pagamento, setPagamento] = useState(booking.payment_method || "transfer");
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <Check size={26} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Marcar como paga?</h3>
              <p className="text-gray-400 text-sm mt-1">
                Esta reserva ficou aguardando pagamento pelo site.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
            <p className="font-mono text-xs text-gray-400">{booking.booking_code}</p>
            <p className="font-bold text-navy-800">{travelerName}</p>
            {trip && <p className="text-sm text-gray-500">{trip.title}</p>}
            <p className="text-xs text-gray-400">
              R$ {fmtBRL(booking.final_amount)} · {booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1.5">Como o pagamento foi recebido?</label>
            <select value={pagamento} onChange={(e) => setPagamento(e.target.value)} disabled={loading}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-navy-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60">
              {Object.entries(PAYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5">Fica gravado na reserva junto com a confirmação.</p>
          </div>

          <div className="bg-gold-50 border border-gold-200 rounded-xl p-3.5">
            <p className="text-xs text-navy-700 leading-relaxed">
              Use apenas se o dinheiro <strong>já foi recebido por fora do site</strong> (link de
              outro banco, transferência, presencial). A venda é fechada e{" "}
              <strong>{booking.num_travelers} vaga{booking.num_travelers !== 1 ? "s são baixadas" : " é baixada"}</strong>.
              Se ainda houver PIX em aberto, o cliente pode acabar pagando duas vezes.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} disabled={loading}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60 text-sm">
              Voltar
            </button>
            <button onClick={() => onConfirm(pagamento)} disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm whitespace-nowrap">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Marcar paga
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Refund Confirm Modal ─── */
function RefundConfirmModal({ booking, trip, onClose, onConfirm, loading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  useFecharComEsc(true, onClose);
  const travelerName = booking.traveler_name || `Usuário #${booking.user_id}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <Undo2 size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Estornar reserva?</h3>
              <p className="text-gray-400 text-sm mt-1">O valor pago será devolvido ao cliente ({paymentLabel(booking.payment_method)}) e a vaga liberada.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
            <p className="font-mono text-xs text-gray-400">{booking.booking_code}</p>
            <p className="font-bold text-navy-800">{travelerName}</p>
            {trip && <p className="text-sm text-gray-500">{trip.title}</p>}
            <p className="text-xs text-gray-400">
              R$ {fmtBRL(booking.final_amount)} · {booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Voltar
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}
              Estornar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function validateCPF(val: string): boolean {
  const d = val.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = sum % 11;
  if ((r < 2 ? 0 : 11 - r) !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = sum % 11;
  return (r < 2 ? 0 : 11 - r) === parseInt(d[10]);
}

function parseApiError(err: unknown): string {
  if (!err || typeof err !== "object") return "Erro ao salvar.";
  const e = err as Record<string, unknown>;
  if (typeof e.detail === "string") return e.detail;
  if (Array.isArray(e.detail)) {
    // Pydantic 422 - array de objetos com { msg, loc }
    return e.detail.map((d: unknown) => {
      if (d && typeof d === "object") {
        const de = d as Record<string, unknown>;
        return typeof de.msg === "string" ? de.msg : JSON.stringify(de);
      }
      return String(d);
    }).join(", ");
  }
  return "Erro ao salvar.";
}

/* ─── External Sale Modal ─── */
function ExternalSaleModal({ trips, onClose, onSaved }: {
  trips: Trip[];
  onClose: () => void;
  onSaved: () => void;
}) {
  useFecharComEsc(true, onClose);
  type Companion = { full_name: string; cpf: string; birth_date: string };

  const [templateKey, setTemplateKey] = useState("");
  const [tripId, setTripId] = useState("");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");
  const [people, setPeople] = useState(1);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("whatsapp");
  const [notes, setNotes] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cpfStatus, setCpfStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [autoFilled, setAutoFilled] = useState(false);
  const cpfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changePeople = (n: number) => {
    const max = selectedTrip?.available_spots ?? 99;
    const clamped = Math.max(1, Math.min(n, max));
    setPeople(clamped);
    setCompanions((prev) => {
      const need = clamped - 1;
      if (need > prev.length) return [...prev, ...Array.from({ length: need - prev.length }, () => ({ full_name: "", cpf: "", birth_date: "" }))];
      return prev.slice(0, need);
    });
  };

  const updateCompanion = (i: number, field: keyof Companion, value: string) => {
    setCompanions((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const handleCpfChange = (v: string) => {
    const formatted = formatCPF(v);
    setCpf(formatted);
    setAutoFilled(false);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length < 11) { setCpfStatus("idle"); return; }
    setCpfStatus("loading");
    if (cpfTimer.current) clearTimeout(cpfTimer.current);
    cpfTimer.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/bookings/admin/lookup-cpf?cpf=${clean}`);
        const d = await res.json();
        if (d.found) {
          setCpfStatus("found");
          setName(d.full_name || "");
          setPhone(d.phone ? formatPhone(d.phone) : "");
          setBirth(d.birth_date ? d.birth_date.slice(0, 10) : "");
          setAutoFilled(true);
        } else {
          setCpfStatus("not_found");
          setAutoFilled(false);
        }
      } catch {
        setCpfStatus("idle");
      }
    }, 400);
  };

  // Unique templates (deduplicated by template_id or title)
  const templateOptions: Trip[] = (() => {
    const seen = new Set<string>();
    return trips.filter((t) => {
      const key = String(t.template_id ?? t.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Dates available for selected template
  const dateOptions = trips.filter(
    (t) => templateKey && String(t.template_id ?? t.title) === templateKey
  );

  const selectedTrip = trips.find((t) => String(t.id) === tripId);
  const effectivePrice = priceOverride ? parseFloat(priceOverride) || 0 : (selectedTrip?.price_per_person || 0);
  const total = effectivePrice * people;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!templateKey) { setError("Selecione o roteiro."); return; }
    if (!tripId) { setError("Selecione a data de saída."); return; }
    if (!validateCPF(cpf)) { setError("CPF inválido. Verifique os números digitados."); return; }
    if (!name.trim()) { setError("Informe o nome do titular."); return; }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) { setError("Telefone inválido. Informe DDD + número."); return; }
    for (let i = 0; i < companions.length; i++) {
      const c = companions[i];
      if (!c.full_name.trim()) { setError(`Informe o nome do acompanhante ${i + 1}.`); return; }
      if (c.cpf && !validateCPF(c.cpf)) { setError(`CPF do acompanhante ${i + 1} inválido.`); return; }
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/bookings/admin/external`, {
        method: "POST",
        body: JSON.stringify({
          trip_id: parseInt(tripId),
          traveler_name: name,
          traveler_cpf: cpf,
          traveler_phone: phone,
          traveler_birth_date: birth || undefined,
          num_travelers: people,
          companions: companions.filter((c) => c.full_name.trim()).map((c) => ({
            full_name: c.full_name,
            cpf: c.cpf,
            birth_date: c.birth_date || undefined,
          })),
          payment_method: paymentMethod,
          price_override: priceOverride ? parseFloat(priceOverride) : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(parseApiError(err));
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-navy-800 text-base">Nova Venda Externa</h3>
            <p className="text-xs text-gray-400 mt-0.5">Walk-in · WhatsApp · Presencial</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          {/* 1. Roteiro */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Roteiro</label>
            <div className="relative">
              <select value={templateKey} onChange={(e) => { setTemplateKey(e.target.value); setTripId(""); }}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                <option value="">Selecione o roteiro...</option>
                {templateOptions.map((t) => (
                  <option key={t.template_id ?? t.title} value={String(t.template_id ?? t.title)}>
                    {t.title} - {t.destination}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. Data */}
          {templateKey && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Data de saída</label>
              <div className="relative">
                <select required value={tripId} onChange={(e) => setTripId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                  <option value="">Selecione a data...</option>
                  {dateOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.departure_date ? fmtDataHoraViagem(t.departure_date) : "Data indefinida"}
                      {t.return_date ? ` → ${fmtDataHoraViagem(t.return_date)}` : ""}
                      {" "}· {spotsLabel(t.available_spots)} · R$ {fmtBRL(t.price_per_person)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {selectedTrip && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <MapPin size={10} /> {selectedTrip.destination}
                  <span className="mx-1">·</span>
                  <span className="font-semibold text-navy-600">R$ {fmtBRL(selectedTrip.price_per_person)} / pessoa</span>
                  <span className="mx-1">·</span>
                  {spotsLabel(selectedTrip.available_spots)}
                </p>
              )}
            </div>
          )}

          {/* 2. CPF com lookup */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">CPF do Titular</label>
            <div className="relative">
              <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" inputMode="numeric" placeholder="000.000.000-00"
                value={cpf} onChange={(e) => handleCpfChange(e.target.value)}
                className="w-full pl-8 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {cpfStatus === "loading" && <Loader2 size={14} className="text-gray-400 animate-spin" />}
                {cpfStatus === "found" && <Check size={14} className="text-emerald-500" />}
              </div>
            </div>
            {cpfStatus === "found" && (
              <p className="mt-1.5 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check size={11} /> Cliente encontrado - dados preenchidos automaticamente
              </p>
            )}
            {cpfStatus === "not_found" && (
              <p className="mt-1.5 text-xs text-gray-400">Novo cliente - preencha os dados abaixo</p>
            )}
          </div>

          {/* 3. Dados pessoais */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Dados do Titular</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Nome completo" value={name} onChange={(e) => { setName(e.target.value); setAutoFilled(false); }}
                className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${autoFilled ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" placeholder="(41) 99999-9999" value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setAutoFilled(false); }}
                  className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${autoFilled && phone ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`} />
              </div>
              <div className="relative">
                <Cake size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="date" value={birth} onChange={(e) => { setBirth(e.target.value); setAutoFilled(false); }}
                  className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${autoFilled && birth ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Data de nascimento é opcional</p>
          </div>

          {/* 4. Quantidade + Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pessoas</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
                <button type="button" onClick={() => changePeople(people - 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">−</button>
                <span className="flex-1 text-center font-bold text-sm text-navy-800">{people}</span>
                <button type="button" onClick={() => changePeople(people + 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pagamento</label>
              <div className="relative">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                  <option value="whatsapp">Presencial / WA</option>
                  <option value="pix">PIX</option>
                  <option value="transfer">Transferência</option>
                  <option value="credit_card">Cartão</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 4b. Acompanhantes */}
          {companions.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Users size={11} /> Acompanhantes ({companions.length})
              </label>
              {companions.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400">Acompanhante {i + 1}</p>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Nome completo *" value={c.full_name}
                      onChange={(e) => updateCompanion(i, "full_name", e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <CreditCard size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" inputMode="numeric" placeholder="CPF *" value={c.cpf}
                        onChange={(e) => updateCompanion(i, "cpf", formatCPF(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                    <div className="relative">
                      <Cake size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" value={c.birth_date}
                        onChange={(e) => updateCompanion(i, "birth_date", e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. Preço (override) */}
          <div>
            <button type="button" onClick={() => setShowPriceOverride((v) => !v)}
              className="text-xs text-navy-500 hover:text-navy-700 underline underline-offset-2 transition-colors">
              {showPriceOverride ? "Usar preço padrão da viagem" : "Alterar preço por pessoa?"}
            </button>
            {showPriceOverride && (
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">R$</span>
                <input type="number" min="0" step="0.01" placeholder={String(selectedTrip?.price_per_person || "0")}
                  value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-amber-300 bg-amber-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            )}
          </div>

          {/* 6. Obs */}
          <div className="relative">
            <FileText size={13} className="absolute left-3 top-3 text-gray-400" />
            <textarea rows={2} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
          </div>

          {/* Resumo + Submit */}
          {selectedTrip && (
            <div className="bg-navy-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">{people} pessoa{people !== 1 ? "s" : ""} × R$ {fmtBRL(effectivePrice)}</span>
              <span className="font-black text-navy-800 text-base">R$ {fmtBRL(total)}</span>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Confirmar Venda"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>({
    interesse: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, refunded: 0, all: 0,
    stats: { confirmed_revenue: 0, pending_value: 0, month_count: 0, month_value: 0 },
  });
  // Zero de verdade e "ainda não sei" desenhavam igual: os números apareciam do
  // nada e o resumo saltava de R$ 0,00 para o valor real.
  const [countsCarregou, setCountsCarregou] = useState(false);
  const [trips, setTrips] = useState<Trip[]>(_tripsCache.data ?? []);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<string>(searchParams.get("status") ?? "interesse");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showExternal, setShowExternal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [pagoTarget, setPagoTarget] = useState<Booking | null>(null);
  const [trocaTarget, setTrocaTarget] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [tripFilter, setTripFilter] = useState<string>(searchParams.get("trip_id") ?? "");
  // Ordem escolhida à mão. Vazio = usar o padrão da aba, que o backend decide.
  // Guardada por aba: quem inverte os interesses para atacar a fila de espera
  // não quer que as confirmadas mudem junto.
  const [ordem, setOrdem] = useState<string>("");
  const [erroCarga, setErroCarga] = useState(false);
  // Só as datas que TÊM reserva, já ordenadas por roteiro e depois por saída.
  // Antes o seletor lia /trips/admin-list, que traz todas as 331 datas
  // cadastradas limitadas a 100: quase toda opção escolhida não tinha reserva
  // nenhuma, e duas que tinham ficavam de fora por serem antigas.
  const [tripsFiltro, setTripsFiltro] = useState<TripFiltro[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [tab, tripFilter, debouncedSearch, ordem]);
  // Trocar de aba zera a escolha: cada aba tem a ordem que responde a pergunta dela.
  useEffect(() => { setOrdem(""); }, [tab]);

  // Mesma trava do fetchBookings: voltar para a aba dispara `focus` e
  // `visibilitychange`, e sem isto o contador era pedido duas vezes.
  const contandoAgora = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (contandoAgora.current) return;
    contandoAgora.current = true;
    try {
      const res = await apiFetch(`/bookings/admin/counts`);
      if (res.ok) { setCounts(await res.json()); setCountsCarregou(true); }
    } catch { /* ignore */ }
    finally { contandoAgora.current = false; }
  }, []);

  // Quando foi a última busca que deu certo. Segura o gatilho de voltar à aba
  // para trocar de janela rápido não virar uma requisição a cada alt-tab.
  const ultimaCarga = useRef(0);
  // Trava de busca em andamento. Voltar para a aba dispara `focus` E
  // `visibilitychange`, e `ultimaCarga` só é carimbado quando a resposta chega -
  // então a segunda saía antes e tudo era pedido em duplicata.
  const emCurso = useRef(false);

  const fetchBookings = useCallback(async (silencioso = false) => {
    if (emCurso.current) return;
    emCurso.current = true;
    // Em silêncio a lista fica na tela e só troca de conteúdo quando chega a
    // resposta. Sem isso, voltar para a aba piscaria o esqueleto por cima de
    // dados que já estavam certos.
    if (!silencioso) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("skip", String((page - 1) * PAGE_SIZE));
      params.set("limit", String(PAGE_SIZE));
      if (tab !== "all") params.set("booking_status", tab);
      if (tripFilter) params.set("trip_id", tripFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (ordem) params.set("ordem", ordem);

      const res = await apiFetch(`/bookings/admin/all?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.items);
        setTotal(data.total);
        setErroCarga(false);
        ultimaCarga.current = Date.now();
      } else {
        // Sem isto a tela dizia "Nenhuma reserva encontrada" quando na verdade a
        // busca falhou, e não dava para distinguir lista vazia de erro.
        setErroCarga(true);
      }
    } catch {
      setErroCarga(true);
    } finally {
      emCurso.current = false;
      if (!silencioso) setLoading(false);
    }
  }, [page, tab, tripFilter, debouncedSearch, ordem]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  // Voltar para a aba: atualiza a lista e as contagens em silêncio, e só se a
  // última busca já passou de um minuto. Mesmo critério do painel inicial.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimaCarga.current < 60_000) return;
      fetchBookings(true);
      fetchCounts();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [fetchBookings, fetchCounts]);

  useEffect(() => {
    apiFetch(`/bookings/admin/trips-com-reserva`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTripsFiltro(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Usa cache fresco se houver (dentro do TTL e após a última mutação)
    if (_tripsCache.data && (Date.now() - _tripsCache.ts) < TRIPS_TTL && _tripsCache.ts >= adminDirtyTs()) {
      setTrips(_tripsCache.data);
      return;
    }
    apiFetch(`/trips/admin-list?futuras=true&ordem=proximidade&limit=500`)
      .then((r) => r.json())
      .then((d) => {
        const list = d?.items ?? (Array.isArray(d) ? d : []);
        setTrips(list);
        _tripsCache.data = list;
        _tripsCache.ts = Date.now();
      })
      .catch(() => {});
  }, []);

  // Fecha a venda sem ajuste de preço. Serve para o interesse e para a reserva
  // que ficou em aguardando pagamento e foi paga por fora do site.
  // Devolve se deu certo: o modal de "marcar como pago" só fecha no sucesso.
  const confirm = async (code: string, paymentMethod?: string): Promise<boolean> => {
    setActionLoading(code);
    try {
      const res = await apiFetch(`/bookings/${code}/confirm`, {
        method: "POST",
        // Sem forma de pagamento a API preserva a que já estava gravada.
        body: JSON.stringify(paymentMethod ? { payment_method: paymentMethod } : {}),
      });
      // A API recusa por motivo real (vaga que acabou, reserva já cancelada
      // pela expiração de 48h). Engolir isso deixava o admin achando que
      // confirmou.
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.detail || "Não foi possível confirmar a reserva.");
        return false;
      }
      invalidateAdminCache();
      fetchBookings();
      fetchCounts();
      return true;
    } finally {
      setActionLoading(null);
    }
  };

  const executeRefund = async () => {
    if (!refundTarget) return;
    setRefundLoading(true);
    try {
      const res = await apiFetch(`/payments/${refundTarget.booking_code}/refund`, {
        method: "POST",
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.detail || "Não foi possível estornar."); return; }
      invalidateAdminCache();
      setRefundTarget(null);
      fetchBookings();
      fetchCounts();
    } catch {
      alert("Erro de conexão ao estornar. Tente novamente.");
    } finally {
      setRefundLoading(false);
    }
  };

  const promptCancel = (booking: Booking) => {
    setCancelTarget(booking);
  };

  // O interesse fecha direto; o aguardando pagamento passa pelo aviso, porque
  // ali pode existir cobrança em aberto do lado do cliente.
  const pedirConfirmacao = (booking: Booking) => {
    if (booking.status === "pending") setPagoTarget(booking);
    else confirm(booking.booking_code);
  };

  const executeMarcarPago = async (paymentMethod: string) => {
    if (!pagoTarget) return;
    // Fecha só no sucesso: se a API recusar, o admin lê o motivo e o modal
    // continua ali com o contexto na tela.
    if (await confirm(pagoTarget.booking_code, paymentMethod)) setPagoTarget(null);
  };

  const executeCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await apiFetch(`/bookings/${cancelTarget.booking_code}/cancel`, {
        method: "POST",
      });
      invalidateAdminCache();
      setCancelTarget(null);
      fetchBookings();
      fetchCounts();
    } finally {
      setCancelLoading(false);
    }
  };

  const tripMap = Object.fromEntries(trips.map((t) => [t.id, t]));
  // A API já devolve ordenado por roteiro e depois por saída, então basta
  // agrupar preservando a ordem de chegada.
  const gruposFiltro = useMemo(() => {
    const m = new Map<string, TripFiltro[]>();
    for (const t of tripsFiltro) {
      const atual = m.get(t.roteiro);
      if (atual) atual.push(t);
      else m.set(t.roteiro, [t]);
    }
    return Array.from(m.entries());
  }, [tripsFiltro]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tabs: { key: string; label: string; count: number }[] = [
    { key: "interesse",          label: "Interesses",        count: counts.interesse },
    { key: "pending",            label: "Aguardando pgto",   count: counts.pending },
    { key: "confirmed",          label: "Confirmadas",       count: counts.confirmed },
    { key: "completed",          label: "Concluídas",        count: counts.completed },
    { key: "cancelled,refunded", label: "Encerradas",        count: counts.cancelled + counts.refunded },
    { key: "all",                label: "Todas",             count: counts.all },
  ];

  const summary = [
    { label: "Receita confirmada", value: `R$ ${fmtBRL(counts.stats.confirmed_revenue)}`, sub: `${counts.confirmed + counts.completed} venda${(counts.confirmed + counts.completed) !== 1 ? "s" : ""} paga${(counts.confirmed + counts.completed) !== 1 ? "s" : ""}`, accent: "text-emerald-600", icon: DollarSign },
    { label: "Aguardando pagamento", value: `R$ ${fmtBRL(counts.stats.pending_value)}`, sub: `${counts.pending} reserva${counts.pending !== 1 ? "s" : ""}`, accent: "text-blue-600", icon: Clock },
    { label: "Interesses a seguir", value: String(counts.interesse), sub: "contatos a fechar", accent: "text-amber-600", icon: MessageSquare },
    { label: "Vendas do mês", value: `R$ ${fmtBRL(counts.stats.month_value)}`, sub: `${counts.stats.month_count} confirmada${counts.stats.month_count !== 1 ? "s" : ""}`, accent: "text-navy-700", icon: CheckCheck },
  ];

  const RowActions = ({ b, compact }: { b: Booking; compact?: boolean }) => {
    const isLoading = actionLoading === b.booking_code;
    const canRefund = b.status === "confirmed" && ["pix", "credit_card"].includes(b.payment_method ?? "");
    const actionable = ["interesse", "confirmed", "pending"].includes(b.status);
    const name = b.traveler_name || `Usuário #${b.user_id}`;
    // Na tabela (compact) os botões são quadradinhos uniformes de 30px e NÃO quebram
    // linha; no card mobile mostram rótulo e podem quebrar.
    const sizing = compact ? "w-[30px] h-[30px] justify-center shrink-0" : "px-2.5 py-1.5";
    return (
      <div className={`flex items-center gap-1.5 ${compact ? "flex-nowrap" : "flex-wrap"}`} onClick={(e) => e.stopPropagation()}>
        {/* Fechar venda de reserva em aguardando pagamento mora SÓ no modal de
            detalhe: na lista, ao lado dos outros ícones, é fácil clicar na
            linha errada e baixar vaga de quem não pagou. */}
        {b.status === "interesse" && (
          <button onClick={() => confirm(b.booking_code)} disabled={isLoading} title="Confirmar"
            className={`flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${sizing}`}>
            <Check size={13} />{!compact && " Confirmar"}
          </button>
        )}
        {actionable && (
          <button onClick={() => setEditTarget(b)} disabled={isLoading} title="Editar"
            className={`flex items-center gap-1 border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${sizing}`}>
            <Pencil size={13} />{!compact && " Editar"}
          </button>
        )}
        {actionable && (canRefund ? (
          <button onClick={() => setRefundTarget(b)} disabled={isLoading} title="Estornar"
            className={`flex items-center gap-1 border border-amber-300 text-amber-600 hover:bg-amber-50 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${sizing}`}>
            <Undo2 size={13} />{!compact && " Estornar"}
          </button>
        ) : (
          <button onClick={() => promptCancel(b)} disabled={isLoading} title="Cancelar"
            className={`flex items-center gap-1 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${sizing}`}>
            <X size={13} />{!compact && " Cancelar"}
          </button>
        ))}
        {b.traveler_phone && (
          <a href={buildWaUrl(b)} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} title="Falar no WhatsApp"
            className={`flex items-center justify-center gap-1.5 border border-emerald-200 text-[#25D366] hover:bg-emerald-50 font-semibold text-xs rounded-lg transition-colors ${sizing}`}>
            <WhatsAppGlyph size={14} />{!compact && " WhatsApp"}
          </a>
        )}
        {!actionable && !b.traveler_phone && <span className="text-xs text-gray-300">-</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overlay de processamento: o estorno chama o Asaas e leva alguns segundos.
          Sem isto a tela parecia travada (o modal de detalhe fecha antes da resposta). */}
      {actionLoading && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            <span className="text-navy-800 font-semibold text-sm">Processando…</span>
          </div>
        </div>
      )}

      {trocaTarget && (
        <TrocarDataModal
          booking={trocaTarget}
          datas={trips}
          onClose={() => setTrocaTarget(null)}
          onDone={() => { setTrocaTarget(null); fetchBookings(); fetchCounts(); }}
        />
      )}

      {cancelTarget && (
        <CancelConfirmModal
          booking={cancelTarget}
          trip={tripMap[cancelTarget.trip_id]}
          onClose={() => setCancelTarget(null)}
          onConfirm={executeCancel}
          loading={cancelLoading}
        />
      )}

      {pagoTarget && (
        <MarcarPagoModal
          booking={pagoTarget}
          trip={tripMap[pagoTarget.trip_id]}
          onClose={() => setPagoTarget(null)}
          onConfirm={executeMarcarPago}
          loading={actionLoading === pagoTarget.booking_code}
        />
      )}

      {refundTarget && (
        <RefundConfirmModal
          booking={refundTarget}
          trip={tripMap[refundTarget.trip_id]}
          onClose={() => setRefundTarget(null)}
          onConfirm={executeRefund}
          loading={refundLoading}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          trip={tripMap[selectedBooking.trip_id]}
          onClose={() => setSelectedBooking(null)}
          onConfirm={() => { pedirConfirmacao(selectedBooking); setSelectedBooking(null); }}
          onEdit={(b) => { setSelectedBooking(null); setEditTarget(b); }}
          onCancel={(b) => { setSelectedBooking(null); promptCancel(b); }}
          onRefund={(b) => { setSelectedBooking(null); setRefundTarget(b); }}
          onTrocarData={(b) => { setSelectedBooking(null); setTrocaTarget(b); }}
          actionLoading={actionLoading}
        />
      )}

      {editTarget && (
        <EditBookingModal
          booking={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { invalidateAdminCache(); fetchBookings(); fetchCounts(); }}
        />
      )}

      {showExternal && (
        <ExternalSaleModal
          trips={trips.filter((t) => t.is_active !== false && t.available_spots > 0 && t.status !== "cancelled" && t.status !== "completed")}
          onClose={() => setShowExternal(false)}
          onSaved={() => { invalidateAdminCache(); fetchBookings(); fetchCounts(); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Interesses e vendas confirmadas</p>
        </div>
        <button onClick={() => setShowExternal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
          <Plus size={16} /> Nova Venda Externa
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
                <Icon size={15} className={s.accent} />
              </div>
              {countsCarregou ? (
                <>
                  <p className={`mt-2 text-lg sm:text-xl font-black leading-tight ${s.accent}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </>
              ) : (
                <>
                  <Skel className="mt-2 h-6 sm:h-7 w-28" />
                  <Skel className="mt-1.5 h-3 w-20" />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-col gap-3">
        {/* Mobile: grid 2x2 | Desktop: flex em linha */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {tabs.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ${
                tab === key
                  ? "bg-navy-800 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-navy-300 hover:text-navy-700"
              }`}>
              {label}
              {!countsCarregou ? (
                <span className={`min-w-[20px] h-5 rounded-full animate-pulse ${
                  tab === key ? "bg-white/20" : "bg-gray-100"
                }`} aria-hidden="true" />
              ) : count > 0 ? (
                <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold px-1 ${
                  tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{count}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por código, nome ou CPF..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)}
              className={`w-full sm:w-auto pl-8 pr-8 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none cursor-pointer ${tripFilter ? "border-navy-400 bg-navy-50 text-navy-700 font-semibold" : "border-gray-200 text-gray-500"}`}>
              <option value="">Todas as viagens</option>
              {/* Roteiro vira grupo e as datas dele entram dentro: a lista fica
                  curta, e cada opção mostra quantas reservas tem. */}
              {gruposFiltro.map(([roteiro, datas]) => (
                <optgroup key={roteiro} label={roteiro}>
                  {datas.map((d) => (
                    <option key={d.trip_id} value={d.trip_id}>
                      {d.quote_only ? "sob cotação" : d.departure_date ? fmtDataHoraViagem(d.departure_date) : "sem data"} · {plural(d.total, "reserva", "reservas")}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {/* Ordenação. A primeira opção é o padrão da aba e diz qual é, para o
              admin saber o que está vendo sem precisar abrir a lista. */}
          <div className="relative">
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar reservas"
              className={`w-full sm:w-auto pl-8 pr-8 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none cursor-pointer ${ordem ? "border-navy-400 bg-navy-50 text-navy-700 font-semibold" : "border-gray-200 text-gray-500"}`}>
              <option value="">{ORDEM_PADRAO_ROTULO[tab] ?? "Mais recentes"} (padrão)</option>
              <option value="recentes">Mais recentes</option>
              <option value="antigas">Mais antigas</option>
              <option value="pagamento">Último pagamento</option>
              <option value="saida_proxima">Saída mais próxima</option>
              <option value="saida_recente">Saída mais distante</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          // Esqueleto com a forma da lista: a tabela não some nem a página pula
          // quando os dados chegam. Uma linha por reserva da página atual.
          <div className="divide-y divide-gray-50" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skel className="h-3.5 w-24 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skel className="h-3.5 w-2/5" />
                  <Skel className="h-2.5 w-1/4" />
                </div>
                <Skel className="hidden md:block h-3.5 w-28 flex-shrink-0" />
                <Skel className="h-6 w-24 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : erroCarga ? (
          <div className="text-center py-16">
            <p className="font-bold text-navy-800">Não foi possível carregar as reservas</p>
            <p className="text-gray-400 text-sm mt-1">Isso não quer dizer que a lista está vazia.</p>
            <button onClick={() => fetchBookings()}
              className="mt-4 bg-navy-800 hover:bg-navy-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
              Tentar de novo
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Nenhuma reserva encontrada</p>
          </div>
        ) : (
          <>
            {/* Desktop: tabela densa */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-3 font-semibold">Código</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Viagem</th>
                    <th className="px-4 py-3 font-semibold text-center">Pess.</th>
                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                    <th className="px-4 py-3 font-semibold">Pagamento</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const trip = tripMap[b.trip_id];
                    const st = statusVisual(b);
                    const travelerName = b.traveler_name || `Usuário #${b.user_id}`;
                    return (
                      <tr key={b.id} onClick={() => setSelectedBooking(b)}
                        className={`border-b border-gray-50 border-l-4 ${st.border} hover:bg-gray-50 cursor-pointer transition-colors`}>
                        <td className="px-4 py-3 align-top">
                          <button onClick={(e) => { e.stopPropagation(); copyCode(b.booking_code); }}
                            className="flex items-center gap-1 font-mono text-xs text-navy-600 font-semibold hover:text-gold-600 transition-colors group">
                            {b.booking_code}
                            {copiedCode === b.booking_code ? <CheckCheck size={11} className="text-emerald-500" /> : <Copy size={11} className="text-gray-300 group-hover:text-gold-500" />}
                          </button>
                          {valorDiverge(b) && (
                            <span title="Data trocada: o valor pago não bate com o preço da data atual" className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              <AlertTriangle size={9} /> valor a acertar
                            </span>
                          )}
                          <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold">
                            {b.is_external
                              ? <span className="text-purple-600 flex items-center gap-0.5"><Store size={9} /> Externo</span>
                              : <span className="text-blue-500 flex items-center gap-0.5"><Globe size={9} /> Site</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-semibold text-navy-800 truncate max-w-[170px]">{travelerName}</p>
                          {b.traveler_phone && <p className="text-xs text-gray-400">{formatPhone(b.traveler_phone)}</p>}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-navy-700 max-w-[200px] flex items-center gap-1"><span className="truncate">{b.trip_title ?? trip?.title ?? `Viagem #${b.trip_id}`}</span><SeloSemCartao b={b} /></p>
                          {b.trip_quote_only ? <p className="text-xs text-gray-400">Sob cotação</p> : b.trip_departure_date && <p className="text-xs text-gray-400">{fmtDataHoraViagem(b.trip_departure_at ?? b.trip_departure_date)}</p>}
                        </td>
                        <td className="px-4 py-3 align-top text-center text-gray-600">{b.num_travelers}</td>
                        <td className="px-4 py-3 align-top text-right font-bold text-navy-800 whitespace-nowrap">R$ {fmtBRL(b.final_amount)}</td>
                        <td className="px-4 py-3 align-top text-xs text-gray-500 max-w-[130px]">{paymentLabel(b.payment_method, b.installments)}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <SeloStatus st={st} />
                            {b.status === "interesse" && !isPastTrip(b) && <WaitingBadge createdAt={b.created_at} />}
                            {b.status === "interesse" && isPastTrip(b) && <span title="Viagem já passou - contate para oferecer outra data" className="text-[10px] font-bold text-gold-700 bg-gold-50 border border-gold-200 px-1.5 py-0.5 rounded-full">Oportunidade</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end"><RowActions b={b} compact /></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden p-4 flex flex-col gap-3">
              {bookings.map((b) => {
                const trip = tripMap[b.trip_id];
                const st = statusVisual(b);
                const travelerName = b.traveler_name || `Usuário #${b.user_id}`;
                const showActions = ["interesse", "confirmed", "pending"].includes(b.status) || !!b.traveler_phone;
                return (
                  <div key={b.id} onClick={() => setSelectedBooking(b)}
                    className={`rounded-xl border border-gray-100 border-l-4 ${st.border} bg-gray-50 p-4 space-y-3 transition-colors duration-200 hover:bg-white hover:shadow-md cursor-pointer`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <button onClick={(e) => { e.stopPropagation(); copyCode(b.booking_code); }}
                            className="flex items-center gap-1 font-mono text-xs text-navy-500 font-semibold hover:text-gold-600 transition-colors group">
                            {b.booking_code}
                            {copiedCode === b.booking_code ? <CheckCheck size={11} className="text-emerald-500" /> : <Copy size={11} className="text-gray-300 group-hover:text-gold-500" />}
                          </button>
                          {valorDiverge(b) && (
                            <span title="Data trocada: o valor pago não bate com o preço da data atual" className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              <AlertTriangle size={9} /> valor a acertar
                            </span>
                          )}
                          {b.is_external
                            ? <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-600"><Store size={9} /> Ext.</span>
                            : <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-500"><Globe size={9} /> Site</span>}
                        </div>
                        <p className="font-bold text-navy-800 text-sm leading-snug">{b.trip_title ?? trip?.title ?? `Viagem #${b.trip_id}`} <SeloSemCartao b={b} /></p>
                        <p className="text-xs text-gray-500 truncate">{travelerName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 pt-0.5">
                          <span>{b.num_travelers} pessoa{b.num_travelers !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span className="font-bold text-navy-700">R$ {fmtBRL(b.final_amount)}</span>
                          <span>·</span>
                          <span>{paymentLabel(b.payment_method, b.installments)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <SeloStatus st={st} />
                        {b.status === "interesse" && !isPastTrip(b) && <WaitingBadge createdAt={b.created_at} />}
                        {b.status === "interesse" && isPastTrip(b) && <span title="Viagem já passou - contate para oferecer outra data" className="text-[10px] font-bold text-gold-700 bg-gold-50 border border-gold-200 px-1.5 py-0.5 rounded-full">Oportunidade</span>}
                      </div>
                    </div>
                    {showActions && <RowActions b={b} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      <p className="text-xs text-gray-400 text-right">
        {/* Durante a primeira carga o contador dizia "0 registros", que e uma
            afirmacao errada, nao um estado de espera. */}
        {loading && total === 0 ? "carregando…" : `${total} registro${total !== 1 ? "s" : ""}`}
        {" · "}página {page} de {Math.max(1, totalPages)}
      </p>
    </div>
  );
}

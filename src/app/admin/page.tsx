"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock, MapPin, ChevronRight, AlertTriangle, CheckCircle, Calendar,
  Loader2, BookOpen, CreditCard, Camera, TrendingUp, TrendingDown, Trophy, Crown, Target,
  DollarSign, XCircle, ArrowUpRight,
} from "lucide-react";
import { getToken, fetchWithTimeout } from "@/lib/api";
import { adminDirtyTs } from "@/lib/adminCache";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const RES = "/admin/reservas";

/* ─── Types ─── */
type Stats = { total_revenue: number; total_confirmed: number; total_travelers: number; month_revenue: number; month_confirmed: number; pending_interests: number };
type CountStats = { confirmed_revenue: number; pending_value: number; month_count: number; month_value: number };
type Counts = { interesse: number; pending: number; confirmed: number; completed: number; cancelled: number; refunded: number; all: number; stats: CountStats };
type RevPoint = { month: string; label: string; revenue: number; count: number };
type TmplRank = { id: number | null; title: string; destination: string; revenue: number; travelers: number; sales: number };
type CustRank = { name: string; trips: number; spend: number };
type Analytics = { total_revenue: number; total_confirmed: number; ticket_medio: number; conversao: number; top_revenue: TmplRank[]; top_sales: TmplRank[]; top_customers: CustRank[]; never_sold: { id: number; title: string }[]; by_category: { category: string; revenue: number }[] };
type Booking = { id: number; booking_code: string; trip_id: number; traveler_name: string | null; traveler_phone: string | null; user_id: number | null; num_travelers: number; final_amount: number; status: string; created_at: string; trip_title: string | null; trip_departure_date: string | null };
type TripInstance = { id: number; title: string; destination: string; departure_date: string | null; price_per_person: number; total_spots: number; available_spots: number; status: string; is_active: boolean };
type Template = { id: number; title: string; is_active: boolean; active_dates_count: number; photos_count: number };

/* ─── Helpers ─── */
const fmt = (d: string) => new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
const daysUntil = (d: string) => Math.ceil((new Date(d.slice(0, 10) + "T12:00:00").getTime() - Date.now()) / 86400000);
const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };
const todayLabel = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtRk = (n: number) => n >= 1000 ? `R$ ${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")}k` : `R$ ${Math.round(n)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
/** plural: plw(2,"venda","vendas") → "2 vendas" */
const plw = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const weekdayFull = (iso: string) => cap(new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" }));
const dayMonth = (iso: string) => { const d = new Date(iso + "T12:00:00"); return `${d.getDate()}/${d.getMonth() + 1}`; };
const MES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function buildWaUrl(b: Booking) {
  const name = (b.traveler_name || "").split(" ")[0] || "tudo bem";
  const clean = (b.traveler_phone || "").replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const trip = b.trip_title || "sua viagem";
  const when = b.trip_departure_date ? ` (saída em ${fmt(b.trip_departure_date)})` : "";
  return `https://wa.me/${number}?text=${encodeURIComponent(`Olá, ${name}! Aqui é a equipe da AJS Turismo. Estou entrando em contato sobre sua reserva da viagem *${trip}*${when}. (Código ${b.booking_code})`)}`;
}
function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (<svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>);
}

/* eyebrow de seção (rótulo + linha) */
function Eyebrow({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <div>
        <p className="text-[11px] font-black tracking-[0.15em] text-gold-600 uppercase">{kicker}</p>
        <h2 className="text-lg font-display font-black text-navy-900 leading-tight">{title}</h2>
      </div>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}
function CardHead({ title, icon, action }: { title: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <h3 className="font-bold text-navy-800 flex items-center gap-2 text-sm">{icon} {title}</h3>
      {action}
    </div>
  );
}

/* ─── Cache ─── */
type Cache = { stats: Stats | null; counts: Counts | null; analytics: Analytics | null; sMonth: RevPoint[]; sDay: RevPoint[]; interests: Booking[]; pendings: Booking[]; trips: TripInstance[]; templates: Template[]; ts: number };
const _c: Cache = { stats: null, counts: null, analytics: null, sMonth: [], sDay: [], interests: [], pendings: [], trips: [], templates: [], ts: 0 };
const TTL = 60_000;

export default function AdminDashboard() {
  const fresh = !!_c.stats && (Date.now() - _c.ts) < TTL && _c.ts >= adminDirtyTs();
  const [stats, setStats] = useState<Stats | null>(_c.stats);
  const [counts, setCounts] = useState<Counts | null>(_c.counts);
  const [an, setAn] = useState<Analytics | null>(_c.analytics);
  const [sMonth, setSMonth] = useState<RevPoint[]>(_c.sMonth);
  const [sDay, setSDay] = useState<RevPoint[]>(_c.sDay);
  const [interests, setInterests] = useState<Booking[]>(_c.interests);
  const [pendings, setPendings] = useState<Booking[]>(_c.pendings);
  const [trips, setTrips] = useState<TripInstance[]>(_c.trips);
  const [templates, setTemplates] = useState<Template[]>(_c.templates);
  const [loading, setLoading] = useState(!fresh);
  const [refreshing, setRefreshing] = useState(false);
  const [chartMode, setChartMode] = useState<"day" | "month">("day");
  const [rankTab, setRankTab] = useState<"rev" | "sales" | "cust">("rev");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [margin, setMargin] = useState(20); // margem presumida (%), só exibição
  useEffect(() => { const m = Number(localStorage.getItem("ajs_admin_margin")); if (m >= 0 && m <= 100) setMargin(m); }, []);
  const onMargin = (v: number) => { setMargin(v); try { localStorage.setItem("ajs_admin_margin", String(v)); } catch { /* ignore */ } };

  const load = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const R = await Promise.all([
        fetchWithTimeout(`${API}/bookings/admin/stats`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/counts`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/analytics`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/revenue-series?months=6`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/revenue-series?granularity=day`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/all?booking_status=interesse&limit=6`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/all?booking_status=pending&limit=6`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/trips/admin-list?limit=100`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/templates/admin-list`, { headers: authHeaders() }),
      ]);
      const [sD, cD, aD, mD, dD, iD, pD, tD, tmD] = await Promise.all(R.map(r => r.json().catch(() => null)));
      const statsV = sD && typeof sD.total_revenue === "number" ? sD : null;
      const countsV = cD && typeof cD.interesse === "number" ? cD : null;
      const anV = aD && Array.isArray(aD.top_revenue) ? aD : null;
      const monthV = Array.isArray(mD) ? mD : [];
      const dayV = Array.isArray(dD) ? dD : [];
      const intV = Array.isArray(iD?.items) ? iD.items : [];
      const penV = Array.isArray(pD?.items) ? pD.items : [];
      const tripsV = Array.isArray(tD?.items) ? tD.items : [];
      const tmplV = Array.isArray(tmD) ? tmD : [];
      setStats(statsV); setCounts(countsV); setAn(anV); setSMonth(monthV); setSDay(dayV);
      setInterests(intV); setPendings(penV); setTrips(tripsV); setTemplates(tmplV);
      Object.assign(_c, { stats: statsV, counts: countsV, analytics: anV, sMonth: monthV, sDay: dayV, interests: intV, pendings: penV, trips: tripsV, templates: tmplV, ts: Date.now() });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(fresh); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* derived */
  const cs = counts?.stats;
  const curRev = stats?.month_revenue ?? 0;
  const prevRev = sMonth.length >= 2 ? sMonth[sMonth.length - 2].revenue : 0;
  const hasPrev = prevRev > 0;
  const delta = hasPrev ? (curRev - prevRev) / prevRev : 0;

  const upcoming = trips.filter(t => {
    if (!t.departure_date || !t.is_active || !["active", "sold_out"].includes(t.status)) return false;
    // Open-date (vagas ilimitadas, todo dia) só entra na agenda se tiver ≥1 viajante pago.
    if (t.total_spots >= 999 && (t.total_spots - t.available_spots) <= 0) return false;
    return true;
  }).sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime()).slice(0, 6);
  const oldInterests = interests.filter(b => daysSince(b.created_at) >= 3);
  const stalePendings = pendings.filter(b => daysSince(b.created_at) >= 1);
  const soldOut = trips.filter(t => t.status === "sold_out" && t.is_active).length;
  const noDates = templates.filter(t => t.active_dates_count === 0 && t.is_active).length;
  const noPhotos = templates.filter(t => t.is_active && t.photos_count < 5).length;

  const series = chartMode === "day" ? sDay.slice(0, new Date().getDate()) : sMonth;
  const maxRev = Math.max(1, ...series.map(s => s.revenue));

  const monthCount = stats?.month_confirmed ?? 0;
  const profit = curRev * (margin / 100); // lucro presumido (estimativa, só exibição)

  const catTotal = (an?.by_category ?? []).reduce((s, c) => s + c.revenue, 0);

  /* feed de ações priorizado */
  type Action = { sev: number; icon: React.ReactNode; text: string; href: string };
  const actions: Action[] = [];
  if (oldInterests.length) actions.push({ sev: 3, icon: <Clock size={14} className="text-amber-500" />, text: `${oldInterests.length === 1 ? "1 interesse parado" : `${oldInterests.length} interesses parados`} há 3+ dias`, href: `${RES}?status=interesse` });
  if (stalePendings.length) actions.push({ sev: 3, icon: <CreditCard size={14} className="text-blue-500" />, text: stalePendings.length === 1 ? "1 pagamento não concluído" : `${stalePendings.length} pagamentos não concluídos`, href: `${RES}?status=pending` });
  if (soldOut) actions.push({ sev: 2, icon: <TrendingUp size={14} className="text-red-500" />, text: soldOut === 1 ? "1 viagem esgotada" : `${soldOut} viagens esgotadas`, href: "/admin/viagens" });
  if ((an?.never_sold.length ?? 0) > 0) actions.push({ sev: 1, icon: <XCircle size={14} className="text-gray-400" />, text: an!.never_sold.length === 1 ? "1 roteiro que nunca vendeu" : `${an!.never_sold.length} roteiros que nunca venderam`, href: "/admin/viagens" });
  if (noDates) actions.push({ sev: 1, icon: <Calendar size={14} className="text-gray-400" />, text: noDates === 1 ? "1 roteiro sem datas ativas" : `${noDates} roteiros sem datas ativas`, href: "/admin/viagens" });
  if (noPhotos) actions.push({ sev: 1, icon: <Camera size={14} className="text-gray-400" />, text: noPhotos === 1 ? "1 roteiro sem as 5 fotos" : `${noPhotos} roteiros sem as 5 fotos`, href: "/admin/viagens" });
  actions.sort((a, b) => b.sev - a.sev);

  const rankItems = rankTab === "rev"
    ? (an?.top_revenue ?? []).map(t => ({ id: t.id, title: t.title, primary: fmtR(t.revenue), secondary: plw(t.sales, "venda", "vendas"), val: t.revenue }))
    : rankTab === "sales"
      ? (an?.top_sales ?? []).map(t => ({ id: t.id, title: t.title, primary: plw(t.travelers, "viajante", "viajantes"), secondary: fmtR(t.revenue), val: t.travelers }))
      : (an?.top_customers ?? []).map(c => ({ id: null as number | null, title: c.name, primary: fmtR(c.spend), secondary: plw(c.trips, "viagem", "viagens"), val: c.spend }));
  const rankMax = Math.max(1, ...rankItems.map(i => i.val));

  return (
    <div className="space-y-2 pb-10">

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">{greet()}, Admin!{refreshing && <Loader2 size={14} className="text-gray-400 animate-spin" />}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{cap(todayLabel())}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={RES} className="relative flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-navy-700 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <BookOpen size={15} /> Reservas
            {(counts?.interesse ?? 0) > 0 && <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">{counts!.interesse}</span>}
          </Link>
          <Link href="/admin/viagens" className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"><MapPin size={15} /> Roteiros</Link>
        </div>
      </div>

      {/* ════ ATO 1 - PULSO ════ */}
      <Eyebrow kicker="Visão geral" title="Como o mês está indo" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero */}
        <div className="lg:col-span-2 bg-gradient-to-br from-navy-800 to-navy-600 rounded-2xl p-6 text-white shadow-card flex flex-col justify-between gap-6">
          <div className="flex-1">
            <p className="text-navy-200 text-xs font-semibold uppercase tracking-wide">Receita este mês</p>
            <p className="text-4xl font-display font-black mt-1 tabular-nums">{loading ? "-" : fmtR(curRev)}</p>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="text-navy-100">{plw(monthCount, "venda", "vendas")}</span>
              {!loading && hasPrev && (
                <span className={`inline-flex items-center gap-1 font-bold ${delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(Math.round(delta * 100))}% vs mês anterior
                </span>
              )}
              {!loading && !hasPrev && monthCount > 0 && <span className="text-navy-300 text-xs">primeiro mês com vendas registradas</span>}
            </div>
          </div>

          {/* lucro presumido (estimativa interativa) */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-navy-300 text-[10px] uppercase tracking-wide font-semibold">Lucro presumido <span className="text-navy-400 normal-case">(estimativa)</span></p>
            <p className="text-2xl sm:text-3xl font-display font-black tabular-nums mt-0.5 text-gold-300 leading-none">{loading ? "-" : fmtR(profit)}</p>
            <input
              type="range" min={0} max={100} step={1} value={margin}
              onChange={e => onMargin(Number(e.target.value))}
              aria-label="Percentual aplicado sobre a receita"
              className="mt-3 w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/15 accent-gold-400"
              style={{ background: `linear-gradient(to right, rgb(212 175 90) ${margin}%, rgba(255,255,255,0.15) ${margin}%)` }}
            />
            <p className="text-navy-300 text-[10px] mt-2">Sobre R$ {fmtR(curRev).replace("R$ ", "")} de receita do mês · arraste para ajustar <span className="text-navy-400 tabular-nums">({margin}%)</span></p>
          </div>
        </div>
        {/* KPIs de apoio */}
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
          <MiniKpi icon={<CreditCard size={15} />} label="Aguardando pgto" value={loading ? "-" : fmtR(cs?.pending_value ?? 0)} sub={`${counts?.pending ?? 0} a pagar`} href={`${RES}?status=pending`} />
          <MiniKpi icon={<DollarSign size={15} />} label="Ticket médio" value={loading ? "-" : fmtR(an?.ticket_medio ?? 0)} sub="por venda" />
          <MiniKpi icon={<Target size={15} />} label="Conversão" value={loading ? "-" : pct(an?.conversao ?? 0)} sub="interesse → venda" />
        </div>
      </div>

      {/* ════ ATO 2 - DESEMPENHO ════ */}
      <Eyebrow kicker="Desempenho" title="De onde vem o dinheiro" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHead title="Receita confirmada" icon={<TrendingUp size={14} className="text-emerald-500" />}
            action={<div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">{(["month", "day"] as const).map(m => <button key={m} onClick={() => setChartMode(m)} className={`px-2.5 py-1 rounded-md transition-colors ${chartMode === m ? "bg-white text-navy-800 shadow-sm" : "text-gray-400 hover:text-navy-600"}`}>{m === "month" ? "6 meses" : "Mês atual"}</button>)}</div>} />
          {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div> : (
            <div className="px-5 py-5">
              <div className="relative pt-12" onMouseLeave={() => setHoverIdx(null)}>
                {/* tooltip que SEGUE a barra ativa */}
                {hoverIdx !== null && series[hoverIdx] && (() => {
                  const n = series.length;
                  const leftPct = ((hoverIdx + 0.5) / n) * 100;
                  const tx = hoverIdx <= 1 ? "0%" : hoverIdx >= n - 2 ? "-100%" : "-50%";
                  const p = series[hoverIdx];
                  return (
                    <div className="absolute top-0 z-20 pointer-events-none transition-[left] duration-100" style={{ left: `${leftPct}%`, transform: `translateX(${tx})` }}>
                      <div className="bg-navy-800 text-white rounded-xl shadow-xl px-3.5 py-2 whitespace-nowrap">
                        <p className="text-[11px] font-bold leading-tight">
                          {chartMode === "day" ? `${weekdayFull(p.month)}, ${dayMonth(p.month)}` : MES_FULL[parseInt(p.month.split("-")[1]) - 1]}
                        </p>
                        <p className="text-[12px] font-black text-gold-300 leading-tight mt-0.5">{fmtR(p.revenue)}</p>
                        <p className="text-[10px] text-navy-200 leading-tight">{plw(p.count, "venda", "vendas")}</p>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-end justify-between gap-[3px] sm:gap-1.5 h-48">
                  {series.map((p, i) => {
                    const h = Math.round((p.revenue / maxRev) * 100);
                    const last = i === series.length - 1;
                    const active = hoverIdx === i;
                    return <div key={p.month} className="flex-1 flex flex-col h-full min-w-0 cursor-default" onMouseEnter={() => setHoverIdx(i)}>
                      <div className="h-4 relative">
                        {p.revenue > 0 && (
                          <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tabular-nums ${last ? "text-gold-600" : "text-navy-500"}`}>{fmtRk(p.revenue)}</span>
                        )}
                      </div>
                      <div className="flex-1 flex items-end justify-center px-px">
                        <div className={`w-full ${chartMode === "month" ? "max-w-[40px]" : ""} rounded-t-md transition-colors ${last ? (active ? "bg-gold-500" : "bg-gold-400") : active ? "bg-navy-500" : "bg-navy-200"}`} style={{ height: `${Math.max(h, p.revenue > 0 ? 4 : 1)}%` }} />
                      </div>
                      <span className={`mt-1 ${chartMode === "day" ? "text-[8px]" : "text-[10px]"} font-semibold capitalize truncate w-full text-center ${last ? "text-gold-600" : "text-gray-400"}`}>{p.label}</span>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Receita por categoria */}
        <Card className="overflow-hidden">
          <CardHead title="Receita por categoria" icon={<TrendingUp size={14} className="text-navy-400" />} />
          {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-gray-300" /></div> : (an?.by_category.length ?? 0) === 0 ? <div className="py-14 text-center text-gray-400 text-xs">Sem dados ainda</div> : (
            <div className="px-5 py-4 space-y-3">
              {an!.by_category.slice(0, 6).map((c) => {
                const maxCat = Math.max(1, ...an!.by_category.map(x => x.revenue));
                return <div key={c.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-navy-700 capitalize">{cap(c.category)}</span>
                    <span className="text-gray-500 tabular-nums">{fmtR(c.revenue)} · {catTotal > 0 ? pct(c.revenue / catTotal) : "0%"}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-navy-400 to-navy-600" style={{ width: `${Math.max(4, Math.round((c.revenue / maxCat) * 100))}%` }} /></div>
                </div>;
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Rankings */}
      <Card className="overflow-hidden mt-4">
        <CardHead title="Rankings" icon={<Trophy size={14} className="text-gold-500" />}
          action={<div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
            {([["rev", "Faturamento"], ["sales", "Vendas"], ["cust", "Clientes"]] as const).map(([k, lbl]) =>
              <button key={k} onClick={() => setRankTab(k)} className={`px-2.5 py-1 rounded-md transition-colors ${rankTab === k ? "bg-white text-navy-800 shadow-sm" : "text-gray-400 hover:text-navy-600"}`}>{lbl}</button>)}
          </div>} />
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div> : rankItems.length === 0 ? <div className="py-12 text-center text-gray-400 text-xs">Sem dados de vendas ainda</div> : (
          <div className="px-5 py-4 space-y-3">
            {rankItems.map((it, i) => {
              const body = (
                <div className={`flex items-center gap-3 ${i === 0 ? "bg-gold-50/60 -mx-2 px-2 py-1.5 rounded-lg" : ""}`}>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${i === 0 ? "bg-gold-400 text-navy-900" : "bg-gray-100 text-gray-400"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-navy-800 truncate flex items-center gap-1 min-w-0">
                        {rankTab === "cust" && i === 0 && <Crown size={13} className="text-gold-500 flex-shrink-0" />}
                        <span className="truncate">{it.title}</span>
                      </span>
                      <span className="text-sm font-black text-navy-700 whitespace-nowrap tabular-nums">{it.primary}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${i === 0 ? "bg-gold-400" : "bg-navy-300"}`} style={{ width: `${Math.max(4, Math.round((it.val / rankMax) * 100))}%` }} /></div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{it.secondary}</span>
                    </div>
                  </div>
                </div>
              );
              return it.id ? <Link key={i} href={`/admin/viagens/${it.id}`} className="block hover:opacity-90 transition-opacity">{body}</Link> : <div key={i}>{body}</div>;
            })}
          </div>
        )}
      </Card>

      {/* ════ ATO 3 - AÇÕES ════ */}
      <Eyebrow kicker="Ações" title="O que pede atenção agora" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Prioridades */}
        <Card className="overflow-hidden">
          <CardHead title="Prioridades" icon={<AlertTriangle size={14} className="text-amber-500" />} />
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div> : actions.length === 0 ? (
            <div className="py-12 text-center space-y-2"><CheckCircle size={30} className="text-emerald-300 mx-auto" /><p className="text-gray-400 text-sm font-medium">Tudo em dia!</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {actions.map((a, i) => (
                <Link key={i} href={a.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <span className="flex-shrink-0">{a.icon}</span>
                  <span className="flex-1 text-sm text-navy-700">{a.text}</span>
                  <ArrowUpRight size={14} className="text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Card>
        <FollowupList title="Interesses a responder" icon={<Clock size={14} className="text-amber-400" />} items={interests} loading={loading} emptyMsg="Sem interesses pendentes" tone="amber" status="interesse" />
        <FollowupList title="Pagamentos pendentes" icon={<CreditCard size={14} className="text-blue-400" />} items={pendings} loading={loading} emptyMsg="Nenhum pagamento em aberto" tone="blue" status="pending" />
      </div>

      {/* ════ ATO 4 - AGENDA ════ */}
      <Eyebrow kicker="Agenda" title="O que vem por aí" />
      <Card className="overflow-hidden">
        <CardHead title="Próximas saídas" icon={<Calendar size={14} className="text-navy-400" />}
          action={<Link href="/admin/viagens" className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1">Ver todos <ChevronRight size={11} /></Link>} />
        {loading ? <div className="flex items-center justify-center py-14"><Loader2 size={22} className="animate-spin text-gray-300" /></div> : upcoming.length === 0 ? <div className="py-14 text-center text-gray-400 text-sm">Nenhuma saída próxima</div> : (
          <div className="divide-y divide-gray-50 sm:grid sm:grid-cols-2 sm:grid-rows-3 sm:grid-flow-col sm:divide-y-0 sm:gap-x-6">
            {upcoming.map(t => {
              const unlimited = t.total_spots >= 999;  // sentinela de vagas ilimitadas (bate-e-volta)
              const sold = t.total_spots - t.available_spots;
              const fill = t.total_spots > 0 ? Math.round((sold / t.total_spots) * 100) : 0;
              const days = t.departure_date ? daysUntil(t.departure_date) : null;
              const dep = t.departure_date ? new Date(t.departure_date.slice(0, 10) + "T12:00:00") : null;
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors sm:border-b sm:border-gray-50">
                  <div className="flex-shrink-0 w-11 text-center">{dep ? <><p className="text-xl font-black text-navy-800 leading-none">{dep.getDate()}</p><p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{dep.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</p></> : <span className="text-gray-300 text-xs">-</span>}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="font-semibold text-navy-800 text-sm truncate">{t.title}</p>{t.status === "sold_out" && <span className="flex-shrink-0 text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Esgotado</span>}</div>
                    {unlimited ? (
                      <p className="text-[11px] text-gray-400 font-medium mt-1.5">{plw(sold, "vendido", "vendidos")} · vagas livres</p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${fill >= 90 ? "bg-red-400" : fill >= 60 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${fill}%` }} /></div>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{sold}/{t.total_spots}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">{days !== null && <p className={`text-xs font-bold ${days <= 7 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-gray-400"}`}>{days === 0 ? "Hoje!" : days === 1 ? "Amanhã" : `${days}d`}</p>}<p className="text-xs text-navy-600 font-semibold mt-0.5">{fmtR(t.price_per_person)}</p></div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── Mini KPI ─── */
function MiniKpi({ icon, label, value, sub, href }: { icon: React.ReactNode; label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1.5"><span className="text-navy-400">{icon}</span><span className="text-[11px] font-semibold uppercase tracking-wide truncate">{label}</span></div>
      <p className="text-lg font-black text-navy-900 leading-none tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

/* ─── Follow-up list ─── */
function FollowupList({ title, icon, items, loading, emptyMsg, tone, status }: { title: string; icon: React.ReactNode; items: Booking[]; loading: boolean; emptyMsg: string; tone: "amber" | "blue"; status: string }) {
  const toneBg = tone === "amber" ? "bg-amber-50/40 hover:bg-amber-50" : "bg-blue-50/40 hover:bg-blue-50";
  return (
    <Card className="overflow-hidden">
      <CardHead title={title} icon={icon}
        action={items.length > 0 ? <Link href={`${RES}?status=${status}`} className={`text-xs font-black px-2 py-0.5 rounded-full ${tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{items.length}</Link> : undefined} />
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div> : items.length === 0 ? (
        <div className="py-10 text-center space-y-1.5"><CheckCircle size={26} className="text-emerald-300 mx-auto" /><p className="text-gray-400 text-xs font-medium">{emptyMsg}</p></div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map(b => {
            const days = daysSince(b.created_at);
            const name = b.traveler_name || `Usuário #${b.user_id}`;
            return (
              <div key={b.id} className={`flex items-center gap-2 px-4 py-3 transition-colors ${days >= 3 ? toneBg : "hover:bg-gray-50"}`}>
                <Link href={`${RES}?status=${status}`} className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-800 text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{b.trip_title ?? `Viagem #${b.trip_id}`}</p>
                </Link>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-black text-navy-700">{fmtR(b.final_amount)}</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${days >= 5 ? "text-red-500" : days >= 3 ? "text-amber-500" : "text-gray-400"}`}>{days === 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`}</p>
                </div>
                {b.traveler_phone && <a href={buildWaUrl(b)} target="_blank" rel="noopener noreferrer" title="Falar no WhatsApp" className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-emerald-200 text-[#25D366] hover:bg-emerald-50 transition-colors"><WhatsAppGlyph size={14} /></a>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

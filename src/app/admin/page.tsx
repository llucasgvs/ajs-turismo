"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users, DollarSign, Clock, MapPin, ChevronRight, AlertTriangle, CheckCircle,
  Calendar, ArrowRight, Loader2, BookOpen, CreditCard, Camera, TrendingUp,
  Trophy, Crown, Target, Lightbulb, XCircle,
} from "lucide-react";
import { getToken, fetchWithTimeout } from "@/lib/api";
import { adminDirtyTs } from "@/lib/adminCache";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Types ─── */
type Stats = { total_revenue: number; total_confirmed: number; total_travelers: number; month_revenue: number; month_confirmed: number; pending_interests: number };
type CountStats = { confirmed_revenue: number; pending_value: number; month_count: number; month_value: number };
type Counts = { interesse: number; pending: number; confirmed: number; completed: number; cancelled: number; refunded: number; all: number; stats: CountStats };
type RevPoint = { month: string; label: string; revenue: number; count: number };
type TmplRank = { id: number | null; title: string; destination: string; revenue: number; travelers: number; sales: number };
type CustRank = { name: string; trips: number; spend: number };
type Analytics = {
  total_revenue: number; total_confirmed: number; ticket_medio: number; conversao: number;
  top_revenue: TmplRank[]; top_sales: TmplRank[]; top_customers: CustRank[];
  never_sold: { id: number; title: string }[]; by_category: { category: string; revenue: number }[];
};
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
const fmtRk = (n: number) => n >= 1000 ? `R$ ${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `R$ ${Math.round(n)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const RES = "/admin/reservas";

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

function KpiCard({ icon, label, value, sub, color, bg, href }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string; bg: string; href?: string }) {
  const inner = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}><div className={color}>{icon}</div></div>
      <p className="text-2xl font-black text-navy-900 leading-none tabular-nums">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
function Section({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-navy-800 flex items-center gap-2 text-sm">{icon} {title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Cache ─── */
type Cache = { stats: Stats | null; counts: Counts | null; analytics: Analytics | null; sMonth: RevPoint[]; sDay: RevPoint[]; interests: Booking[]; pendings: Booking[]; trips: TripInstance[]; templates: Template[]; ts: number };
const _c: Cache = { stats: null, counts: null, analytics: null, sMonth: [], sDay: [], interests: [], pendings: [], trips: [], templates: [], ts: 0 };
const TTL = 60_000;

export default function AdminDashboard() {
  const fresh = !!_c.analytics && (Date.now() - _c.ts) < TTL && _c.ts >= adminDirtyTs();
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
  const [chartMode, setChartMode] = useState<"day" | "month">("month");

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
      // Valida o formato antes de usar — se um endpoint falhar/atrasar, não quebra a tela.
      const statsV = sD && typeof sD.total_revenue === "number" ? sD : null;
      const countsV = cD && typeof cD.interesse === "number" ? cD : null;
      const anV = aD && Array.isArray(aD.top_revenue) ? aD : null;
      const monthV = Array.isArray(mD) ? mD : [];
      const dayV = Array.isArray(dD) ? dD : [];
      const intV = Array.isArray(iD?.items) ? iD.items : [];
      const penV = Array.isArray(pD?.items) ? pD.items : [];
      const tripsV = Array.isArray(tD?.items) ? tD.items : [];
      const tmplV = Array.isArray(tmD) ? tmD : [];
      setStats(statsV); setCounts(countsV); setAn(anV);
      setSMonth(monthV); setSDay(dayV);
      setInterests(intV); setPendings(penV);
      setTrips(tripsV); setTemplates(tmplV);
      Object.assign(_c, { stats: statsV, counts: countsV, analytics: anV, sMonth: monthV, sDay: dayV, interests: intV, pendings: penV, trips: tripsV, templates: tmplV, ts: Date.now() });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(fresh); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* derived */
  const upcoming = trips.filter(t => t.departure_date && t.is_active && ["active", "sold_out"].includes(t.status))
    .sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime()).slice(0, 6);
  const oldInterests = interests.filter(b => daysSince(b.created_at) >= 3);
  const stalePendings = pendings.filter(b => daysSince(b.created_at) >= 1);
  const soldOut = trips.filter(t => t.status === "sold_out" && t.is_active).length;
  const noDates = templates.filter(t => t.active_dates_count === 0 && t.is_active).length;
  const noPhotos = templates.filter(t => t.is_active && t.photos_count < 5).length;

  const cs = counts?.stats;
  const series = chartMode === "day" ? sDay : sMonth;
  const maxRev = Math.max(1, ...series.map(s => s.revenue));

  /* insights */
  const insights: string[] = [];
  if (an) {
    const cats = an.by_category ?? [];
    const totalCat = cats.reduce((s, c) => s + c.revenue, 0);
    const topRev = (an.top_revenue ?? [])[0];
    const topCust = (an.top_customers ?? [])[0];
    if (topRev && topRev.revenue > 0) insights.push(`💰 "${topRev.title}" é a que mais fatura (${fmtR(topRev.revenue)}).`);
    if (cats[0] && totalCat > 0) insights.push(`📊 Categoria "${cats[0].category}" = ${pct(cats[0].revenue / totalCat)} da receita.`);
    if (topCust && topCust.trips > 1) insights.push(`👑 ${topCust.name} já fez ${topCust.trips} viagens (${fmtR(topCust.spend)}).`);
    if ((an.never_sold ?? []).length > 0) insights.push(`⚠ ${an.never_sold.length} roteiro${an.never_sold.length > 1 ? "s" : ""} nunca venderam.`);
    insights.push(`🎯 Conversão interesse → venda: ${pct(an.conversao ?? 0)}.`);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">{greet()}, Admin!{refreshing && <Loader2 size={14} className="text-gray-400 animate-spin" />}</h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{todayLabel()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={RES} className="relative flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-navy-700 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <BookOpen size={15} /> Reservas
            {(counts?.interesse ?? 0) > 0 && <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">{counts!.interesse}</span>}
          </Link>
          <Link href="/admin/viagens" className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"><MapPin size={15} /> Roteiros</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign size={18} />} label="Receita este mês" value={loading ? "—" : fmtR(stats?.month_revenue ?? 0)} sub={`${stats?.month_confirmed ?? 0} venda${(stats?.month_confirmed ?? 0) !== 1 ? "s" : ""} confirmada${(stats?.month_confirmed ?? 0) !== 1 ? "s" : ""}`} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard icon={<TrendingUp size={18} />} label="Receita total" value={loading ? "—" : fmtR(stats?.total_revenue ?? 0)} sub={`ticket médio ${fmtR(an?.ticket_medio ?? 0)}`} color="text-navy-600" bg="bg-navy-50" />
        <KpiCard icon={<CreditCard size={18} />} label="Aguardando pagamento" value={loading ? "—" : fmtR(cs?.pending_value ?? 0)} sub={`${counts?.pending ?? 0} reserva${(counts?.pending ?? 0) !== 1 ? "s" : ""} a pagar`} color="text-blue-600" bg="bg-blue-50" href={`${RES}?status=pending`} />
        <KpiCard icon={<Target size={18} />} label="Conversão" value={loading ? "—" : pct(an?.conversao ?? 0)} sub="interesse → venda" color="text-amber-500" bg="bg-amber-50" />
      </div>

      {/* Insights */}
      {!loading && insights.length > 0 && (
        <div className="bg-gradient-to-r from-navy-50 to-gold-50/40 border border-navy-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-navy-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><Lightbulb size={12} /> Insights</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {insights.map((t, i) => <span key={i} className="text-sm text-navy-700">{t}</span>)}
          </div>
        </div>
      )}

      {/* Chart + Funil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="Receita confirmada" icon={<TrendingUp size={14} className="text-emerald-500" />}
            action={
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
                {(["month", "day"] as const).map(m => (
                  <button key={m} onClick={() => setChartMode(m)} className={`px-2.5 py-1 rounded-md transition-colors ${chartMode === m ? "bg-white text-navy-800 shadow-sm" : "text-gray-400 hover:text-navy-600"}`}>
                    {m === "month" ? "6 meses" : "Mês atual"}
                  </button>
                ))}
              </div>
            }>
            {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div> : (
              <div className="px-5 py-5">
                <div className="flex items-end justify-between gap-[3px] sm:gap-1.5 h-44">
                  {series.map((p, i) => {
                    const h = Math.round((p.revenue / maxRev) * 100);
                    const last = i === series.length - 1;
                    const showLabel = chartMode === "month" || i === 0 || last || (i + 1) % 5 === 0;
                    return (
                      <div key={p.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group min-w-0">
                        <div className="w-full flex items-end justify-center h-full">
                          <div className={`w-full ${chartMode === "month" ? "max-w-[44px]" : ""} rounded-t transition-colors ${last ? "bg-gold-400" : "bg-navy-200 group-hover:bg-navy-400"}`}
                            style={{ height: `${Math.max(h, p.revenue > 0 ? 4 : 1)}%` }} title={`${chartMode === "day" ? "Dia " : ""}${p.label}: ${fmtR(p.revenue)} · ${p.count} venda(s)`} />
                        </div>
                        <span className={`text-[10px] font-semibold capitalize truncate w-full text-center ${last ? "text-gold-600" : "text-gray-400"} ${showLabel ? "" : "opacity-0"}`}>{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>
        </div>

        <Section title="Funil de vendas" icon={<TrendingUp size={14} className="text-navy-400" />}>
          <div className="px-5 py-5 space-y-4">
            {[
              { label: "Interesses", n: counts?.interesse ?? 0, value: null as number | null, color: "bg-amber-400", text: "text-amber-600", href: `${RES}?status=interesse` },
              { label: "Aguardando pgto", n: counts?.pending ?? 0, value: cs?.pending_value ?? 0, color: "bg-blue-400", text: "text-blue-600", href: `${RES}?status=pending` },
              { label: "Confirmadas", n: counts?.confirmed ?? 0, value: cs?.confirmed_revenue ?? 0, color: "bg-emerald-400", text: "text-emerald-600", href: `${RES}?status=confirmed` },
            ].map(f => {
              const max = Math.max(1, counts?.interesse ?? 0, counts?.pending ?? 0, counts?.confirmed ?? 0);
              return (
                <Link key={f.label} href={f.href} className="block group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600 group-hover:text-navy-700">{f.label}</span>
                    <span className={`text-sm font-black tabular-nums ${f.text}`}>{loading ? "—" : f.n}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${f.color}`} style={{ width: `${loading ? 0 : Math.max(4, Math.round((f.n / max) * 100))}%` }} /></div>
                  {f.value !== null && <p className="text-[11px] text-gray-400 mt-1">{fmtR(f.value)}</p>}
                </Link>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RankCard title="Mais faturam" icon={<DollarSign size={14} className="text-emerald-500" />} loading={loading}
          items={(an?.top_revenue ?? []).map(t => ({ id: t.id, title: t.title, primary: fmtR(t.revenue), secondary: `${t.sales} venda(s)`, val: t.revenue }))} />
        <RankCard title="Mais vendidas" icon={<Trophy size={14} className="text-gold-500" />} loading={loading}
          items={(an?.top_sales ?? []).map(t => ({ id: t.id, title: t.title, primary: `${t.travelers} pax`, secondary: fmtR(t.revenue), val: t.travelers }))} />
        <RankCard title="Top clientes" icon={<Crown size={14} className="text-navy-500" />} loading={loading}
          items={(an?.top_customers ?? []).map(c => ({ id: null, title: c.name, primary: fmtR(c.spend), secondary: `${c.trips} viagem(ns)`, val: c.spend }))} />
      </div>

      {/* Problemas & oportunidades */}
      <Section title="Problemas & oportunidades" icon={<AlertTriangle size={14} className="text-amber-500" />}>
        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {oldInterests.length > 0 && <Link href={`${RES}?status=interesse`} className="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-lg"><Clock size={11} /> {oldInterests.length} interesse(s) parado(s) 3+ dias <ArrowRight size={10} /></Link>}
            {stalePendings.length > 0 && <Link href={`${RES}?status=pending`} className="inline-flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg"><CreditCard size={11} /> {stalePendings.length} pagamento(s) não concluído(s) <ArrowRight size={10} /></Link>}
            {soldOut > 0 && <Link href="/admin/viagens" className="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg"><TrendingUp size={11} /> {soldOut} esgotada(s) <ArrowRight size={10} /></Link>}
            {noDates > 0 && <Link href="/admin/viagens" className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg"><Calendar size={11} /> {noDates} sem datas <ArrowRight size={10} /></Link>}
            {noPhotos > 0 && <Link href="/admin/viagens" className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg"><Camera size={11} /> {noPhotos} sem 5 fotos <ArrowRight size={10} /></Link>}
            {!loading && oldInterests.length === 0 && stalePendings.length === 0 && soldOut === 0 && noDates === 0 && noPhotos === 0 && (an?.never_sold.length ?? 0) === 0 && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-semibold"><CheckCircle size={13} /> Tudo em ordem!</span>
            )}
          </div>
          {(an?.never_sold.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><XCircle size={11} /> Roteiros que nunca venderam</p>
              <div className="flex flex-wrap gap-2">
                {an!.never_sold.map(t => (
                  <Link key={t.id} href={`/admin/viagens/${t.id}`} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 hover:border-navy-300 text-navy-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors">
                    {t.title} <ChevronRight size={11} className="text-gray-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Operacional: próximas saídas + follow-up */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Section title="Próximas saídas" icon={<Calendar size={14} className="text-navy-400" />}
            action={<Link href="/admin/viagens" className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1">Ver todos <ChevronRight size={11} /></Link>}>
            {loading ? <div className="flex items-center justify-center py-14"><Loader2 size={22} className="animate-spin text-gray-300" /></div> : upcoming.length === 0 ? <div className="py-14 text-center text-gray-400 text-sm">Nenhuma saída próxima</div> : (
              <div className="divide-y divide-gray-50">
                {upcoming.map(t => {
                  const sold = t.total_spots - t.available_spots;
                  const fill = t.total_spots > 0 ? Math.round((sold / t.total_spots) * 100) : 0;
                  const days = t.departure_date ? daysUntil(t.departure_date) : null;
                  const dep = t.departure_date ? new Date(t.departure_date.slice(0, 10) + "T12:00:00") : null;
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-11 text-center">{dep ? <><p className="text-xl font-black text-navy-800 leading-none">{dep.getDate()}</p><p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{dep.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</p></> : <span className="text-gray-300 text-xs">—</span>}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="font-semibold text-navy-800 text-sm truncate">{t.title}</p>{t.status === "sold_out" && <span className="flex-shrink-0 text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Esgotado</span>}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${fill >= 90 ? "bg-red-400" : fill >= 60 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${fill}%` }} /></div>
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{sold}/{t.total_spots}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">{days !== null && <p className={`text-xs font-bold ${days <= 7 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-gray-400"}`}>{days === 0 ? "Hoje!" : days === 1 ? "Amanhã" : `${days}d`}</p>}<p className="text-xs text-navy-600 font-semibold mt-0.5">{fmtR(t.price_per_person)}</p></div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <FollowupList title="Interesses a responder" icon={<Clock size={14} className="text-amber-400" />} items={interests} loading={loading} emptyMsg="Sem interesses pendentes" tone="amber" status="interesse" />
          <FollowupList title="Pagamentos pendentes" icon={<CreditCard size={14} className="text-blue-400" />} items={pendings} loading={loading} emptyMsg="Nenhum pagamento em aberto" tone="blue" status="pending" />
        </div>
      </div>
    </div>
  );
}

/* ─── Ranking card ─── */
function RankCard({ title, icon, items, loading }: { title: string; icon: React.ReactNode; items: { id: number | null; title: string; primary: string; secondary: string; val: number }[]; loading: boolean }) {
  const max = Math.max(1, ...items.map(i => i.val));
  return (
    <Section title={title} icon={icon}>
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div> : items.length === 0 ? <div className="py-10 text-center text-gray-400 text-xs">Sem dados ainda</div> : (
        <div className="px-5 py-4 space-y-3">
          {items.map((it, i) => {
            const body = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-800 truncate flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-black text-gray-300 w-3 flex-shrink-0">{i + 1}</span>
                    <span className="truncate">{it.title}</span>
                  </span>
                  <span className="text-sm font-black text-navy-700 whitespace-nowrap tabular-nums">{it.primary}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 pl-[18px]">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-navy-300" style={{ width: `${Math.max(4, Math.round((it.val / max) * 100))}%` }} /></div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{it.secondary}</span>
                </div>
              </>
            );
            return it.id ? <Link key={i} href={`/admin/viagens/${it.id}`} className="block hover:opacity-80 transition-opacity">{body}</Link> : <div key={i}>{body}</div>;
          })}
        </div>
      )}
    </Section>
  );
}

/* ─── Follow-up list ─── */
function FollowupList({ title, icon, items, loading, emptyMsg, tone, status }: { title: string; icon: React.ReactNode; items: Booking[]; loading: boolean; emptyMsg: string; tone: "amber" | "blue"; status: string }) {
  const toneBg = tone === "amber" ? "bg-amber-50/40 hover:bg-amber-50" : "bg-blue-50/40 hover:bg-blue-50";
  return (
    <Section title={title} icon={icon}
      action={items.length > 0 ? <Link href={`${RES}?status=${status}`} className={`text-xs font-black px-2 py-0.5 rounded-full ${tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{items.length}</Link> : undefined}>
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
    </Section>
  );
}

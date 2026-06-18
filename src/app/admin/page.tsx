"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users, DollarSign, Clock, MapPin, ChevronRight,
  AlertTriangle, CheckCircle, Calendar, ArrowRight,
  Loader2, BookOpen, CreditCard, Camera, TrendingUp,
} from "lucide-react";
import { getToken, fetchWithTimeout } from "@/lib/api";
import { adminDirtyTs } from "@/lib/adminCache";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Types ─── */
type Stats = {
  total_revenue: number; total_confirmed: number; total_travelers: number;
  month_revenue: number; month_confirmed: number; pending_interests: number;
};
type CountStats = { confirmed_revenue: number; pending_value: number; month_count: number; month_value: number };
type Counts = {
  interesse: number; pending: number; confirmed: number; completed: number;
  cancelled: number; refunded: number; all: number; stats: CountStats;
};
type RevPoint = { month: string; label: string; revenue: number; count: number };
type Booking = {
  id: number; booking_code: string; trip_id: number; traveler_name: string | null;
  traveler_phone: string | null; user_id: number | null; num_travelers: number;
  final_amount: number; status: string; created_at: string;
  trip_title: string | null; trip_departure_date: string | null;
};
type TripInstance = {
  id: number; title: string; destination: string; departure_date: string | null;
  price_per_person: number; total_spots: number; available_spots: number; status: string; is_active: boolean;
};
type Template = {
  id: number; title: string; is_active: boolean;
  active_dates_count: number; sold_spots: number; photos_count: number;
};

/* ─── Helpers ─── */
const fmt = (d: string) => new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
const daysUntil = (d: string) => Math.ceil((new Date(d.slice(0, 10) + "T12:00:00").getTime() - Date.now()) / 86400000);
const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };
const todayLabel = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtRk = (n: number) => n >= 1000 ? `R$ ${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `R$ ${Math.round(n)}`;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function buildWaUrl(b: Booking) {
  const name = (b.traveler_name || "").split(" ")[0] || "tudo bem";
  const clean = (b.traveler_phone || "").replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const trip = b.trip_title || "sua viagem";
  const when = b.trip_departure_date ? ` (saída em ${fmt(b.trip_departure_date)})` : "";
  const msg = `Olá, ${name}! Aqui é a equipe da AJS Turismo. Estou entrando em contato sobre sua reserva da viagem *${trip}*${when}. (Código ${b.booking_code})`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

function WhatsAppGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon, label, value, sub, color, bg, href }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string; bg: string; href?: string;
}) {
  const inner = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
        <div className={color}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-navy-900 leading-none tabular-nums">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

/* ─── Card section wrapper ─── */
function Section({ title, icon, action, children }: {
  title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-navy-800 flex items-center gap-2 text-sm">{icon} {title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Cache ─── */
type DashCache = {
  stats: Stats | null; counts: Counts | null; series: RevPoint[];
  interests: Booking[]; pendings: Booking[]; trips: TripInstance[]; templates: Template[]; ts: number;
};
const _dashCache: DashCache = { stats: null, counts: null, series: [], interests: [], pendings: [], trips: [], templates: [], ts: 0 };
const DASH_TTL = 60_000;

/* ─── Main ─── */
export default function AdminDashboard() {
  const fresh = !!_dashCache.stats && (Date.now() - _dashCache.ts) < DASH_TTL && _dashCache.ts >= adminDirtyTs();
  const [stats, setStats] = useState<Stats | null>(_dashCache.stats);
  const [counts, setCounts] = useState<Counts | null>(_dashCache.counts);
  const [series, setSeries] = useState<RevPoint[]>(_dashCache.series);
  const [interests, setInterests] = useState<Booking[]>(_dashCache.interests);
  const [pendings, setPendings] = useState<Booking[]>(_dashCache.pendings);
  const [trips, setTrips] = useState<TripInstance[]>(_dashCache.trips);
  const [templates, setTemplates] = useState<Template[]>(_dashCache.templates);
  const [loading, setLoading] = useState(!fresh);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [sR, cR, rR, iR, pR, tR, tmR] = await Promise.all([
        fetchWithTimeout(`${API}/bookings/admin/stats`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/counts`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/revenue-series?months=6`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/all?booking_status=interesse&limit=6`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/bookings/admin/all?booking_status=pending&limit=6`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/trips/admin-list?limit=100`, { headers: authHeaders() }),
        fetchWithTimeout(`${API}/templates/admin-list`, { headers: authHeaders() }),
      ]);
      const [sD, cD, rD, iD, pD, tD, tmD] = await Promise.all([sR.json(), cR.json(), rR.json(), iR.json(), pR.json(), tR.json(), tmR.json()]);
      setStats(sD); setCounts(cD); setSeries(Array.isArray(rD) ? rD : []);
      setInterests(iD.items ?? []); setPendings(pD.items ?? []);
      setTrips(tD.items ?? []); setTemplates(Array.isArray(tmD) ? tmD : []);
      Object.assign(_dashCache, {
        stats: sD, counts: cD, series: Array.isArray(rD) ? rD : [],
        interests: iD.items ?? [], pendings: pD.items ?? [],
        trips: tD.items ?? [], templates: Array.isArray(tmD) ? tmD : [], ts: Date.now(),
      });
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(fresh); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* Derived */
  const upcoming = trips
    .filter(t => t.departure_date && t.is_active && ["active", "sold_out"].includes(t.status))
    .sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime())
    .slice(0, 6);

  const oldInterests = interests.filter(b => daysSince(b.created_at) >= 3);
  const stalePendings = pendings.filter(b => daysSince(b.created_at) >= 1);
  const soldOutCount = trips.filter(t => t.status === "sold_out" && t.is_active).length;
  const noDatesCount = templates.filter(t => t.active_dates_count === 0 && t.is_active).length;
  const incompletePhotos = templates.filter(t => t.is_active && t.photos_count < 5).length;
  const hasAlerts = oldInterests.length > 0 || stalePendings.length > 0 || soldOutCount > 0 || noDatesCount > 0 || incompletePhotos > 0;

  const cs = counts?.stats;
  const maxRev = Math.max(1, ...series.map(s => s.revenue));

  /* Funil */
  const funnel = [
    { label: "Interesses", n: counts?.interesse ?? 0, value: null as number | null, color: "bg-amber-400", text: "text-amber-600" },
    { label: "Aguardando pgto", n: counts?.pending ?? 0, value: cs?.pending_value ?? 0, color: "bg-blue-400", text: "text-blue-600" },
    { label: "Confirmadas", n: counts?.confirmed ?? 0, value: cs?.confirmed_revenue ?? 0, color: "bg-emerald-400", text: "text-emerald-600" },
  ];
  const funnelMax = Math.max(1, ...funnel.map(f => f.n));

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">
            {greet()}, Admin!
            {refreshing && <Loader2 size={14} className="text-gray-400 animate-spin" />}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{todayLabel()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/reservas"
            className="relative flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-navy-700 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <BookOpen size={15} /> Reservas
            {(counts?.interesse ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {counts!.interesse}
              </span>
            )}
          </Link>
          <Link href="/admin/viagens"
            className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <MapPin size={15} /> Roteiros
          </Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign size={18} />} label="Receita este mês"
          value={loading ? "—" : fmtR(stats?.month_revenue ?? 0)}
          sub={`${stats?.month_confirmed ?? 0} venda${(stats?.month_confirmed ?? 0) !== 1 ? "s" : ""} · ${fmtR(stats?.total_revenue ?? 0)} total`}
          color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard icon={<Clock size={18} />} label="Aguardando pagamento"
          value={loading ? "—" : fmtR(cs?.pending_value ?? 0)}
          sub={`${counts?.pending ?? 0} reserva${(counts?.pending ?? 0) !== 1 ? "s" : ""} a pagar`}
          color="text-blue-600" bg="bg-blue-50" href="/admin/reservas" />
        <KpiCard icon={<BookOpen size={18} />} label="Interesses a seguir"
          value={loading ? "—" : String(counts?.interesse ?? 0)}
          sub="Contatos a fechar" color="text-amber-500" bg="bg-amber-50" href="/admin/reservas" />
        <KpiCard icon={<Users size={18} />} label="Viajantes confirmados"
          value={loading ? "—" : String(stats?.total_travelers ?? 0)}
          sub={`${counts?.confirmed ?? 0} reservas confirmadas`} color="text-navy-600" bg="bg-navy-50" />
      </div>

      {/* ── Alertas ── */}
      {!loading && hasAlerts && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <AlertTriangle size={12} /> Atenção necessária
          </p>
          <div className="flex flex-wrap gap-2">
            {oldInterests.length > 0 && (
              <Link href="/admin/reservas" className="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <Clock size={11} /> {oldInterests.length} interesse{oldInterests.length > 1 ? "s" : ""} sem resposta há 3+ dias <ArrowRight size={10} />
              </Link>
            )}
            {stalePendings.length > 0 && (
              <Link href="/admin/reservas" className="inline-flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <CreditCard size={11} /> {stalePendings.length} pagamento{stalePendings.length > 1 ? "s" : ""} parado{stalePendings.length > 1 ? "s" : ""} (não pago) <ArrowRight size={10} />
              </Link>
            )}
            {soldOutCount > 0 && (
              <Link href="/admin/viagens" className="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <TrendingUp size={11} /> {soldOutCount} viagem{soldOutCount > 1 ? "ns" : ""} esgotada{soldOutCount > 1 ? "s" : ""} <ArrowRight size={10} />
              </Link>
            )}
            {noDatesCount > 0 && (
              <Link href="/admin/viagens" className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <Calendar size={11} /> {noDatesCount} roteiro{noDatesCount > 1 ? "s" : ""} sem datas ativas <ArrowRight size={10} />
              </Link>
            )}
            {incompletePhotos > 0 && (
              <Link href="/admin/viagens" className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <Camera size={11} /> {incompletePhotos} roteiro{incompletePhotos > 1 ? "s" : ""} sem as 5 fotos <ArrowRight size={10} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Receita 6 meses + Funil ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="Receita confirmada — últimos 6 meses" icon={<TrendingUp size={14} className="text-emerald-500" />}>
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
            ) : (
              <div className="px-5 py-5">
                <div className="flex items-end justify-between gap-2 sm:gap-4 h-44">
                  {series.map((p, i) => {
                    const h = Math.round((p.revenue / maxRev) * 100);
                    const isLast = i === series.length - 1;
                    return (
                      <div key={p.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group">
                        <span className="text-[10px] font-bold text-navy-700 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.revenue > 0 ? fmtRk(p.revenue) : ""}
                        </span>
                        <div className="w-full flex items-end justify-center h-full">
                          <div className={`w-full max-w-[44px] rounded-t-lg transition-colors ${isLast ? "bg-gold-400" : "bg-navy-200 group-hover:bg-navy-400"}`}
                            style={{ height: `${Math.max(h, p.revenue > 0 ? 4 : 1)}%` }} title={`${fmtR(p.revenue)} · ${p.count} venda(s)`} />
                        </div>
                        <span className={`text-[11px] font-semibold capitalize ${isLast ? "text-gold-600" : "text-gray-400"}`}>{p.label}</span>
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
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600">{f.label}</span>
                  <span className={`text-sm font-black tabular-nums ${f.text}`}>{loading ? "—" : f.n}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${f.color}`} style={{ width: `${loading ? 0 : Math.max(4, Math.round((f.n / funnelMax) * 100))}%` }} />
                </div>
                {f.value !== null && <p className="text-[11px] text-gray-400 mt-1">{fmtR(f.value)}</p>}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Próximas saídas + A fazer ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Próximas saídas */}
        <div className="lg:col-span-3">
          <Section title="Próximas saídas" icon={<Calendar size={14} className="text-navy-400" />}
            action={<Link href="/admin/viagens" className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1">Ver todos <ChevronRight size={11} /></Link>}>
            {loading ? (
              <div className="flex items-center justify-center py-14"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
            ) : upcoming.length === 0 ? (
              <div className="py-14 text-center text-gray-400 text-sm">Nenhuma saída próxima</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcoming.map((t) => {
                  const sold = t.total_spots - t.available_spots;
                  const fill = t.total_spots > 0 ? Math.round((sold / t.total_spots) * 100) : 0;
                  const days = t.departure_date ? daysUntil(t.departure_date) : null;
                  const dep = t.departure_date ? new Date(t.departure_date.slice(0, 10) + "T12:00:00") : null;
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-11 text-center">
                        {dep ? (<>
                          <p className="text-xl font-black text-navy-800 leading-none">{dep.getDate()}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{dep.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</p>
                        </>) : <span className="text-gray-300 text-xs">—</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-navy-800 text-sm truncate">{t.title}</p>
                          {t.status === "sold_out" && <span className="flex-shrink-0 text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Esgotado</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${fill >= 90 ? "bg-red-400" : fill >= 60 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${fill}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{sold}/{t.total_spots}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {days !== null && (
                          <p className={`text-xs font-bold ${days <= 7 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-gray-400"}`}>
                            {days === 0 ? "Hoje!" : days === 1 ? "Amanhã" : `${days}d`}
                          </p>
                        )}
                        <p className="text-xs text-navy-600 font-semibold mt-0.5">{fmtR(t.price_per_person)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* A fazer (follow-up) */}
        <div className="lg:col-span-2 space-y-6">
          <FollowupList title="Interesses a responder" icon={<Clock size={14} className="text-amber-400" />}
            items={interests} loading={loading} emptyMsg="Sem interesses pendentes" tone="amber" />
          <FollowupList title="Pagamentos pendentes" icon={<CreditCard size={14} className="text-blue-400" />}
            items={pendings} loading={loading} emptyMsg="Nenhum pagamento em aberto" tone="blue" />
        </div>
      </div>
    </div>
  );
}

/* ─── Follow-up list (interesses / pagamentos) ─── */
function FollowupList({ title, icon, items, loading, emptyMsg, tone }: {
  title: string; icon: React.ReactNode; items: Booking[]; loading: boolean; emptyMsg: string; tone: "amber" | "blue";
}) {
  const toneBg = tone === "amber" ? "bg-amber-50/40 hover:bg-amber-50" : "bg-blue-50/40 hover:bg-blue-50";
  return (
    <Section title={title} icon={icon}
      action={items.length > 0 ? <span className={`text-xs font-black px-2 py-0.5 rounded-full ${tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{items.length}</span> : undefined}>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center space-y-1.5">
          <CheckCircle size={26} className="text-emerald-300 mx-auto" />
          <p className="text-gray-400 text-xs font-medium">{emptyMsg}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((b) => {
            const days = daysSince(b.created_at);
            const name = b.traveler_name || `Usuário #${b.user_id}`;
            return (
              <div key={b.id} className={`flex items-center gap-2 px-4 py-3 transition-colors ${days >= 3 ? toneBg : "hover:bg-gray-50"}`}>
                <Link href="/admin/reservas" className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-800 text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{b.trip_title ?? `Viagem #${b.trip_id}`}</p>
                </Link>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-black text-navy-700">{fmtR(b.final_amount)}</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${days >= 5 ? "text-red-500" : days >= 3 ? "text-amber-500" : "text-gray-400"}`}>
                    {days === 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`}
                  </p>
                </div>
                {b.traveler_phone && (
                  <a href={buildWaUrl(b)} target="_blank" rel="noopener noreferrer" title="Falar no WhatsApp"
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-emerald-200 text-[#25D366] hover:bg-emerald-50 transition-colors">
                    <WhatsAppGlyph size={14} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

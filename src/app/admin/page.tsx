"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users, DollarSign, Clock, MapPin, ChevronRight,
  AlertTriangle, CheckCircle, Calendar, Star, ArrowRight,
  Loader2, BookOpen, Activity,
} from "lucide-react";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Types ─── */
type Stats = {
  total_revenue: number;
  total_confirmed: number;
  total_travelers: number;
  month_revenue: number;
  month_confirmed: number;
  pending_interests: number;
};

type Counts = { interesse: number; confirmed: number; cancelled: number; all: number };

type Booking = {
  id: number;
  booking_code: string;
  trip_id: number;
  traveler_name: string | null;
  user_id: number | null;
  num_travelers: number;
  final_amount: number;
  status: string;
  created_at: string;
  trip_title: string | null;
  trip_departure_date: string | null;
};

type TripInstance = {
  id: number;
  title: string;
  destination: string;
  departure_date: string | null;
  price_per_person: number;
  total_spots: number;
  available_spots: number;
  status: string;
  is_active: boolean;
};

type Template = {
  id: number;
  title: string;
  destination: string;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  active_dates_count: number;
  sold_spots: number;
};

/* ─── Helpers ─── */
function fmt(d: string) {
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d.slice(0, 10) + "T12:00:00").getTime() - Date.now()) / 86400000);
}
function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}
function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
function fmtR(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

/* ─── KPI Card ─── */
function KpiCard({ icon, label, value, sub, color, bg, href }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: string; bg: string; href?: string;
}) {
  const inner = (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full`}>
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

/* ─── Main ─── */
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [interests, setInterests] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<TripInstance[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sR, cR, iR, tR, tmR] = await Promise.all([
        fetch(`${API}/bookings/admin/stats`, { headers: authHeaders() }),
        fetch(`${API}/bookings/admin/counts`, { headers: authHeaders() }),
        fetch(`${API}/bookings/admin/all?booking_status=interesse&limit=6&skip=0`, { headers: authHeaders() }),
        fetch(`${API}/trips/admin-list?limit=100`, { headers: authHeaders() }),
        fetch(`${API}/templates/admin-list`, { headers: authHeaders() }),
      ]);
      const [sD, cD, iD, tD, tmD] = await Promise.all([sR.json(), cR.json(), iR.json(), tR.json(), tmR.json()]);
      setStats(sD);
      setCounts(cD);
      setInterests(iD.items ?? []);
      setTrips(tD.items ?? []);
      setTemplates(Array.isArray(tmD) ? tmD : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Derived */
  const upcoming = trips
    .filter(t => t.departure_date && t.is_active && ["active", "sold_out"].includes(t.status))
    .sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime())
    .slice(0, 7);

  const now = new Date();
  const activeDatesThisMonth = trips.filter(t => {
    if (!t.departure_date || !t.is_active) return false;
    const d = new Date(t.departure_date.slice(0, 10) + "T12:00:00");
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const oldInterests = interests.filter(b => daysSince(b.created_at) >= 3);
  const soldOutCount = trips.filter(t => t.status === "sold_out" && t.is_active).length;
  const noDatesCount = templates.filter(t => t.active_dates_count === 0 && t.is_active).length;
  const hasAlerts = oldInterests.length > 0 || soldOutCount > 0 || noDatesCount > 0;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">
            {greet()}, Admin!
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{todayLabel()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/reservas"
            className="relative flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-navy-700 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <BookOpen size={15} />
            Reservas
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
        <KpiCard
          icon={<Clock size={18} />}
          label="Interesses pendentes"
          value={loading ? "—" : String(counts?.interesse ?? 0)}
          sub="Aguardando confirmação"
          color="text-amber-500"
          bg="bg-amber-50"
          href="/admin/reservas"
        />
        <KpiCard
          icon={<CheckCircle size={18} />}
          label={`${activeDatesThisMonth === 1 ? "Viagem ativa" : "Viagens ativas"} este mês`}
          value={loading ? "—" : String(activeDatesThisMonth)}
          sub={(() => { const n = trips.filter(t => t.is_active && ["active", "sold_out"].includes(t.status)).length; return `${n} ${n === 1 ? "viagem" : "viagens"} ativas no total`; })()}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <KpiCard
          icon={<DollarSign size={18} />}
          label="Receita este mês"
          value={loading ? "—" : fmtR(stats?.month_revenue ?? 0)}
          sub={`${fmtR(stats?.total_revenue ?? 0)} total`}
          color="text-navy-600"
          bg="bg-navy-50"
        />
        <KpiCard
          icon={<Users size={18} />}
          label="Viajantes confirmados"
          value={loading ? "—" : String(stats?.total_travelers ?? 0)}
          sub="Em reservas confirmadas"
          color="text-blue-600"
          bg="bg-blue-50"
        />
      </div>

      {/* ── Alerts ── */}
      {!loading && hasAlerts && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <AlertTriangle size={12} /> Atenção necessária
          </p>
          <div className="flex flex-wrap gap-2">
            {oldInterests.length > 0 && (
              <Link href="/admin/reservas"
                className="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <Clock size={11} />
                {oldInterests.length} interesse{oldInterests.length > 1 ? "s" : ""} sem resposta há 3+ dias
                <ArrowRight size={10} />
              </Link>
            )}
            {soldOutCount > 0 && (
              <Link href="/admin/viagens"
                className="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <Activity size={11} />
                {soldOutCount} viagem{soldOutCount > 1 ? "ns" : ""} esgotada{soldOutCount > 1 ? "s" : ""}
                <ArrowRight size={10} />
              </Link>
            )}
            {noDatesCount > 0 && (
              <Link href="/admin/viagens"
                className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                <MapPin size={11} />
                {noDatesCount} roteiro{noDatesCount > 1 ? "s" : ""} sem datas ativas
                <ArrowRight size={10} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Próximas Saídas */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-navy-800 flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-navy-400" /> Próximas Saídas
            </h2>
            <Link href="/admin/viagens" className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1">
              Ver todos <ChevronRight size={11} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 size={22} className="animate-spin text-gray-300" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-14 text-center text-gray-400 text-sm">Nenhuma saída próxima</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcoming.map((t) => {
                const sold = t.total_spots - t.available_spots;
                const fill = t.total_spots > 0 ? Math.round((sold / t.total_spots) * 100) : 0;
                const days = t.departure_date ? daysUntil(t.departure_date) : null;
                const isSoldOut = t.status === "sold_out";
                const depDate = t.departure_date ? new Date(t.departure_date.slice(0, 10) + "T12:00:00") : null;

                return (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    {/* Date badge */}
                    <div className="flex-shrink-0 w-11 text-center">
                      {depDate ? (
                        <>
                          <p className="text-xl font-black text-navy-800 leading-none">{depDate.getDate()}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                            {depDate.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                          </p>
                        </>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </div>

                    {/* Info + fill bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-navy-800 text-sm truncate">{t.title}</p>
                        {isSoldOut && (
                          <span className="flex-shrink-0 text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Esgotado</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{t.destination}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${fill >= 90 ? "bg-red-400" : fill >= 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${fill}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{sold}/{t.total_spots}</span>
                      </div>
                    </div>

                    {/* Countdown + price */}
                    <div className="flex-shrink-0 text-right">
                      {days !== null && (
                        <p className={`text-xs font-bold ${days <= 7 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-gray-400"}`}>
                          {days === 0 ? "Hoje!" : days === 1 ? "Amanhã" : `${days}d`}
                        </p>
                      )}
                      <p className="text-xs text-navy-600 font-semibold mt-0.5">
                        {fmtR(t.price_per_person)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interesses Recentes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-navy-800 flex items-center gap-2 text-sm">
              <Clock size={14} className="text-amber-400" />
              Aguardando
              {(counts?.interesse ?? 0) > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">
                  {counts!.interesse}
                </span>
              )}
            </h2>
            <Link href="/admin/reservas" className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1">
              Ver todos <ChevronRight size={11} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 size={22} className="animate-spin text-gray-300" />
            </div>
          ) : interests.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <CheckCircle size={32} className="text-emerald-300 mx-auto" />
              <p className="text-gray-400 text-sm font-medium">Sem pendências!</p>
              <p className="text-gray-300 text-xs">Todos os interesses foram atendidos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {interests.map((b) => {
                const days = daysSince(b.created_at);
                const isOld = days >= 3;
                const traveler = b.traveler_name || `Usuário #${b.user_id}`;
                return (
                  <Link key={b.id} href="/admin/reservas"
                    className={`flex items-start justify-between gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer ${isOld ? "bg-amber-50/40 hover:bg-amber-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy-800 text-sm truncate">{traveler}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {b.trip_title ?? `Viagem #${b.trip_id}`}
                      </p>
                      {b.trip_departure_date && (
                        <p className="text-xs text-gray-400">{fmt(b.trip_departure_date)}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-black text-navy-700">{fmtR(b.final_amount)}</p>
                      <p className={`text-[10px] font-bold mt-0.5 ${days >= 5 ? "text-red-500" : days >= 3 ? "text-amber-500" : "text-gray-400"}`}>
                        {days === 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

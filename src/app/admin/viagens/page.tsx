"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, EyeOff, Star, Search, X, AlertTriangle, Loader2, MapPin, Users, Calendar, Tag, RefreshCw, Moon, DollarSign, CheckCircle2, XCircle, Info, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Trip {
  id: number;
  title: string;
  destination: string;
  description: string;
  short_description: string | null;
  status: string;
  is_featured: boolean;
  is_active: boolean;
  price_per_person: number;
  original_price: number | null;
  max_installments: number;
  available_spots: number;
  total_spots: number;
  min_group_size: number;
  departure_date: string;
  return_date: string;
  duration_nights: number;
  category: string;
  tag: string | null;
  image_url: string | null;
  includes: string[];
  excludes: string[];
  created_at: string;
  updated_at: string | null;
  hidden_at: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string; border: string }> = {
  active:    { label: "Ativo",     cls: "bg-green-100 text-green-700",   border: "border-l-green-400" },
  sold_out:  { label: "Esgotado",  cls: "bg-red-100 text-red-700",       border: "border-l-red-400" },
  cancelled: { label: "Cancelado", cls: "bg-gray-100 text-gray-600",     border: "border-l-gray-300" },
  completed: { label: "Concluído", cls: "bg-blue-100 text-blue-700",     border: "border-l-blue-400" },
};

function fmt(d: string) {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
}

/* ─── Deactivate Confirm Modal ─── */
function DeactivateModal({ trip, onClose, onConfirm, loading }: {
  trip: Trip;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={26} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Ocultar viagem?</h3>
              <p className="text-gray-400 text-sm mt-1">A viagem será ocultada do site.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1">
            <p className="font-bold text-navy-800">{trip.title}</p>
            <p className="text-sm text-gray-500">{trip.destination}</p>
            <p className="text-xs text-gray-400">
              {trip.total_spots - trip.available_spots}/{trip.total_spots} vendidas · R$ {trip.price_per_person.toLocaleString("pt-BR")} · {fmt(trip.departure_date)}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <EyeOff size={15} />}
              Ocultar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Trip Detail Modal ─── */
function TripDetailModal({ trip, onClose, onDeactivate, onReactivate, reactivating }: {
  trip: Trip;
  onClose: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  reactivating: boolean;
}) {
  const s = STATUS_LABEL[trip.status] ?? { label: trip.status, cls: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
  const used = trip.total_spots - trip.available_spots;
  const pct = trip.total_spots > 0 ? Math.round((used / trip.total_spots) * 100) : 0;
  const barColor = trip.available_spots === 0 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-emerald-400";
  const discount = trip.original_price && trip.original_price > trip.price_per_person
    ? Math.round((1 - trip.price_per_person / trip.original_price) * 100)
    : null;

  const statusBadge = trip.status === "completed"
    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Concluído</span>
    : !trip.is_active
    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Oculto</span>
    : <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Hero image or drag handle */}
        {trip.image_url ? (
          <div className="relative shrink-0 hidden sm:block">
            <img src={trip.image_url} alt={trip.title}
              className="w-full h-44 object-cover rounded-t-3xl sm:rounded-t-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-3xl sm:rounded-t-2xl" />
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors">
              <X size={16} />
            </button>
            {/* Drag handle over image on mobile */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:hidden">
              <div className="w-10 h-1 bg-white/50 rounded-full" />
            </div>
          </div>
        ) : null}

        {/* Drag handle — mobile only, always shown */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className={`flex items-start justify-between gap-3 px-5 pb-3 border-b border-gray-100 ${trip.image_url ? "pt-3" : "pt-4"}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {trip.is_featured && <Star size={13} className="text-gold-500 shrink-0" fill="currentColor" />}
              <h2 className="font-bold text-navy-800 text-base leading-snug line-clamp-2">{trip.title}</h2>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin size={10} className="shrink-0" /> {trip.destination}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {statusBadge}
            {/* X no header: sempre no mobile, só quando sem imagem no desktop */}
            <button onClick={onClose}
              className={`text-gray-400 hover:text-gray-600 transition-colors ${trip.image_url ? "sm:hidden" : ""}`}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Dates + Duration */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Partida</p>
              <p className="font-bold text-navy-800 text-sm">{fmt(trip.departure_date)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Retorno</p>
              <p className="font-bold text-navy-800 text-sm">{fmt(trip.return_date)}</p>
            </div>
            <div className="bg-navy-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-navy-400 mb-0.5 uppercase tracking-wide flex items-center justify-center gap-0.5"><Moon size={9} />Noites</p>
              <p className="font-bold text-navy-800 text-sm">{trip.duration_nights}</p>
            </div>
          </div>

          {/* Price */}
          <div className="bg-gray-50 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-0.5"><DollarSign size={9} /> Preço por pessoa</p>
              <div className="flex items-baseline gap-2">
                <span className="font-black text-navy-800 text-lg">R$ {trip.price_per_person.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                {trip.original_price && (
                  <span className="line-through text-gray-400 text-xs">R$ {trip.original_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                )}
              </div>
              {discount && <span className="text-xs text-emerald-600 font-semibold">{discount}% de desconto</span>}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Parcelas</p>
              <p className="font-bold text-navy-800 text-sm">até {trip.max_installments}×</p>
            </div>
          </div>

          {/* Vagas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1 font-medium"><Users size={11} /> Vagas</span>
              <span className={`font-semibold ${trip.available_spots === 0 ? "text-red-500" : pct >= 75 ? "text-amber-600" : "text-emerald-600"}`}>
                {trip.available_spots === 0 ? "Esgotado" : `${trip.available_spots} disponíve${trip.available_spots === 1 ? "l" : "is"}`}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-gray-400">{used} ocupadas de {trip.total_spots} vagas totais · mín. {trip.min_group_size} pessoa(s)</p>
          </div>

          {/* Category + Tag */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              <Tag size={10} /> {trip.category}
            </span>
            {trip.tag && (
              <span className="flex items-center gap-1 text-xs bg-gold-100 text-gold-700 px-2.5 py-1 rounded-full font-semibold">
                {trip.tag}
              </span>
            )}
            {trip.is_featured && (
              <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-semibold">
                <Star size={10} fill="currentColor" /> Destaque
              </span>
            )}
          </div>

          {/* Description */}
          {(trip.short_description || trip.description) && (
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Info size={9} /> Descrição</p>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                {trip.short_description || trip.description}
              </p>
            </div>
          )}

          {/* Includes */}
          {trip.includes && trip.includes.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"><CheckCircle2 size={9} className="text-emerald-500" /> Inclui</p>
              <ul className="space-y-1">
                {trip.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Excludes */}
          {trip.excludes && trip.excludes.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"><XCircle size={9} className="text-red-400" /> Não inclui</p>
              <ul className="space-y-1">
                {trip.excludes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                    <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Histórico</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Cadastrada em <span className="font-semibold text-gray-700">{fmt(trip.created_at)}</span></span>
              </div>
              {trip.updated_at && trip.updated_at !== trip.created_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span>Última edição em <span className="font-semibold text-gray-700">{fmt(trip.updated_at)}</span></span>
                </div>
              )}
              {trip.hidden_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                  <span>Ocultada em <span className="font-semibold text-gray-700">{fmt(trip.hidden_at)}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <Link href={`/admin/reservas?trip_id=${trip.id}`}
            className="w-full flex items-center justify-center gap-1.5 border border-navy-200 bg-navy-50 hover:bg-navy-100 text-navy-700 font-bold py-2.5 rounded-xl text-sm transition-colors">
            <BookOpen size={14} /> Ver reservas desta viagem
          </Link>
          <div className="flex gap-2">
          <Link href={`/admin/viagens/${trip.id}/editar`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            <Pencil size={14} /> Editar
          </Link>
          {trip.status !== "completed" && (
            trip.is_active ? (
              <button onClick={onDeactivate}
                className="flex-1 flex items-center justify-center gap-1.5 border border-zinc-200 text-zinc-500 hover:bg-zinc-50 font-bold py-3 rounded-xl text-sm transition-colors">
                <EyeOff size={14} /> Ocultar
              </button>
            ) : (
              <button onClick={onReactivate} disabled={reactivating}
                className="flex-1 flex items-center justify-center gap-1.5 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
                {reactivating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Reativar
              </button>
            )
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Vagas progress bar ─── */
function VagasBar({ available, total }: { available: number; total: number }) {
  const used = total - available;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const color = available === 0 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 flex items-center gap-1"><Users size={10} /> {used}/{total} vendidas</span>
        <span className={`font-semibold ${available === 0 ? "text-red-500" : pct >= 75 ? "text-amber-600" : "text-emerald-600"}`}>
          {available === 0 ? "Esgotado" : `${available} disponíve${available === 1 ? "l" : "is"}`}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

/* ─── Pagination ─── */
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const items: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) items.push(i);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm">‹</button>
      {items.map((item, i) =>
        item === "…" ? (
          <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
        ) : (
          <button key={item} onClick={() => onChange(item as number)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
              page === item ? "bg-navy-800 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>{item}</button>
        )
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === pages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm">›</button>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminViagens() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, sold_out: 0, hidden: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "sold_out" | "hidden" | "completed">("all");
  const [page, setPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState<Trip | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [tab, debouncedSearch]);

  const fetchCounts = useCallback(async () => {
    try {
      const r = await apiFetch("/trips/admin-counts");
      if (r.ok) setCounts(await r.json());
    } catch { /* ignore */ }
  }, []);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("skip", String((page - 1) * PAGE_SIZE));
      params.set("limit", String(PAGE_SIZE));
      if (tab !== "all") params.set("trip_status", tab);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const r = await apiFetch(`/trips/admin-list?${params}`);
      if (r.ok) {
        const data = await r.json();
        setTrips(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, tab, debouncedSearch]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const reload = () => { fetchTrips(); fetchCounts(); };

  const reactivateTrip = async (trip: Trip) => {
    setReactivatingId(trip.id);
    try {
      await apiFetch(`/trips/${trip.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: true, status: "active" }),
      });
      setDetailTrip(null);
      reload();
    } catch { /* ignore */ }
    setReactivatingId(null);
  };

  const executeDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivateLoading(true);
    try {
      await apiFetch(`/trips/${deactivateTarget.id}`, { method: "DELETE" });
    } catch { /* 204 no content - ok */ }
    setDeactivateLoading(false);
    setDeactivateTarget(null);
    setDetailTrip(null);
    reload();
  };

  const paginated = trips;

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "all",       label: "Todas",      count: counts.all },
    { key: "active",    label: "Ativas",     count: counts.active },
    { key: "sold_out",  label: "Esgotadas",  count: counts.sold_out },
    { key: "hidden",    label: "Ocultas",    count: counts.hidden },
    { key: "completed", label: "Concluídas", count: counts.completed },
  ];

  return (
    <div className="space-y-5">
      {deactivateTarget && (
        <DeactivateModal
          trip={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={executeDeactivate}
          loading={deactivateLoading}
        />
      )}

      {detailTrip && !deactivateTarget && (
        <TripDetailModal
          trip={detailTrip}
          onClose={() => setDetailTrip(null)}
          onDeactivate={() => { setDeactivateTarget(detailTrip); }}
          onReactivate={() => reactivateTrip(detailTrip)}
          reactivating={reactivatingId === detailTrip.id}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-800">Viagens</h1>
          <p className="text-gray-500 text-sm mt-0.5">{trips.length} pacotes cadastrados</p>
        </div>
        <Link href="/admin/viagens/nova"
          className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
          <Plus size={16} /> Nova Viagem
        </Link>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col gap-2">
        {/* Mobile: grid 2x2 (Todas ocupa linha inteira) | Desktop: flex em linha */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {tabs.slice(0, 1).map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === key
                  ? "bg-navy-800 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-navy-300 hover:text-navy-700"
              }`}>
              {label}
              {count > 0 && (
                <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold px-1 ${
                  tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{count}</span>
              )}
            </button>
          ))}
          {tabs.slice(1).map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                tab === key
                  ? "bg-navy-800 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-navy-300 hover:text-navy-700"
              }`}>
              {label}
              {count > 0 && (
                <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold px-1 ${
                  tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white"
            placeholder="Buscar por título ou destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">
              {search ? "Nenhuma viagem encontrada." : "Nenhuma viagem cadastrada ainda."}
            </p>
            {!search && (
              <Link href="/admin/viagens/nova"
                className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
                <Plus size={15} /> Criar primeira viagem
              </Link>
            )}
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {paginated.map((trip) => {
              const s = STATUS_LABEL[trip.status] ?? { label: trip.status, cls: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
              return (
                <div key={trip.id}
                  onClick={() => setDetailTrip(trip)}
                  className={`rounded-xl border border-gray-100 border-l-4 ${!trip.is_active ? "border-l-gray-300 opacity-50 hover:opacity-75" : s.border} bg-gray-50 p-4 space-y-3 transition-all duration-200 hover:bg-white hover:shadow-md cursor-pointer`}>

                  {/* Top row: thumbnail + info + badge */}
                  <div className="flex items-start gap-3">
                    {trip.image_url && (
                      <img src={trip.image_url} alt={trip.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-100" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0">
                          {trip.is_featured && <Star size={12} className="text-gold-500 shrink-0 mt-0.5" fill="currentColor" />}
                          <p className="font-bold text-navy-800 text-sm leading-snug">{trip.title}</p>
                        </div>
                        <div className="shrink-0">
                          {trip.status === "completed"
                            ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Concluído</span>
                            : !trip.is_active
                            ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Oculto</span>
                            : <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
                          }
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin size={10} className="shrink-0" />{trip.destination}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="font-bold text-navy-700">R$ {trip.price_per_person.toLocaleString("pt-BR")}</span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1"><Calendar size={10} />{fmt(trip.departure_date)}</span>
                        {trip.category && <><span className="text-gray-300">·</span><span className="flex items-center gap-1"><Tag size={10} />{trip.category}</span></>}
                      </div>
                    </div>
                  </div>

                  {/* Vagas progress */}
                  <VagasBar available={trip.available_spots} total={trip.total_spots} />

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-0.5 opacity-100" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/admin/viagens/${trip.id}/editar`}
                      className="flex items-center gap-1 border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                      <Pencil size={11} /> Editar
                    </Link>
                    {trip.is_active ? (
                      <button onClick={() => setDeactivateTarget(trip)}
                        className="flex items-center justify-center gap-1 border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        <EyeOff size={11} />
                        <span>Ocultar</span>
                      </button>
                    ) : (
                      <button onClick={() => reactivateTrip(trip)} disabled={reactivatingId === trip.id}
                        className="flex items-center gap-1 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        {reactivatingId === trip.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                        <span>Reativar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Pagination page={page} total={total} onChange={setPage} />
        <p className="text-xs text-gray-400 text-right">
          {total} viagem(s) · página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}
        </p>
      </div>
    </div>
  );
}

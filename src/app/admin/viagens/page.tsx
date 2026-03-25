"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Star, Search, X, AlertTriangle, Loader2, MapPin, Users, Calendar, Tag } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Trip {
  id: number;
  title: string;
  destination: string;
  status: string;
  is_featured: boolean;
  is_active: boolean;
  price_per_person: number;
  available_spots: number;
  total_spots: number;
  departure_date: string;
  category: string;
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
              <h3 className="font-bold text-navy-800 text-lg">Desativar viagem?</h3>
              <p className="text-gray-400 text-sm mt-1">A viagem será ocultada do site.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1">
            <p className="font-bold text-navy-800">{trip.title}</p>
            <p className="text-sm text-gray-500">{trip.destination}</p>
            <p className="text-xs text-gray-400">
              {trip.available_spots}/{trip.total_spots} vagas · R$ {trip.price_per_person.toLocaleString("pt-BR")} · {fmt(trip.departure_date)}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Desativar
            </button>
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
        <span className="text-gray-500 flex items-center gap-1"><Users size={10} /> {available}/{total} vagas</span>
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

/* ─── Main page ─── */
export default function AdminViagens() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "sold_out">("all");
  const [deactivateTarget, setDeactivateTarget] = useState<Trip | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/trips/admin-list")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrips(data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const executeDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivateLoading(true);
    await apiFetch(`/trips/${deactivateTarget.id}`, { method: "DELETE" });
    setDeactivateLoading(false);
    setDeactivateTarget(null);
    load();
  };

  const counts = {
    all: trips.length,
    active: trips.filter((t) => t.status === "active").length,
    sold_out: trips.filter((t) => t.status === "sold_out").length,
  };

  const tabTrips = tab === "all" ? trips : trips.filter((t) => t.status === tab);
  const filtered = tabTrips.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "all",      label: "Todas",     count: counts.all },
    { key: "active",   label: "Ativas",    count: counts.active },
    { key: "sold_out", label: "Esgotadas", count: counts.sold_out },
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
        <div className="flex gap-2">
          {tabs.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
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
        ) : filtered.length === 0 ? (
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
            {filtered.map((trip) => {
              const s = STATUS_LABEL[trip.status] ?? { label: trip.status, cls: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
              return (
                <div key={trip.id}
                  className={`rounded-xl border border-gray-100 border-l-4 ${s.border} bg-gray-50 p-4 space-y-3 transition-all duration-200 hover:bg-white hover:shadow-md`}>

                  {/* Top row: info + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        {trip.is_featured && <Star size={12} className="text-gold-500 shrink-0 mt-0.5" fill="currentColor" />}
                        <p className="font-bold text-navy-800 text-sm leading-snug">{trip.title}</p>
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
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
                      {!trip.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600">Oculto</span>
                      )}
                    </div>
                  </div>

                  {/* Vagas progress */}
                  <VagasBar available={trip.available_spots} total={trip.total_spots} />

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Link href={`/admin/viagens/${trip.id}/editar`}
                      className="flex items-center gap-1 border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                      <Pencil size={11} /> Editar
                    </Link>
                    <button onClick={() => setDeactivateTarget(trip)}
                      className="flex items-center justify-center gap-1 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg transition-colors">
                      <Trash2 size={11} />
                      <span className="hidden sm:inline">Desativar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-right">{filtered.length} viagem(s)</p>
    </div>
  );
}

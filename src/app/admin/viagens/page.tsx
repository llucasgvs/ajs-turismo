"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Star, Search } from "lucide-react";
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
  active:    { label: "Ativo",     cls: "bg-green-100 text-green-700",  border: "border-l-green-400" },
  sold_out:  { label: "Esgotado",  cls: "bg-red-100 text-red-700",      border: "border-l-red-400" },
  cancelled: { label: "Cancelado", cls: "bg-gray-100 text-gray-600",    border: "border-l-gray-300" },
  completed: { label: "Concluído", cls: "bg-blue-100 text-blue-700",    border: "border-l-blue-400" },
};

export default function AdminViagens() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch("/trips/admin-list")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrips(data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Deseja desativar a viagem "${title}"?`)) return;
    setDeleting(id);
    await apiFetch(`/trips/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  };

  const filtered = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-800">Viagens</h1>
          <p className="text-gray-500 text-sm mt-1">{trips.length} pacotes cadastrados</p>
        </div>
        <Link
          href="/admin/viagens/nova"
          className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus size={16} />
          Nova Viagem
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input-field pl-11 bg-white"
          placeholder="Buscar por título ou destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">
              {search ? "Nenhuma viagem encontrada." : "Nenhuma viagem cadastrada ainda."}
            </p>
            {!search && (
              <Link
                href="/admin/viagens/nova"
                className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
              >
                <Plus size={15} /> Criar primeira viagem
              </Link>
            )}
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {filtered.map((trip) => {
              const s = STATUS_LABEL[trip.status] ?? { label: trip.status, cls: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
              return (
                <div key={trip.id} className={`rounded-xl border border-gray-100 border-l-4 ${s.border} bg-gray-50 p-4 transition-all duration-200 hover:bg-white hover:shadow-md`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        {trip.is_featured && <Star size={12} className="text-gold-500 flex-shrink-0 mt-0.5" fill="currentColor" />}
                        <div className="min-w-0">
                          <p className="font-bold text-navy-800 text-sm leading-tight">{trip.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{trip.destination}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>{trip.available_spots}/{trip.total_spots} vagas</span>
                        <span>·</span>
                        <span className="font-bold text-navy-700">R$ {trip.price_per_person.toLocaleString("pt-BR")}</span>
                        <span>·</span>
                        <span>{new Date(trip.departure_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                        {!trip.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-600">Oculto</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/viagens/${trip.id}/editar`}
                          className="flex items-center gap-1.5 text-xs font-semibold text-navy-600 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-lg transition-colors">
                          <Pencil size={11} /> Editar
                        </Link>
                        <button onClick={() => handleDelete(trip.id, trip.title)} disabled={deleting === trip.id}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                          <Trash2 size={11} /> Desativar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

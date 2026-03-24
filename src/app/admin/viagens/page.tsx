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

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-green-100 text-green-700" },
  sold_out: { label: "Esgotado", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelado", cls: "bg-gray-100 text-gray-600" },
  completed: { label: "Concluído", cls: "bg-blue-100 text-blue-700" },
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Viagem</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Vagas</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Saída</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((trip) => {
                const s = STATUS_LABEL[trip.status] ?? { label: trip.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {trip.is_featured && (
                          <Star size={13} className="text-gold-500 flex-shrink-0" fill="currentColor" />
                        )}
                        <div>
                          <p className="font-medium text-navy-800 text-sm leading-tight">{trip.title}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{trip.destination}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                      {!trip.is_active && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-600">
                          Oculto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {trip.available_spots}/{trip.total_spots}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-navy-700 font-bold text-sm">
                        R$ {trip.price_per_person.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(trip.departure_date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/admin/viagens/${trip.id}/editar`}
                          className="p-2 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(trip.id, trip.title)}
                          disabled={deleting === trip.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Desativar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

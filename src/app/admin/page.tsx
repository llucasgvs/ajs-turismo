"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, Plus, Star, Activity } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Trip {
  id: number;
  title: string;
  destination: string;
  status: string;
  is_featured: boolean;
  price_per_person: number;
  available_spots: number;
  departure_date: string;
}

export default function AdminDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/trips/admin-list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrips(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: trips.length,
    active: trips.filter((t) => t.status === "active" && t.available_spots > 0).length,
    featured: trips.filter((t) => t.is_featured).length,
    soldOut: trips.filter((t) => t.status === "sold_out" || t.available_spots === 0).length,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Bem-vindo ao painel da AJS Turismo</p>
        </div>
        <Link
          href="/admin/viagens/nova"
          className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus size={16} />
          Nova Viagem
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { label: "Total de Viagens", value: stats.total, icon: Map, color: "text-navy-600", bg: "bg-navy-50" },
          { label: "Ativas com Vagas", value: stats.active, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
          { label: "Em Destaque", value: stats.featured, icon: Star, color: "text-gold-600", bg: "bg-gold-50" },
          { label: "Esgotadas", value: stats.soldOut, icon: Map, color: "text-red-500", bg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-3xl font-black text-navy-800">{loading ? "—" : value}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent trips */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-navy-800">Viagens Recentes</h2>
          <Link href="/admin/viagens" className="text-sm text-gold-600 hover:text-gold-500 font-medium">
            Ver todas
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : trips.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm mb-4">Nenhuma viagem cadastrada ainda.</p>
            <Link href="/admin/viagens/nova" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
              <Plus size={15} /> Criar primeira viagem
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {trips.slice(0, 5).map((trip) => (
              <div key={trip.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy-800 text-sm truncate">{trip.title}</p>
                  <p className="text-gray-400 text-xs">{trip.destination}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    trip.status === "active" ? "bg-green-100 text-green-700" :
                    trip.status === "sold_out" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {trip.status === "active" ? "Ativo" : trip.status === "sold_out" ? "Esgotado" : trip.status}
                  </span>
                  <p className="text-navy-700 font-bold text-sm whitespace-nowrap">
                    R$ {trip.price_per_person.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <Link
                    href={`/admin/viagens/${trip.id}/editar`}
                    className="text-xs text-navy-500 hover:text-gold-600 font-medium transition-colors"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

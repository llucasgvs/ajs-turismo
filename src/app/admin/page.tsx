"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, Plus, Star, Activity, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TemplateSummary {
  id: number;
  title: string;
  destination: string;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  active_dates_count: number;
  next_departure: string | null;
  next_price: number | null;
}

export default function AdminDashboard() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/templates/admin-list")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: templates.length,
    withDates: templates.filter((t) => t.active_dates_count > 0).length,
    featured: templates.filter((t) => t.is_featured).length,
    noDates: templates.filter((t) => t.active_dates_count === 0 && t.is_active).length,
  };

  function fmt(d: string) {
    return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Bem-vindo ao painel da AJS Turismo</p>
        </div>
        <Link href="/admin/viagens/novo-roteiro" className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus size={16} />
          Novo Roteiro
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total de Roteiros", value: stats.total, icon: Map, color: "text-navy-600", bg: "bg-navy-50" },
          { label: "Com Datas Ativas", value: stats.withDates, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
          { label: "Em Destaque", value: stats.featured, icon: Star, color: "text-gold-600", bg: "bg-gold-50" },
          { label: "Sem Datas Ativas", value: stats.noDates, icon: Calendar, color: "text-red-500", bg: "bg-red-50" },
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

      {/* Roteiros recentes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-navy-800">Roteiros Recentes</h2>
          <Link href="/admin/viagens" className="text-sm text-gold-600 hover:text-gold-500 font-medium">
            Ver todos
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm mb-4">Nenhum roteiro cadastrado ainda.</p>
            <Link href="/admin/viagens/novo-roteiro" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
              <Plus size={15} /> Criar primeiro roteiro
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {templates.slice(0, 5).map((tmpl) => (
              <div key={tmpl.id} className="flex items-center justify-between px-4 md:px-6 py-4 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy-800 text-sm truncate">{tmpl.title}</p>
                  <p className="text-gray-400 text-xs">{tmpl.destination}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tmpl.active_dates_count > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {tmpl.active_dates_count} data{tmpl.active_dates_count !== 1 ? "s" : ""} ativa{tmpl.active_dates_count !== 1 ? "s" : ""}
                    </span>
                    {tmpl.next_departure && tmpl.next_price && (
                      <span className="text-navy-700 font-bold text-xs hidden md:inline">
                        {fmt(tmpl.next_departure)} · R$ {tmpl.next_price.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/viagens/${tmpl.id}`}
                  className="text-xs text-navy-500 hover:text-gold-600 font-medium transition-colors whitespace-nowrap"
                >
                  Ver datas
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

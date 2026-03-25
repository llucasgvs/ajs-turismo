"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, X, MapPin, Calendar, Star, Users, Loader2, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TemplateSummary {
  id: number;
  title: string;
  destination: string;
  image_url: string | null;
  category: string;
  tag: string | null;
  is_featured: boolean;
  is_active: boolean;
  duration_nights: number;
  active_dates_count: number;
  total_dates_count: number;
  next_departure: string | null;
  next_price: number | null;
  sold_spots: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  praia: "Praia", nordeste: "Nordeste", serra: "Serra",
  aventura: "Aventura", cultural: "Cultural", internacional: "Internacional",
};

function fmt(d: string) {
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function ViagensPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await apiFetch(`/templates/admin-list?${params}`);
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-navy-800">Roteiros</h1>
          <p className="text-gray-500 text-sm">{templates.length} roteiro{templates.length !== 1 ? "s" : ""} cadastrado{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/viagens/novo-roteiro"
          className="flex items-center gap-1.5 bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-navy-700 transition-colors"
        >
          <Plus size={16} />
          <span>Novo roteiro</span>
        </Link>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-400 bg-white"
          placeholder="Buscar por nome ou destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-navy-400 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Nenhum roteiro encontrado</p>
          {!search && (
            <Link href="/admin/viagens/novo-roteiro" className="mt-3 inline-block text-sm text-navy-600 underline">
              Criar primeiro roteiro
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <TemplateCard key={tmpl.id} tmpl={tmpl} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ tmpl }: { tmpl: TemplateSummary }) {
  return (
    <Link
      href={`/admin/viagens/${tmpl.id}`}
      className={`group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col border border-gray-100 ${!tmpl.is_active ? "opacity-50" : ""}`}
    >
      {/* Imagem com overlay gradiente */}
      <div className="relative h-44 bg-gray-200 flex-shrink-0">
        {tmpl.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tmpl.image_url} alt={tmpl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin size={40} />
          </div>
        )}

        {/* Gradiente escuro na base da imagem */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badges no topo */}
        <div className="absolute top-2.5 left-2.5 flex gap-1 flex-wrap">
          <span className="bg-white/90 backdrop-blur-sm text-navy-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {CATEGORY_LABEL[tmpl.category] ?? tmpl.category}
          </span>
          {tmpl.is_featured && (
            <span className="bg-gold-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Star size={8} fill="currentColor" /> Destaque
            </span>
          )}
          {tmpl.tag && (
            <span className="bg-navy-800/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {tmpl.tag}
            </span>
          )}
        </div>

        {/* Título + destino sobre a imagem */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <h3 className="font-black text-white text-base leading-tight drop-shadow">{tmpl.title}</h3>
          <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="flex-shrink-0" /> {tmpl.destination}
          </p>
        </div>

        {!tmpl.is_active && (
          <div className="absolute inset-0 bg-white/30 flex items-center justify-center">
            <span className="bg-gray-800/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">Inativo</span>
          </div>
        )}
      </div>

      {/* Corpo do card */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">

        {/* Stats inline */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className={`flex items-center gap-1 font-semibold ${tmpl.active_dates_count > 0 ? "text-green-600" : "text-gray-400"}`}>
            <Calendar size={11} />
            {tmpl.active_dates_count} ativa{tmpl.active_dates_count !== 1 ? "s" : ""}
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1">
            {tmpl.total_dates_count} total
          </span>
          {tmpl.sold_spots > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1 text-navy-600">
                <Users size={10} /> {tmpl.sold_spots} vendidas
              </span>
            </>
          )}
        </div>

        {/* Próxima data + preço */}
        {tmpl.next_departure ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Próxima saída</p>
              <p className="text-sm font-bold text-navy-800">{fmt(tmpl.next_departure)}</p>
            </div>
            {tmpl.next_price && (
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">A partir de</p>
                <p className="text-sm font-bold text-gold-600">
                  R$ {tmpl.next_price.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Sem datas ativas</p>
            <Link
              href={`/admin/viagens/${tmpl.id}/datas/nova`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-navy-600 hover:text-gold-600 font-semibold flex items-center gap-0.5 transition-colors"
            >
              <Plus size={11} /> Nova data
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-1 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-navy-600 group-hover:text-gold-600 transition-colors">
          <span>Ver datas</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

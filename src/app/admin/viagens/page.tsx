"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, X, MapPin, Calendar, Star, Loader2, ChevronRight } from "lucide-react";
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
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${!tmpl.is_active ? "opacity-50" : ""}`}
    >
      {/* Imagem */}
      <div className="relative h-36 bg-gray-100">
        {tmpl.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tmpl.image_url} alt={tmpl.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin size={32} />
          </div>
        )}
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          <span className="bg-white/90 text-navy-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {CATEGORY_LABEL[tmpl.category] ?? tmpl.category}
          </span>
          {tmpl.is_featured && (
            <span className="bg-gold-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Star size={8} fill="currentColor" /> Destaque
            </span>
          )}
          {tmpl.tag && (
            <span className="bg-navy-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {tmpl.tag}
            </span>
          )}
        </div>
        {!tmpl.is_active && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
            <span className="bg-gray-700/80 text-white text-xs font-semibold px-3 py-1 rounded-full">Inativo</span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-bold text-navy-800 leading-tight group-hover:text-navy-600 transition-colors">{tmpl.title}</h3>
          <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
            <MapPin size={11} className="flex-shrink-0" /> {tmpl.destination}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-400">Datas ativas</p>
            <p className="font-bold text-navy-800 text-base">{tmpl.active_dates_count}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-400">Total de datas</p>
            <p className="font-bold text-navy-800 text-base">{tmpl.total_dates_count}</p>
          </div>
        </div>

        {/* Próxima data */}
        {tmpl.next_departure ? (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              Próxima: {fmt(tmpl.next_departure)}
            </span>
            {tmpl.next_price && (
              <span className="font-semibold text-gold-600">
                R$ {tmpl.next_price.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
            <span>Sem datas ativas</span>
            <Link
              href={`/admin/viagens/${tmpl.id}/datas/nova`}
              onClick={(e) => e.stopPropagation()}
              className="text-navy-600 hover:text-gold-600 font-semibold flex items-center gap-0.5 transition-colors"
            >
              <Plus size={11} /> Nova data
            </Link>
          </div>
        )}

        {/* Ver datas chevron */}
        <div className="flex items-center justify-end text-xs text-gray-400 group-hover:text-navy-600 transition-colors -mt-1">
          <span>Ver datas</span>
          <ChevronRight size={13} />
        </div>
      </div>
    </Link>
  );
}

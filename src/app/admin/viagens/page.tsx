"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, Search, X, MapPin, Star, Users, Loader2, ChevronRight, Camera } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { adminDirtyTs } from "@/lib/adminCache";

// Cache em nível de módulo - sobrevive a navegações dentro da SPA, reset no F5
const _cache: { data: TemplateSummary[] | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 30_000; // 30 segundos

interface TemplateSummary {
  id: number;
  title: string;
  destination: string;
  image_url: string | null;
  photos_count: number;
  category: string;
  tag: string | null;
  is_featured: boolean;
  is_active: boolean;
  active_dates_count: number;
  hidden_dates_count: number;
  total_dates_count: number;
  sold_spots: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  praia: "Praia",
  nordeste: "Nordeste",
  litoral: "Litoral",
  sul: "Sul do Brasil",
  serra: "Serra / Montanha",
  aventura: "Aventura",
  natureza: "Natureza / Ecoturismo",
  cultural: "Cultural",
  gastronomia: "Gastronomia",
  religioso: "Religioso / Romaria",
  parque: "Parque Temático",
  internacional: "Internacional",
  outros: "Outros",
};


export default function ViagensPage() {
  const isFreshCache = !_cache.data || (Date.now() - _cache.ts) > CACHE_TTL;
  const [templates, setTemplates] = useState<TemplateSummary[]>(_cache.data ?? []);
  const [loading, setLoading] = useState(isFreshCache && !_cache.data);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchActive = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTemplates = useCallback(async (isSearch = false) => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);

    // Com busca ativa: sempre mostra spinner. Sem busca: usa cache se fresco
    // (dentro do TTL E criado depois da última mutação do admin)
    const cached = !debouncedSearch && _cache.data
      && (Date.now() - _cache.ts) < CACHE_TTL
      && _cache.ts >= adminDirtyTs();
    if (cached && !isSearch) {
      setTemplates(_cache.data!);
      setLoading(false);
      return;
    }

    if (!_cache.data || debouncedSearch) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiFetch(`/templates/admin-list?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (!debouncedSearch) { _cache.data = data; _cache.ts = Date.now(); }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    searchActive.current = !!debouncedSearch;
    fetchTemplates(!!debouncedSearch);
  }, [fetchTemplates, debouncedSearch]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-navy-800 flex items-center gap-2">
            Roteiros
            {refreshing && <Loader2 size={14} className="text-navy-400 animate-spin" />}
          </h1>
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
      className={`group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-[color,background-color,border-color,box-shadow,transform,opacity] overflow-hidden flex flex-col border border-gray-100 ${!tmpl.is_active ? "opacity-50" : ""}`}
    >
      {/* Imagem - menor no mobile (h-28), maior no desktop (h-40) */}
      <div className="relative h-28 sm:h-40 bg-gray-200 flex-shrink-0">
        {tmpl.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async" src={tmpl.image_url} alt={tmpl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin size={32} />
          </div>
        )}

        {/* Aviso discreto: faltam fotos (ideal são 5) */}
        {tmpl.photos_count < 5 && (
          <span
            title={`${tmpl.photos_count} de 5 fotos - adicione mais`}
            className="absolute top-2 right-2 z-10 bg-amber-400/95 text-navy-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"
          >
            <Camera size={9} /> {tmpl.photos_count}/5
          </span>
        )}

        {/* Gradiente na base */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badges no topo */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
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
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
          <h3 className="font-black text-white text-sm sm:text-base leading-tight drop-shadow">{tmpl.title}</h3>
          <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
            <MapPin size={9} className="flex-shrink-0" /> {tmpl.destination}
          </p>
        </div>

        {!tmpl.is_active && (
          <div className="absolute inset-0 bg-white/30 flex items-center justify-center">
            <span className="bg-gray-800/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">Inativo</span>
          </div>
        )}
      </div>

      {/* Corpo do card */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-2 flex-1">

        {/* Stats de datas */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className={`rounded-lg px-2 py-1.5 text-center ${tmpl.active_dates_count > 0 ? "bg-green-50" : "bg-red-50"}`}>
            <p className={`text-[11px] font-black ${tmpl.active_dates_count > 0 ? "text-green-700" : "text-red-600"}`}>{tmpl.active_dates_count}</p>
            <p className={`text-[9px] font-medium leading-tight ${tmpl.active_dates_count > 0 ? "text-green-600" : "text-red-500"}`}>Ativas</p>
          </div>
          <div className="bg-zinc-50 rounded-lg px-2 py-1.5 text-center">
            <p className="text-[11px] font-black text-zinc-500">{tmpl.hidden_dates_count}</p>
            <p className="text-[9px] text-zinc-400 font-medium leading-tight">Ocultas</p>
          </div>
          <div className="bg-navy-50 rounded-lg px-2 py-1.5 text-center">
            <p className="text-[11px] font-black text-navy-700">{tmpl.total_dates_count}</p>
            <p className="text-[9px] text-navy-500 font-medium leading-tight">Total</p>
          </div>
        </div>

        {/* Vendas totais */}
        {tmpl.sold_spots > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-navy-600">
            <Users size={11} />
            <span><strong>{tmpl.sold_spots}</strong> vagas vendidas no total</span>
          </div>
        )}

        {tmpl.active_dates_count === 0 && (
          <Link
            href={`/admin/viagens/${tmpl.id}/datas/nova`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gold-600 hover:text-gold-700 font-semibold flex items-center gap-0.5 transition-colors"
          >
            <Plus size={11} /> Adicionar data
          </Link>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-navy-600 group-hover:text-gold-600 transition-colors">
          <span>Ver datas</span>
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

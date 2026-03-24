"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  MapPin, Clock, Search, ArrowRight, SlidersHorizontal,
  X, Star, Users, Calendar, ChevronDown, Plane, Check,
} from "lucide-react";
import type { Trip } from "@/types/trip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WA_URL =
  "https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20n%C3%A3o%20encontrei%20o%20pacote%20que%20procuro.%20Pode%20me%20ajudar%3F";

const CATEGORIES = [
  { value: "", label: "Todos", icon: "🌎", match: [] },
  { value: "praia", label: "Praia", icon: "🏖️", match: ["praia", "nordeste"] },
  { value: "serra", label: "Serra", icon: "⛰️", match: ["serra"] },
  { value: "aventura", label: "Aventura", icon: "🧗", match: ["aventura"] },
  { value: "cultural", label: "Cultural", icon: "🏛️", match: ["cultural"] },
  { value: "internacional", label: "Internacional", icon: "✈️", match: ["internacional"] },
];

const SORT_OPTIONS = [
  { value: "date_asc", label: "Mais próximos" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "discount", label: "Maior desconto" },
];

const DURATION_OPTIONS = [
  { value: "", label: "Qualquer duração" },
  { value: "1-5", label: "Até 5 dias" },
  { value: "6-8", label: "6 a 8 dias" },
  { value: "9-99", label: "9 dias ou mais" },
];

function sortTrips(trips: Trip[], sort: string): Trip[] {
  const arr = [...trips];
  if (sort === "price_asc") return arr.sort((a, b) => a.price_per_person - b.price_per_person);
  if (sort === "price_desc") return arr.sort((a, b) => b.price_per_person - a.price_per_person);
  if (sort === "discount")
    return arr.sort((a, b) => {
      const da = a.original_price ? 1 - a.price_per_person / a.original_price : 0;
      const db = b.original_price ? 1 - b.price_per_person / b.original_price : 0;
      return db - da;
    });
  return arr.sort(
    (a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime()
  );
}

export default function ViagensPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filtered, setFiltered] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("date_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [durationFilter, setDurationFilter] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const fetchTrips = useCallback(() => {
    setLoading(true);
    fetch(`${API}/trips/?limit=100`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrips(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let result = trips;
    if (category) {
      const match = CATEGORIES.find((c) => c.value === category)?.match ?? [category];
      result = result.filter((t) => match.includes(t.category));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          (t.short_description || "").toLowerCase().includes(q)
      );
    }
    if (durationFilter) {
      const [min, max] = durationFilter.split("-").map(Number);
      result = result.filter((t) => {
        const days = t.duration_nights + 1;
        return days >= min && days <= max;
      });
    }
    if (onlyAvailable) result = result.filter((t) => t.available_spots > 0 && t.status !== "sold_out");
    setFiltered(sortTrips(result, sort));
  }, [trips, category, search, sort, durationFilter, onlyAvailable]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 300);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setSort("date_asc");
    setDurationFilter("");
    setOnlyAvailable(false);
  };

  const activeFilterCount = [category, durationFilter, onlyAvailable ? "1" : ""].filter(Boolean).length;
  const hasFilters = !!(search || category || durationFilter || onlyAvailable);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Ordenar";
  const durationLabelShort = DURATION_OPTIONS.find((o) => o.value === durationFilter)?.label;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80&fit=crop"
            alt="destinos"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/60 via-navy-900/80 to-navy-900" />
        </div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, #C9A84C 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative container-custom py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Plane size={12} />
            Saindo de Curitiba — PR
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl text-white mb-4 leading-tight">
            Explore Nossas <span className="text-gold-400">Viagens</span>
          </h1>
          <p className="text-navy-200 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Pacotes completos com os melhores destinos nacionais e internacionais. Preços acessíveis, atendimento personalizado e parcelamento em até 12x sem juros.
          </p>

          {/* Live search */}
          <div className="relative max-w-2xl mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
            <input
              className="w-full pl-11 pr-12 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 text-sm focus:outline-none focus:border-gold-400/60 focus:bg-white/15 transition-all"
              placeholder="Buscar destino, pacote ou categoria..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-gray-50" />
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full container-custom py-8">

        {/* ── Filter bar: Filtros + Sort sempre visíveis ── */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Filtros button */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
                activeFilterCount > 0
                  ? "bg-navy-900 text-white border-navy-900 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-navy-900 text-xs font-black flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter dropdown */}
            {showFilters && (
              <div className="absolute left-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 w-80 max-w-[calc(100vw-2rem)] p-5 overflow-y-auto max-h-[80vh]">
                {/* Category */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categoria</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        category === cat.value
                          ? "bg-navy-900 text-white border-navy-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span>{cat.icon}</span>{cat.label}
                    </button>
                  ))}
                </div>

                {/* Duration */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Duração</p>
                <div className="flex flex-col gap-1.5 mb-5">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDurationFilter(opt.value)}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                        durationFilter === opt.value
                          ? "bg-navy-50 text-navy-800 font-semibold"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                      {durationFilter === opt.value && <Check size={14} className="text-navy-700" />}
                    </button>
                  ))}
                </div>

                {/* Only available */}
                <div className="border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setOnlyAvailable(!onlyAvailable)}
                    className="flex items-center justify-between w-full"
                  >
                    <span className="text-sm font-medium text-gray-700">Apenas com vagas disponíveis</span>
                    <div className={`w-10 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${onlyAvailable ? "bg-navy-800" : "bg-gray-200"}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${onlyAvailable ? "left-5" : "left-1"}`} />
                    </div>
                  </button>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setCategory(""); setDurationFilter(""); setOnlyAvailable(false); }}
                    className="mt-4 w-full text-center text-sm text-red-500 hover:text-red-600 font-medium py-2"
                  >
                    Limpar filtros avançados
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort button */}
          <div className="relative flex-shrink-0" ref={sortRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all whitespace-nowrap"
            >
              <ChevronDown size={14} className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
              <span className="hidden sm:inline">{sortLabel}</span>
              <span className="sm:hidden">Ordenar</span>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between gap-3 ${
                      sort === opt.value
                        ? "bg-navy-50 text-navy-800 font-semibold"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                    {sort === opt.value && <Check size={13} className="text-navy-700 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {(category || durationFilter || onlyAvailable) && (
          <div className="flex items-center gap-2 flex-wrap mb-4 pt-1">
            {category && (
              <span className="inline-flex items-center gap-1.5 bg-navy-50 border border-navy-100 text-navy-700 text-xs font-medium px-3 py-1.5 rounded-full">
                {CATEGORIES.find(c => c.value === category)?.icon} {CATEGORIES.find(c => c.value === category)?.label}
                <button onClick={() => setCategory("")}><X size={11} /></button>
              </span>
            )}
            {durationFilter && (
              <span className="inline-flex items-center gap-1.5 bg-navy-50 border border-navy-100 text-navy-700 text-xs font-medium px-3 py-1.5 rounded-full">
                {durationLabelShort}
                <button onClick={() => setDurationFilter("")}><X size={11} /></button>
              </span>
            )}
            {onlyAvailable && (
              <span className="inline-flex items-center gap-1.5 bg-navy-50 border border-navy-100 text-navy-700 text-xs font-medium px-3 py-1.5 rounded-full">
                Com vagas
                <button onClick={() => setOnlyAvailable(false)}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {/* Count row */}
        {!loading && (
          <div className="flex items-center gap-3 py-2 mb-4 border-b border-gray-200">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-navy-800">{filtered.length}</span>{" "}
              {filtered.length !== 1 ? "viagens" : "viagem"} encontrada{filtered.length !== 1 ? "s" : ""}
              {search && <span> para <strong>&ldquo;{search}&rdquo;</strong></span>}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">
                Limpar tudo
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
                <div className="h-52 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-8 bg-gray-200 rounded-xl w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </main>

      {/* ── CTA WHATSAPP ── */}
      <section className="bg-navy-900 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl text-white mb-3">
            Não encontrou o que procura?
          </h2>
          <p className="text-navy-300 text-lg mb-8 max-w-xl mx-auto">
            Nossa equipe monta pacotes personalizados para você. Fale agora e receba uma proposta exclusiva!
          </p>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-emerald-500/30"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar com um consultor
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ─── Trip Card ─── */
function TripCard({ trip }: { trip: Trip }) {
  const sold = trip.available_spots === 0 || trip.status === "sold_out";
  const lowStock = !sold && trip.available_spots > 0 && trip.available_spots <= 5;
  const discount = trip.original_price
    ? Math.round((1 - trip.price_per_person / trip.original_price) * 100)
    : null;
  const depDate = new Date(trip.departure_date);
  const formattedDate = depDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <Link
      href={`/viagens/${trip.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border border-gray-100 hover:border-gold-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-44 flex-shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"}
          alt={trip.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {trip.tag && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-xs font-bold px-2.5 py-1 rounded-full">
              <Star size={9} fill="currentColor" />
              {trip.tag}
            </span>
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
          {sold ? (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Esgotado</span>
          ) : lowStock ? (
            <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Últimas vagas!</span>
          ) : null}
          {discount && discount > 0 && (
            <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{discount}%</span>
          )}
        </div>

        <div className="absolute bottom-2.5 left-2.5">
          <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 max-w-[180px]">
            <MapPin size={10} className="text-gold-400 flex-shrink-0" />
            <span className="text-white text-xs font-medium truncate">{trip.destination}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-black text-sm text-navy-800 leading-snug line-clamp-2 mb-1.5">
          {trip.title}
        </h3>

        {trip.short_description && (
          <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
            {trip.short_description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 bg-navy-50 text-navy-600 text-xs font-medium px-2.5 py-1 rounded-full">
            <Clock size={10} />
            {trip.duration_nights + 1}d / {trip.duration_nights}n
          </span>
          <span className="inline-flex items-center gap-1 bg-navy-50 text-navy-600 text-xs font-medium px-2.5 py-1 rounded-full">
            <Calendar size={10} />
            {formattedDate}
          </span>
          <span className="inline-flex items-center gap-1 bg-navy-50 text-navy-600 text-xs font-medium px-2.5 py-1 rounded-full">
            <Users size={10} />
            Mín. {trip.min_group_size}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-2 border-t border-gray-100">
          <div>
            {trip.original_price && (
              <p className="text-xs text-gray-400 line-through leading-none mb-0.5">
                R$ {trip.original_price.toLocaleString("pt-BR")}
              </p>
            )}
            <p className="text-[10px] text-gray-400 leading-none">a partir de</p>
            <p className="font-display font-black text-xl text-navy-700 leading-tight">
              R$ {trip.price_per_person.toLocaleString("pt-BR")}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              {trip.max_installments}x de R${" "}
              {Math.ceil(trip.price_per_person / trip.max_installments).toLocaleString("pt-BR")} s/ juros
            </p>
          </div>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              sold
                ? "bg-gray-100 text-gray-400"
                : "bg-navy-800 text-white group-hover:bg-gold-500 group-hover:scale-110"
            }`}
          >
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Empty State ─── */
function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="w-24 h-24 bg-navy-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <MapPin size={36} className="text-navy-200" />
      </div>
      <h3 className="font-display font-black text-2xl text-navy-700 mb-2">
        {hasFilters ? "Nenhuma viagem encontrada" : "Em breve novos pacotes!"}
      </h3>
      <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
        {hasFilters
          ? "Tente outros filtros ou fale com nossa equipe para montar um pacote personalizado."
          : "Novos pacotes em breve. Fale com nossa equipe e reserve antecipadamente."}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {hasFilters && (
          <button onClick={onClear} className="btn-secondary py-2.5 px-6 text-sm">
            Limpar filtros
          </button>
        )}
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary py-2.5 px-6 text-sm inline-flex items-center gap-2"
        >
          Falar no WhatsApp
          <ArrowRight size={15} />
        </a>
      </div>
    </div>
  );
}

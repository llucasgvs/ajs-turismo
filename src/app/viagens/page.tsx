"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MapPin, Clock, Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import type { Trip } from "@/types/trip";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORIES = [
  { value: "", label: "Todos" },
  { value: "praia", label: "Praia" },
  { value: "nordeste", label: "Nordeste" },
  { value: "serra", label: "Serra" },
  { value: "aventura", label: "Aventura" },
  { value: "cultural", label: "Cultural" },
  { value: "internacional", label: "Internacional" },
];

export default function ViagensPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchTrips = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    fetch(`${API}/trips/?${params}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrips(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-navy-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="badge mb-4">Explore</div>
          <h1 className="font-display font-black text-4xl md:text-5xl mb-4">
            Nossas <span className="text-gold-400">Viagens</span>
          </h1>
          <p className="text-navy-200 text-lg mb-8">
            Pacotes completos saindo de Curitiba com os melhores preços
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-11 pr-4 py-3 rounded-xl text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                placeholder="Buscar por destino ou nome..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary px-5 py-3 text-sm flex items-center gap-2">
              <Search size={16} />
              Buscar
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Category filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <SlidersHorizontal size={16} className="text-gray-400 flex-shrink-0" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                category === cat.value
                  ? "bg-navy-700 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-gray-500 text-sm mb-6">
            {trips.length === 0
              ? "Nenhuma viagem encontrada"
              : `${trips.length} viagem${trips.length !== 1 ? "s" : ""} encontrada${trips.length !== 1 ? "s" : ""}`}
            {search && <span> para &ldquo;<strong>{search}</strong>&rdquo;</span>}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-2">Nenhuma viagem encontrada</p>
            <p className="text-gray-400 text-sm mb-6">Tente outros filtros ou entre em contato conosco</p>
            <button
              onClick={() => { setSearch(""); setSearchInput(""); setCategory(""); }}
              className="text-navy-600 hover:text-gold-600 font-medium text-sm"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp CTA */}
      <div className="bg-navy-800 text-white py-12 px-4 mt-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg font-medium mb-2">Não encontrou o que procura?</p>
          <p className="text-navy-300 text-sm mb-6">Fale com nossa equipe e monte o pacote ideal para você</p>
          <a
            href="https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20n%C3%A3o%20encontrei%20o%20pacote%20que%20procuro.%20Pode%20me%20ajudar%3F"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const sold = trip.available_spots === 0 || trip.status === "sold_out";

  return (
    <Link href={`/viagens/${trip.id}`} className="card group flex flex-col hover:shadow-gold transition-shadow duration-300">
      <div className="relative h-52 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"}
          alt={trip.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {trip.tag && (
          <div className="absolute top-3 left-3 bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-full">
            {trip.tag}
          </div>
        )}

        {sold && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            Esgotado
          </div>
        )}

        {!sold && trip.available_spots <= 5 && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            Últimas vagas!
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display font-black text-lg text-white leading-tight">{trip.title}</h3>
          <div className="flex items-center gap-1.5 text-white/80 text-sm mt-0.5">
            <MapPin size={12} />
            {trip.destination}
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {trip.short_description && (
          <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{trip.short_description}</p>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-navy-50 text-navy-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <Clock size={11} />
            {trip.duration_nights + 1} dias / {trip.duration_nights} noites
          </div>
          <div className="text-xs text-gray-400">
            {new Date(trip.departure_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            {trip.original_price && (
              <p className="text-xs text-gray-400 line-through">
                R$ {trip.original_price.toLocaleString("pt-BR")}
              </p>
            )}
            <p className="text-xs text-gray-500">a partir de</p>
            <p className="font-display font-black text-2xl text-navy-700">
              R$ {trip.price_per_person.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-emerald-600 font-medium">
              {trip.max_installments}x de R$ {Math.ceil(trip.price_per_person / trip.max_installments).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex items-center gap-1 text-navy-600 group-hover:text-gold-500 transition-colors">
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

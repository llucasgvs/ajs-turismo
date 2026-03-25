"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  MapPin, Search, ArrowRight,
  X, Star, Calendar, ChevronDown, ChevronLeft, ChevronRight, Plane, Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEK_DAYS = ["D","S","T","Q","Q","S","S"];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WA_URL =
  "https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20n%C3%A3o%20encontrei%20o%20pacote%20que%20procuro.%20Pode%20me%20ajudar%3F";

const SORT_OPTIONS = [
  { value: "date_asc", label: "Mais próximos" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
];

interface PublicDate {
  id: number;
  departure_date: string;
  return_date: string;
  price_per_person: number;
  original_price: number | null;
  available_spots: number;
  total_spots: number;
  status: string;
}

interface PublicTemplate {
  id: number;
  first_trip_id: number;
  title: string;
  destination: string;
  image_url: string | null;
  category: string;
  tag: string | null;
  is_featured: boolean;
  short_description: string | null;
  includes: string[];
  price_from: number;
  original_price_from: number | null;
  max_installments: number;
  dates: PublicDate[];
}

function fmtDate(d: string) {
  const date = new Date(d.slice(0, 10) + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return date.toLocaleDateString("pt-BR", opts);
}

function sortTemplates(templates: PublicTemplate[], sort: string): PublicTemplate[] {
  const arr = [...templates];
  if (sort === "price_asc") return arr.sort((a, b) => a.price_from - b.price_from);
  if (sort === "price_desc") return arr.sort((a, b) => b.price_from - a.price_from);
  return arr.sort((a, b) =>
    new Date(a.dates[0].departure_date).getTime() - new Date(b.dates[0].departure_date).getTime()
  );
}

export default function ViagensPage() {
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [filtered, setFiltered] = useState<PublicTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [calViewMode, setCalViewMode] = useState<"datas" | "meses">("datas");
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [showWhenPicker, setShowWhenPicker] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const whenRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Map of departure dates → count (across all templates)
  const datesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    templates.forEach((t) => t.dates.forEach((d) => {
      const key = d.departure_date.slice(0, 10);
      if (key >= today) map[key] = (map[key] || 0) + 1;
    }));
    return map;
  }, [templates, today]);

  const datesByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    templates.forEach((t) => t.dates.forEach((d) => {
      const key = d.departure_date.slice(0, 7);
      if (d.departure_date.slice(0, 10) >= today) map[key] = (map[key] || 0) + 1;
    }));
    return map;
  }, [templates, today]);

  const nextMonths = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    let lastMonth = "";
    templates.forEach((t) => t.dates.forEach((d) => {
      const m = d.departure_date.slice(0, 7);
      if (m > lastMonth) lastMonth = m;
    }));
    if (!lastMonth) return months;
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    const [ey, em] = lastMonth.split("-").map(Number);
    const end = new Date(ey, em - 1, 1);
    while (d <= end) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}` });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }, [templates]);

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    fetch(`${API}/templates/public`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (whenRef.current && !whenRef.current.contains(e.target as Node)) setShowWhenPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let result = templates;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q)
      );
    }
    if (selectedDate) {
      result = result.filter((t) =>
        t.dates.some((d) => d.departure_date.slice(0, 10) === selectedDate)
      );
    }
    if (selectedMonth) {
      result = result.filter((t) =>
        t.dates.some((d) => d.departure_date.slice(0, 7) === selectedMonth)
      );
    }
    setFiltered(sortTemplates(result, sort));
  }, [templates, search, sort, selectedDate, selectedMonth]);

  const clearFilters = () => { setSearch(""); setSelectedDate(""); setSelectedMonth(""); };
  const hasFilters = !!(search || selectedDate || selectedMonth);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Ordenar";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-20 overflow-hidden pb-20">
        <div className="absolute inset-0 bg-navy-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80&fit=crop"
            alt="destinos"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/60 via-navy-900/80 to-navy-900" />
        </div>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, #C9A84C 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative container-custom py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Plane size={12} /> Saindo de Curitiba — PR
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl text-white mb-4 leading-tight">
            Explore Nossas <span className="text-gold-400">Viagens</span>
          </h1>
          <p className="text-navy-300 text-base md:text-lg max-w-xl mx-auto">
            Destinos nacionais e internacionais com parcelamento em até 12x sem juros.
          </p>
        </div>
      </section>

      {/* Search bar */}
      <div className="relative z-30 -mt-8 container-custom px-4">
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-gray-100 flex flex-col sm:flex-row">
          {/* Destino */}
          <div className="flex-1 flex items-center gap-3 px-6 py-5 border-b sm:border-b-0 sm:border-r border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
              <Search size={15} className="text-navy-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Destino</p>
              <input
                className="w-full text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
                placeholder="Para onde você quer ir?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <X size={11} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* Quando */}
          <div className="relative flex-1 sm:border-r border-gray-100" ref={whenRef}>
            <button onClick={() => setShowWhenPicker(!showWhenPicker)}
              className="w-full flex items-center gap-3 px-6 py-5 text-left">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selectedDate ? "bg-gold-500/15" : "bg-navy-50"}`}>
                <Calendar size={15} className={selectedDate ? "text-gold-600" : "text-navy-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Quando</p>
                <p className={`text-sm font-medium truncate ${(selectedDate || selectedMonth) ? "text-navy-800" : "text-gray-400"}`}>
                  {selectedDate
                    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
                    : selectedMonth
                    ? `${MONTHS_PT[parseInt(selectedMonth.split("-")[1]) - 1]} ${selectedMonth.split("-")[0]}`
                    : "Selecionar data"}
                </p>
              </div>
              {(selectedDate || selectedMonth) ? (
                <button onClick={(e) => { e.stopPropagation(); setSelectedDate(""); setSelectedMonth(""); }}
                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
                  <X size={11} className="text-gray-500" />
                </button>
              ) : (
                <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${showWhenPicker ? "rotate-180" : ""}`} />
              )}
            </button>

            {showWhenPicker && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-gray-100 z-50 p-4 sm:left-0 sm:right-auto sm:w-80">
                <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                  <button onClick={() => setCalViewMode("datas")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${calViewMode === "datas" ? "bg-white text-navy-900 shadow-sm" : "text-gray-500"}`}>Datas</button>
                  <button onClick={() => setCalViewMode("meses")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${calViewMode === "meses" ? "bg-white text-navy-900 shadow-sm" : "text-gray-500"}`}>Meses</button>
                </div>

                {calViewMode === "datas" ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-navy-700 hover:bg-gray-100 transition-colors"><ChevronLeft size={16} /></button>
                      <span className="text-sm font-black text-navy-900 tracking-tight">{MONTHS_PT[calMonth.month]} {calMonth.year}</span>
                      <button onClick={() => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-navy-700 hover:bg-gray-100 transition-colors"><ChevronRight size={16} /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-1">
                      {WEEK_DAYS.map((d, i) => <div key={i} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-wider py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {getCalendarDays(calMonth.year, calMonth.month).map((day, i) => {
                        if (!day) return <div key={i} />;
                        const dateStr = toDateStr(calMonth.year, calMonth.month, day);
                        const count = datesByDate[dateStr] || 0;
                        const isSelected = selectedDate === dateStr;
                        const isPast = dateStr < today;
                        const hasTrips = count > 0 && !isPast;
                        return (
                          <button key={i} disabled={!hasTrips}
                            onClick={() => { setSelectedDate(isSelected ? "" : dateStr); setSelectedMonth(""); setShowWhenPicker(false); }}
                            className={`relative flex flex-col items-center justify-center rounded-lg aspect-square text-xs font-semibold transition-all duration-150 ${
                              isSelected ? "bg-navy-800 text-white shadow-sm" :
                              hasTrips ? "text-navy-800 hover:bg-navy-50 cursor-pointer" :
                              isPast ? "text-gray-200 cursor-default" : "text-gray-300 cursor-default"
                            }`}>
                            {day}
                            {hasTrips && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-gold-400" : "bg-gold-500"}`} />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 flex-shrink-0" />
                      <span className="text-xs text-gray-400">Dias com saídas disponíveis</span>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {nextMonths.map(({ key, label }) => {
                      const count = datesByMonth[key] || 0;
                      const isSelected = selectedMonth === key;
                      return (
                        <button key={key} disabled={count === 0}
                          onClick={() => { setSelectedMonth(isSelected ? "" : key); setSelectedDate(""); setShowWhenPicker(false); }}
                          className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${
                            isSelected ? "bg-navy-800 border-navy-800 text-white" :
                            count > 0 ? "border-gray-200 hover:border-navy-300 hover:bg-navy-50 text-navy-800" :
                            "border-gray-100 text-gray-300 cursor-default"
                          }`}>
                          <span className="text-xs font-bold leading-tight">{label}</span>
                          {count > 0 && <span className={`text-[10px] mt-0.5 ${isSelected ? "text-gold-300" : "text-gold-500"}`}>{count} saída{count > 1 ? "s" : ""}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {(selectedDate || selectedMonth) && (
                  <button onClick={() => { setSelectedDate(""); setSelectedMonth(""); }}
                    className="mt-3 w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-1">Limpar seleção</button>
                )}
              </div>
            )}
          </div>

          {/* Buscar */}
          <div className="flex items-center p-3">
            <button onClick={() => setShowWhenPicker(false)}
              className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-sm font-black tracking-wide">
              <Search size={15} /> Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 w-full container-custom py-8">
        {/* Sort + filter bar */}
        <div className="flex items-center mb-4">
          <div className="relative" ref={sortRef}>
            <button onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all whitespace-nowrap">
              <ChevronDown size={14} className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
              {sortLabel}
            </button>
            {showSortMenu && (
              <div className="absolute left-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between gap-3 ${sort === opt.value ? "bg-navy-50 text-navy-800 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                    {opt.label}
                    {sort === opt.value && <Check size={13} className="text-navy-700 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter chips */}
        {(selectedDate || selectedMonth) && (
          <div className="flex items-center gap-2 flex-wrap mb-4 pt-1">
            {selectedDate && (
              <span className="inline-flex items-center gap-1.5 bg-navy-50 border border-navy-100 text-navy-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <Calendar size={10} />
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                <button onClick={() => setSelectedDate("")}><X size={11} /></button>
              </span>
            )}
            {selectedMonth && (
              <span className="inline-flex items-center gap-1.5 bg-navy-50 border border-navy-100 text-navy-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <Calendar size={10} />
                {MONTHS_PT[parseInt(selectedMonth.split("-")[1]) - 1]} {selectedMonth.split("-")[0]}
                <button onClick={() => setSelectedMonth("")}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {/* Count */}
        {!loading && (
          <div className="flex items-center gap-3 py-2 mb-4 border-b border-gray-200">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-navy-800">{filtered.length}</span>{" "}
              {filtered.length !== 1 ? "roteiros" : "roteiro"} disponíve{filtered.length !== 1 ? "is" : "l"}
              {search && <span> para <strong>&ldquo;{search}&rdquo;</strong></span>}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">Limpar tudo</button>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
                <div className="h-44 bg-gray-200" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((tmpl) => (
              <TemplateCard key={tmpl.id} tmpl={tmpl} highlightDate={selectedDate} highlightMonth={selectedMonth} />
            ))}
          </div>
        )}
      </main>

      {/* CTA WhatsApp */}
      <section className="bg-navy-900 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl text-white mb-3">Não encontrou o que procura?</h2>
          <p className="text-navy-300 text-lg mb-8 max-w-xl mx-auto">Nossa equipe monta pacotes personalizados para você. Fale agora e receba uma proposta exclusiva!</p>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-emerald-500/30">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Falar com um consultor
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── Template Card ── */
function TemplateCard({ tmpl, highlightDate, highlightMonth }: {
  tmpl: PublicTemplate;
  highlightDate: string;
  highlightMonth: string;
}) {
  const discount = tmpl.original_price_from
    ? Math.round((1 - tmpl.price_from / tmpl.original_price_from) * 100)
    : null;

  // Sort dates: highlight matching ones first, then by date
  const sortedDates = [...tmpl.dates].sort((a, b) => {
    const aMatch = (highlightDate && a.departure_date.slice(0, 10) === highlightDate) ||
                   (highlightMonth && a.departure_date.slice(0, 7) === highlightMonth);
    const bMatch = (highlightDate && b.departure_date.slice(0, 10) === highlightDate) ||
                   (highlightMonth && b.departure_date.slice(0, 7) === highlightMonth);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
  });

  const shownDates = sortedDates.slice(0, 3);
  const extraDates = sortedDates.length - 3;

  return (
    <Link
      href={`/viagens/${tmpl.first_trip_id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border border-gray-100 hover:border-gold-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-44 flex-shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tmpl.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"}
          alt={tmpl.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          {tmpl.tag && (
            <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-xs font-bold px-2.5 py-1 rounded-full">
              <Star size={9} fill="currentColor" /> {tmpl.tag}
            </span>
          )}
          {discount && discount > 0 && (
            <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{discount}%</span>
          )}
        </div>

        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <h3 className="font-display font-black text-base text-white leading-tight drop-shadow">{tmpl.title}</h3>
          <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
            <MapPin size={10} className="flex-shrink-0" /> {tmpl.destination}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {tmpl.short_description && (
          <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">{tmpl.short_description}</p>
        )}

        {/* Includes preview */}
        {tmpl.includes.length > 0 && (
          <ul className="space-y-1 mb-3">
            {tmpl.includes.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-gray-600 text-xs">
                <Check size={11} className="text-emerald-500 flex-shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
        )}

        {/* Datas disponíveis */}
        <div className="mb-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Datas disponíveis</p>
          <div className="space-y-1">
            {shownDates.map((d) => {
              const isSoldOut = d.status === "sold_out";
              const isHighlighted = (highlightDate && d.departure_date.slice(0, 10) === highlightDate) ||
                                    (highlightMonth && d.departure_date.slice(0, 7) === highlightMonth);
              return (
                <div key={d.id} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                  isHighlighted ? "bg-gold-50 border border-gold-200" :
                  isSoldOut ? "bg-gray-50 opacity-60" : "bg-gray-50"
                }`}>
                  <span className={`font-semibold ${isSoldOut ? "text-gray-400" : "text-navy-800"}`}>
                    {fmtDate(d.departure_date)} → {fmtDate(d.return_date)}
                  </span>
                  {isSoldOut ? (
                    <span className="text-red-400 font-bold text-[10px]">Esgotado</span>
                  ) : (
                    <span className="font-bold text-gold-600">R$ {d.price_per_person.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                  )}
                </div>
              );
            })}
            {extraDates > 0 && (
              <p className="text-xs text-navy-500 font-semibold px-1">+{extraDates} data{extraDates > 1 ? "s" : ""} disponíve{extraDates > 1 ? "is" : "l"}</p>
            )}
          </div>
        </div>

        {/* Footer: price + CTA */}
        <div className="mt-auto flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            {tmpl.original_price_from && (
              <p className="text-xs text-gray-400 line-through leading-none mb-0.5">
                R$ {tmpl.original_price_from.toLocaleString("pt-BR")}
              </p>
            )}
            <p className="text-[10px] text-gray-400 leading-none">a partir de</p>
            <p className="font-display font-black text-xl text-navy-700 leading-tight">
              R$ {tmpl.price_from.toLocaleString("pt-BR")}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              {tmpl.max_installments}x de R${" "}
              {Math.ceil(tmpl.price_from / tmpl.max_installments).toLocaleString("pt-BR")} s/ juros
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-navy-800 text-white group-hover:bg-gold-500 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110">
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Empty State ── */
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
          <button onClick={onClear} className="btn-secondary py-2.5 px-6 text-sm">Limpar filtros</button>
        )}
        <a href={WA_URL} target="_blank" rel="noopener noreferrer"
          className="btn-primary py-2.5 px-6 text-sm inline-flex items-center gap-2">
          Falar no WhatsApp <ArrowRight size={15} />
        </a>
      </div>
    </div>
  );
}

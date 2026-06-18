"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogOut, MapPin, Calendar, ChevronRight, Search, MessageCircle,
  Menu, X, Users, Plane, CheckCircle2, ArrowRight,
} from "lucide-react";
import { getUser, logout, apiFetch } from "@/lib/api";
import { fmtBRL } from "@/lib/format";
import { BrandedLoader } from "@/components/BrandedLoader";

interface StoredUser { full_name: string; email: string; is_admin: boolean }
interface Booking {
  id: number; booking_code: string; trip_id: number; num_travelers: number;
  price_per_person: number; final_amount: number; status: string; created_at: string;
  notes?: string; trip_title?: string; trip_destination?: string;
  trip_departure_date?: string; trip_return_date?: string; trip_image_url?: string;
}

const WA_BASE = "https://wa.me/5541998348766?text=";
const WA_HELP = WA_BASE + encodeURIComponent("Olá! Preciso de ajuda com minha reserva.");
const PLACEHOLDER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80";

/* ─── Helpers ─── */
const fmtDate = (d: string) => { const [y, m, day] = d.slice(0, 10).split("-"); return `${day}/${m}/${y}`; };
const daysUntil = (d: string) => Math.ceil((new Date(d.slice(0, 10) + "T12:00:00").getTime() - new Date().setHours(12, 0, 0, 0)) / 86400000);
const sameDay = (a?: string, b?: string) => !!a && !!b && a.slice(0, 10) === b.slice(0, 10);
const pessoas = (n: number) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`;
const countdownLabel = (days: number) => days <= 0 ? "É hoje!" : days === 1 ? "É amanhã!" : `Faltam ${days} dias`;

function waMsg(b: Booking) {
  return WA_BASE + encodeURIComponent(`Olá! Quero acompanhar minha reserva *${b.booking_code}* — ${b.trip_title ?? "viagem"}.`);
}

/* ─── Hero: próxima viagem ─── */
function HeroNextTrip({ b }: { b: Booking }) {
  const days = b.trip_departure_date ? daysUntil(b.trip_departure_date) : null;
  const roundtrip = sameDay(b.trip_departure_date, b.trip_return_date);
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-card text-white min-h-[260px] flex flex-col justify-end">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.trip_image_url || PLACEHOLDER} alt={b.trip_title ?? ""} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900/95 via-navy-900/55 to-navy-900/15" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full"><CheckCircle2 size={11} /> Confirmada</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Sua próxima viagem</span>
        </div>
        <h2 className="font-display font-black text-2xl sm:text-3xl leading-tight drop-shadow">{b.trip_title ?? "Viagem"}</h2>
        {b.trip_destination && <p className="flex items-center gap-1.5 text-white/80 text-sm mt-1"><MapPin size={13} /> {b.trip_destination}</p>}

        <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
          <div className="flex items-center gap-4">
            {days !== null && (
              <div>
                <p className="font-display font-black text-3xl leading-none text-gold-300">{days <= 0 ? "🎉" : days}</p>
                <p className="text-xs text-white/80 mt-0.5">{countdownLabel(days)}</p>
              </div>
            )}
            <div className="border-l border-white/20 pl-4">
              <p className="text-[10px] text-white/60 uppercase tracking-wide font-semibold">{roundtrip ? "Data" : "Saída"}</p>
              <p className="text-sm font-bold">{b.trip_departure_date ? fmtDate(b.trip_departure_date) : "—"}{roundtrip ? " · bate e volta" : ""}</p>
              {!roundtrip && b.trip_return_date && <p className="text-xs text-white/70 mt-0.5">Volta {fmtDate(b.trip_return_date)}</p>}
            </div>
          </div>
          <Link href={`/viagens/${b.trip_id}`} className="inline-flex items-center gap-1.5 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-gold">
            Ver viagem <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Card de reserva (seções) ─── */
type Variant = "pending" | "interesse" | "confirmed" | "past";
function TripCard({ b, variant }: { b: Booking; variant: Variant }) {
  const days = b.trip_departure_date ? daysUntil(b.trip_departure_date) : null;
  const roundtrip = sameDay(b.trip_departure_date, b.trip_return_date);
  const accent = variant === "pending" ? "border-l-blue-400" : variant === "interesse" ? "border-l-amber-400" : variant === "past" ? "border-l-gray-300" : "border-l-emerald-400";

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-100 border-l-4 ${accent} bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-navy-100">
            {b.trip_image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img loading="lazy" decoding="async" src={b.trip_image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Plane size={20} className="text-navy-300" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-navy-800 text-sm sm:text-base leading-tight line-clamp-2">{b.trip_title ?? "Viagem"}</p>
            {b.trip_destination && <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><MapPin size={10} /> {b.trip_destination}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1"><Calendar size={11} className="text-gold-500" />
                {b.trip_departure_date ? (roundtrip ? `${fmtDate(b.trip_departure_date)} · bate e volta` : `${fmtDate(b.trip_departure_date)}${b.trip_return_date ? ` → ${fmtDate(b.trip_return_date)}` : ""}`) : "Data a definir"}
              </span>
              <span className="flex items-center gap-1"><Users size={11} className="text-gold-500" /> {pessoas(b.num_travelers)}</span>
              {b.status !== "interesse" && b.final_amount > 0 && <span className="font-bold text-navy-700">R$ {fmtBRL(b.final_amount)}</span>}
            </div>
          </div>
        </div>

        {/* faixa de estado/ação */}
        {variant === "pending" && (
          <div className="mt-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700 mb-2.5">
              {days !== null && days >= 0 ? <>Garanta sua vaga — <span className="font-bold">{days === 0 ? "embarque é hoje!" : days === 1 ? "falta 1 dia" : `faltam ${days} dias`}</span></> : "Conclua o pagamento para confirmar sua vaga."}
            </div>
            <Link href={`/reservar/${b.booking_code}`} className="flex items-center justify-center gap-2 w-full bg-navy-700 hover:bg-navy-600 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
              Continuar pagamento <ArrowRight size={14} />
            </Link>
          </div>
        )}
        {variant === "interesse" && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Nossa equipe vai entrar em contato pra confirmar os detalhes.</p>
        )}
        {variant === "past" && (
          <p className="mt-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">Viagem realizada — esperamos que tenha sido incrível! ✨</p>
        )}

        {/* rodapé */}
        <div className="flex items-center justify-between gap-2 flex-wrap mt-3 pt-3 border-t border-gray-50">
          <span className="text-[11px] font-mono text-gray-400">{b.booking_code}</span>
          <div className="flex items-center gap-2">
            {(variant === "pending" || variant === "interesse") && (
              <a href={waMsg(b)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors">
                <MessageCircle size={12} /> WhatsApp
              </a>
            )}
            <Link href={`/viagens/${b.trip_id}`} className="flex items-center gap-1 text-xs font-semibold text-navy-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-navy-50 hover:border-navy-200 transition-colors">
              Ver viagem <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ dot, children, sub }: { dot: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display font-black text-navy-800 text-base flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dot}`} /> {children}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5 ml-4">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { window.location.href = "/login"; return; }
    if (u.is_admin) { window.location.href = "/admin"; return; }
    setUser(u);
    apiFetch("/bookings/my")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBookings(data.filter((b: Booking) => b.status !== "cancelled" && b.status !== "refunded")); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;
  if (loading) return <BrandedLoader label="Carregando seu painel..." />;

  const firstName = user.full_name.split(" ")[0];
  const initial = user.full_name[0]?.toUpperCase() ?? "?";

  /* agrupamento por ação */
  const dleft = (b: Booking) => b.trip_departure_date ? daysUntil(b.trip_departure_date) : 99999;
  const upcomingConfirmed = bookings.filter(b => b.status === "confirmed" && dleft(b) >= 0).sort((a, b) => dleft(a) - dleft(b));
  const hero = upcomingConfirmed[0];
  const minhas = upcomingConfirmed.slice(1);
  const pending = bookings.filter(b => b.status === "pending").sort((a, b) => dleft(a) - dleft(b));
  const interesse = bookings.filter(b => b.status === "interesse");
  const realizadas = bookings.filter(b => b.status === "completed" || (b.status === "confirmed" && dleft(b) < 0));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-9 h-9"><Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" priority /></div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-navy-900 text-base tracking-tight">AJS</span>
              <span className="text-gold-500 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none">Turismo</span>
            </div>
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 text-gray-700 hover:text-navy-800 transition-colors py-1.5 px-2 rounded-xl hover:bg-gray-100">
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm">{initial}</div>
              <span className="text-sm font-semibold hidden sm:inline">{firstName}</span>
              {showMenu ? <X size={14} className="text-gray-400" /> : <Menu size={14} className="text-gray-400" />}
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 w-56 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm flex-shrink-0">{initial}</div>
                  <div className="min-w-0"><p className="text-xs font-bold text-navy-800 truncate">{user.full_name}</p><p className="text-xs text-gray-400 truncate">{user.email}</p></div>
                </div>
                <div className="py-1">
                  <Link href="/viagens" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Search size={14} className="text-gray-400" /> Explorar viagens</Link>
                  <a href={WA_HELP} target="_blank" rel="noopener noreferrer" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><MessageCircle size={14} className="text-emerald-500" /> Falar no WhatsApp</a>
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button onClick={() => { setShowMenu(false); logout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"><LogOut size={14} /> Sair da conta</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6 pb-12">

        {/* Saudação */}
        <div>
          <h1 className="font-display font-black text-navy-900 text-xl">Olá, {firstName}! 👋</h1>
          <p className="text-gray-400 text-sm mt-0.5">{bookings.length === 0 ? "Pronto pra primeira viagem?" : "Aqui estão suas viagens com a AJS."}</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 px-6">
            <div className="w-16 h-16 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-4"><Plane size={28} className="text-navy-300" /></div>
            <p className="font-display font-black text-navy-800 mb-1">Nenhuma reserva ainda</p>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Explore nossos roteiros e planeje sua próxima aventura!</p>
            <Link href="/viagens" className="inline-flex items-center gap-2 bg-navy-800 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-navy-700 transition-colors">Ver viagens disponíveis <ChevronRight size={15} /></Link>
          </div>
        ) : (
          <>
            {/* Herói: próxima viagem */}
            {hero && <HeroNextTrip b={hero} />}

            {/* Precisa de você */}
            {pending.length > 0 && (
              <section>
                <SectionTitle dot="bg-blue-400" sub="Conclua o pagamento para garantir sua vaga.">Precisa de você</SectionTitle>
                <div className="space-y-3">{pending.map(b => <TripCard key={b.id} b={b} variant="pending" />)}</div>
              </section>
            )}

            {/* Em análise */}
            {interesse.length > 0 && (
              <section>
                <SectionTitle dot="bg-amber-400" sub="Reservas em análise — nossa equipe entra em contato.">Em análise</SectionTitle>
                <div className="space-y-3">{interesse.map(b => <TripCard key={b.id} b={b} variant="interesse" />)}</div>
              </section>
            )}

            {/* Minhas viagens (outras confirmadas) */}
            {minhas.length > 0 && (
              <section>
                <SectionTitle dot="bg-emerald-500">Minhas próximas viagens</SectionTitle>
                <div className="space-y-3">{minhas.map(b => <TripCard key={b.id} b={b} variant="confirmed" />)}</div>
              </section>
            )}

            {/* Realizadas */}
            {realizadas.length > 0 && (
              <section>
                <SectionTitle dot="bg-gray-300">Já realizadas</SectionTitle>
                <div className="space-y-3">{realizadas.map(b => <TripCard key={b.id} b={b} variant="past" />)}</div>
              </section>
            )}
          </>
        )}

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/viagens" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm hover:shadow-md hover:border-navy-200 transition-shadow group">
            <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center group-hover:bg-navy-100 transition-colors"><Search size={18} className="text-navy-600" /></div>
            <span className="text-xs font-bold text-navy-700">Explorar viagens</span>
          </Link>
          <a href={WA_HELP} target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm hover:shadow-md hover:border-emerald-200 transition-shadow group">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors"><MessageCircle size={18} className="text-emerald-600" /></div>
            <span className="text-xs font-bold text-emerald-700">Suporte WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

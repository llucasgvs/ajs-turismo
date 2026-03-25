"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogOut, MapPin, Calendar, ChevronRight, Search, MessageCircle,
  Menu, X, Users, Clock, Plane, Star, AlertCircle, CheckCircle2,
  RotateCcw, ArrowRight,
} from "lucide-react";
import { getUser, logout, apiFetch } from "@/lib/api";

interface StoredUser {
  full_name: string;
  email: string;
  is_admin: boolean;
}

interface Booking {
  id: number;
  booking_code: string;
  trip_id: number;
  num_travelers: number;
  price_per_person: number;
  final_amount: number;
  status: string;
  created_at: string;
  notes?: string;
  trip_title?: string;
  trip_destination?: string;
  trip_departure_date?: string;
  trip_return_date?: string;
  trip_image_url?: string;
}

const WA_BASE = "https://wa.me/5541998348766?text=";
const WA_HELP = WA_BASE + encodeURIComponent("Olá! Preciso de ajuda com minha reserva.");

type StatusCfg = {
  label: string;
  bg: string;
  text: string;
  icon: React.ElementType;
  bar: string;
  desc: string;
};

const STATUS: Record<string, StatusCfg> = {
  interesse:  { label: "Aguardando",  bg: "bg-amber-50",   text: "text-amber-700",   icon: Clock,         bar: "bg-amber-400",   desc: "Aguardando confirmação da equipe AJS" },
  pending:    { label: "Pendente",    bg: "bg-blue-50",    text: "text-blue-700",    icon: RotateCcw,     bar: "bg-blue-400",    desc: "Documentação em análise" },
  confirmed:  { label: "Confirmado",  bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2,  bar: "bg-emerald-500", desc: "Reserva confirmada — boa viagem!" },
  completed:  { label: "Realizado",   bg: "bg-gray-50",    text: "text-gray-500",    icon: Star,          bar: "bg-gray-300",    desc: "Viagem concluída — esperamos que tenha curtido!" },
};

function fmtDate(d: string) {
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function daysUntil(d: string) {
  const diff = new Date(d.slice(0, 10) + "T12:00:00").getTime() - new Date().setHours(12, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function BookingCard({ b }: { b: Booking }) {
  const cfg = STATUS[b.status] ?? { label: b.status, bg: "bg-gray-50", text: "text-gray-600", icon: AlertCircle, bar: "bg-gray-300", desc: "" };
  const Icon = cfg.icon;
  const dep = b.trip_departure_date ? fmtDate(b.trip_departure_date) : null;
  const ret = b.trip_return_date ? fmtDate(b.trip_return_date) : null;
  const days = b.trip_departure_date ? daysUntil(b.trip_departure_date) : null;
  const isUpcoming = days !== null && days > 0 && (b.status === "confirmed" || b.status === "pending");
  const isPast = days !== null && days < 0;
  const isActive = b.status === "interesse" || b.status === "pending";
  const waMsg = WA_BASE + encodeURIComponent(
    `Olá! Tenho interesse em acompanhar minha reserva *${b.booking_code}* — ${b.trip_title ?? "viagem"}.`
  );

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md ${cfg.bg}`}>
      {/* Status bar top */}
      <div className={`h-1 w-full ${cfg.bar}`} />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Image or placeholder */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-navy-100">
            {b.trip_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.trip_image_url} alt={b.trip_title ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Plane size={22} className="text-navy-300" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display font-black text-navy-800 text-sm sm:text-base leading-tight line-clamp-2">
                {b.trip_title ?? "Viagem"}
              </p>
              <span className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border border-current/20`}>
                <Icon size={10} />
                {cfg.label}
              </span>
            </div>
            {b.trip_destination && (
              <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <MapPin size={10} className="flex-shrink-0" />
                {b.trip_destination}
              </p>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {dep && (
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Saída</p>
              <p className="text-xs font-bold text-navy-800 flex items-center gap-1">
                <Calendar size={11} className="text-gold-500 flex-shrink-0" />
                {dep}
              </p>
            </div>
          )}
          {ret && (
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Retorno</p>
              <p className="text-xs font-bold text-navy-800 flex items-center gap-1">
                <Calendar size={11} className="text-gold-500 flex-shrink-0" />
                {ret}
              </p>
            </div>
          )}
          <div className="bg-white/70 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Viajantes</p>
            <p className="text-xs font-bold text-navy-800 flex items-center gap-1">
              <Users size={11} className="text-gold-500 flex-shrink-0" />
              {b.num_travelers} pessoa{b.num_travelers !== 1 ? "s" : ""}
            </p>
          </div>
          {b.status !== "interesse" && b.final_amount > 0 && (
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Total</p>
              <p className="text-xs font-bold text-navy-800">
                R$ {b.final_amount.toLocaleString("pt-BR")}
              </p>
            </div>
          )}
        </div>

        {/* Countdown for upcoming trips */}
        {isUpcoming && days !== null && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
            <span className="text-lg font-black text-emerald-600 leading-none">{days}</span>
            <p className="text-xs text-emerald-700 font-semibold leading-tight">
              {days === 1 ? "dia para embarcar!" : "dias para embarcar!"}
            </p>
          </div>
        )}
        {isPast && b.status === "confirmed" && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-gray-500 font-semibold">Viagem realizada — esperamos que tenha sido incrível!</p>
          </div>
        )}

        {/* Status description */}
        {cfg.desc && (
          <p className={`text-xs ${cfg.text} opacity-80 mb-3`}>{cfg.desc}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-gray-400">{b.booking_code}</span>
          <div className="flex items-center gap-2">
            {isActive && (
              <a href={waMsg} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors">
                <MessageCircle size={12} />
                WhatsApp
              </a>
            )}
            <Link href={`/viagens/${b.trip_id}`}
              className="flex items-center gap-1 text-xs font-semibold text-navy-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-navy-50 hover:border-navy-200 transition-colors">
              Ver viagem <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
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
      .then((data) => {
        if (!Array.isArray(data)) return;
        const order: Record<string, number> = { confirmed: 0, pending: 1, interesse: 2, completed: 3 };
        setBookings(
          data
            .filter((b: Booking) => b.status !== "cancelled")
            .sort((a: Booking, b: Booking) => {
              const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
              if (diff !== 0) return diff;
              return (a.trip_departure_date ?? "").localeCompare(b.trip_departure_date ?? "");
            })
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const firstName = user.full_name.split(" ")[0];
  const initial = user.full_name[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-9 h-9">
              <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" priority />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-navy-900 text-base tracking-tight">AJS</span>
              <span className="text-gold-500 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none">Turismo</span>
            </div>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 text-gray-700 hover:text-navy-800 transition-colors py-1.5 px-2 rounded-xl hover:bg-gray-100"
            >
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm">
                {initial}
              </div>
              <span className="text-sm font-semibold hidden sm:inline">{firstName}</span>
              {showMenu ? <X size={14} className="text-gray-400" /> : <Menu size={14} className="text-gray-400" />}
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 w-56 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm flex-shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy-800 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="py-1">
                  <Link href="/viagens" onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Search size={14} className="text-gray-400" /> Explorar viagens
                  </Link>
                  <a href={WA_HELP} target="_blank" rel="noopener noreferrer" onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <MessageCircle size={14} className="text-emerald-500" /> Falar no WhatsApp
                  </a>
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button onClick={() => { setShowMenu(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut size={14} /> Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5 pb-12">

        {/* ── Welcome ── */}
        <div className="bg-navy-800 rounded-2xl p-5 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-display font-black text-2xl flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-navy-300 text-xs">Bem-vindo de volta</p>
            <p className="font-display font-black text-lg leading-tight truncate">{user.full_name}</p>
          </div>
        </div>

        {/* ── Booking sections ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 px-6">
            <div className="w-16 h-16 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane size={28} className="text-navy-300" />
            </div>
            <p className="font-display font-black text-navy-800 mb-1">Nenhuma reserva ainda</p>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Explore nossos roteiros e planeje sua próxima aventura!
            </p>
            <Link href="/viagens"
              className="inline-flex items-center gap-2 bg-navy-800 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-navy-700 transition-colors">
              Ver viagens disponíveis <ChevronRight size={15} />
            </Link>
          </div>
        ) : (() => {
          const confirmed = bookings.filter(b => b.status === "confirmed");
          const pending   = bookings.filter(b => b.status === "pending" || b.status === "interesse");
          const completed = bookings.filter(b => b.status === "completed");
          return (
            <div className="space-y-6">

              {/* Confirmadas */}
              {confirmed.length > 0 && (
                <section>
                  <h2 className="font-display font-black text-navy-800 text-base mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    {confirmed.length === 1 ? "Sua próxima viagem" : "Suas próximas viagens"}
                  </h2>
                  <div className="space-y-3">
                    {confirmed.map(b => <BookingCard key={b.id} b={b} />)}
                  </div>
                </section>
              )}

              {/* Aguardando */}
              {pending.length > 0 && (
                <section>
                  <h2 className="font-display font-black text-navy-800 text-base mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    Aguardando confirmação
                  </h2>
                  <p className="text-xs text-gray-400 mb-3">Reservas em análise — nossa equipe entrará em contato em breve.</p>
                  <div className="space-y-3">
                    {pending.map(b => <BookingCard key={b.id} b={b} />)}
                  </div>
                </section>
              )}

              {/* Realizadas */}
              {completed.length > 0 && (
                <section>
                  <h2 className="font-display font-black text-navy-800 text-base mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                    Viagens realizadas
                  </h2>
                  <div className="space-y-3">
                    {completed.map(b => <BookingCard key={b.id} b={b} />)}
                  </div>
                </section>
              )}

            </div>
          );
        })()}

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/viagens"
            className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm hover:shadow-md hover:border-navy-200 transition-all group">
            <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center group-hover:bg-navy-100 transition-colors">
              <Search size={18} className="text-navy-600" />
            </div>
            <span className="text-xs font-bold text-navy-700">Explorar viagens</span>
          </Link>
          <a href={WA_HELP} target="_blank" rel="noopener noreferrer"
            className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <MessageCircle size={18} className="text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-emerald-700">Suporte WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  );
}

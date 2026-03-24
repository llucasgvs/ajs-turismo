"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, MapPin, Calendar, ChevronRight, Search, MessageCircle, Menu, X } from "lucide-react";
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
  final_amount: number;
  status: string;
  created_at: string;
  trip_title?: string;
  trip_destination?: string;
  trip_departure_date?: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; border: string }> = {
  interesse:  { label: "Interesse",  color: "bg-amber-100 text-amber-700",    border: "border-l-amber-400" },
  pending:    { label: "Pendente",   color: "bg-blue-100 text-blue-700",      border: "border-l-blue-400" },
  confirmed:  { label: "Confirmado", color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400" },
  cancelled:  { label: "Cancelado",  color: "bg-red-100 text-red-700",        border: "border-l-red-400" },
  completed:  { label: "Realizado",  color: "bg-gray-100 text-gray-600",      border: "border-l-gray-300" },
};

const WA_URL = "https://wa.me/5541998348766?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20minha%20reserva.";

export default function Dashboard() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { window.location.href = "/login"; return; }
    if (u.is_admin) { window.location.href = "/admin"; return; }
    setUser(u);

    apiFetch("/bookings/my")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBookings(data); })
      .catch(() => {});
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
    <div className="min-h-screen bg-gray-50">
      {/* Header — mesmo padrão da Navbar */}
      <header className="bg-navy-900 px-4 md:px-6 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" priority />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-white text-xl tracking-tight">AJS</span>
              <span className="text-gold-400 text-xs font-semibold tracking-[0.2em] uppercase">Turismo</span>
            </div>
          </Link>

          {/* Menu dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2.5 text-white/80 hover:text-white transition-colors py-1.5 px-2 rounded-lg hover:bg-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm flex-shrink-0">
                {initial}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{firstName}</span>
              {showMenu ? <X size={15} className="text-white/60" /> : <Menu size={15} className="text-white/60" />}
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 w-60 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm flex-shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy-800 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1.5">
                  <Link
                    href="/viagens"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Search size={15} className="text-gray-400 flex-shrink-0" />
                    Explorar viagens
                  </Link>
                  <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle size={15} className="text-green-500 flex-shrink-0" />
                    Falar no WhatsApp
                  </a>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 py-1.5">
                  <button
                    onClick={() => { setShowMenu(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} className="flex-shrink-0" />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        {/* Welcome card */}
        <div className="bg-navy-800 rounded-2xl p-5 md:p-6 text-white flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-display font-black text-2xl flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-navy-300 text-sm">Bem-vindo de volta,</p>
            <p className="text-lg md:text-xl font-display font-black truncate">{user.full_name}</p>
            <p className="text-navy-400 text-xs mt-0.5 truncate">{user.email}</p>
          </div>
        </div>

        {/* Bookings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-display font-black text-navy-800">Minhas Reservas</h2>
            {bookings.length > 0 && (
              <span className="text-xs text-gray-400">{bookings.length} reserva{bookings.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={28} className="text-navy-300" />
              </div>
              <p className="text-gray-600 font-bold mb-1">Nenhuma reserva ainda</p>
              <p className="text-gray-400 text-sm mb-6">
                Explore nossos pacotes e planeje sua próxima aventura!
              </p>
              <Link href="/viagens" className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
                Ver Viagens Disponíveis
                <ChevronRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="p-4 md:p-5 flex flex-col gap-3">
              {bookings.map((b) => {
                const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
                const departureDate = (() => {
                  if (!b.trip_departure_date) return null;
                  const d = new Date(b.trip_departure_date);
                  if (isNaN(d.getTime())) return null;
                  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
                })();
                const isInteresse = b.status === "interesse";
                return (
                  <div key={b.id} className={`rounded-xl border border-gray-100 border-l-4 ${st.border} bg-gray-50 p-4 transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-y-0.5 cursor-default`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-bold text-navy-800 text-sm truncate">
                          {b.trip_title ?? "Viagem"}
                        </p>
                        {b.trip_destination && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            {b.trip_destination}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span className="font-mono text-navy-400">{b.booking_code}</span>
                      {departureDate && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {departureDate}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span>{b.num_travelers} pessoa{b.num_travelers !== 1 ? "s" : ""}</span>
                      {!isInteresse && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-navy-700">R$ {b.final_amount.toLocaleString("pt-BR")}</span>
                        </>
                      )}
                    </div>

                    {isInteresse && (
                      <p className="mt-2 text-xs text-amber-600">
                        Aguardando confirmação pela equipe AJS
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

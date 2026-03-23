"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, User, MapPin } from "lucide-react";
import { getUser, logout, apiFetch } from "@/lib/api";

interface StoredUser {
  full_name: string;
  email: string;
  is_admin: boolean;
}

export default function Dashboard() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <Image src="/logo2.jpeg" alt="AJS" fill className="object-contain" />
            </div>
            <span className="font-display font-black text-navy-700 text-lg">AJS Turismo</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-navy-800 rounded-2xl p-6 text-white mb-8 flex items-center gap-4">
          <div className="w-14 h-14 bg-navy-700 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-gold-400" />
          </div>
          <div>
            <p className="text-navy-300 text-sm">Bem-vindo de volta,</p>
            <p className="text-xl font-display font-black">{user.full_name}</p>
            <p className="text-navy-400 text-xs mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-navy-800 mb-6">Minhas Reservas</h2>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium mb-2">Nenhuma reserva ainda</p>
              <p className="text-gray-400 text-sm mb-6">
                Explore nossos pacotes e planeje sua próxima aventura!
              </p>
              <Link href="/" className="btn-primary px-6 py-2.5 text-sm inline-block">
                Ver Pacotes Disponíveis
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <p className="font-medium text-navy-800">{String(b.booking_code)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

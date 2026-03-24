"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, LogOut, ChevronRight, ClipboardList, Menu, X } from "lucide-react";
import { getUser, logout } from "@/lib/api";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/viagens", label: "Viagens", icon: Map },
  { href: "/admin/reservas", label: "Reservas", icon: ClipboardList },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [userName, setUserName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const user = getUser();
    if (!user || !user.is_admin) {
      window.location.href = "/login";
    } else {
      setUserName(user.full_name);
      setChecking(false);
    }
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-navy-700 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0">
            <Image src="/icon_ajs.png" alt="AJS" fill className="object-contain rounded-lg" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">AJS Turismo</p>
            <p className="text-navy-400 text-xs">Painel Admin</p>
          </div>
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-navy-400 hover:text-white p-1"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-gold-500 text-navy-900"
                  : "text-navy-300 hover:bg-navy-800 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={13} />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-navy-700">
        <p className="text-navy-400 text-xs px-3 mb-2 truncate">{userName}</p>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-400 hover:text-red-400 hover:bg-navy-800 w-full transition-colors"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-60 bg-navy-900 flex-col fixed top-0 left-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar (drawer) ── */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-64 bg-navy-900 flex flex-col z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 min-w-0 lg:ml-60 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-navy-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
              <Image src="/icon_ajs.png" alt="AJS" fill className="object-contain" />
            </div>
            <span className="font-display font-black text-navy-800 text-sm">AJS Admin</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

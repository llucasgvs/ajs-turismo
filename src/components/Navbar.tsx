"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, MessageCircle, LayoutDashboard, User } from "lucide-react";
import { getUser } from "@/lib/api";
import type { StoredUser } from "@/lib/api";
import { useLoading } from "@/components/LoadingProvider";

const WA_URL = "https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20gostaria%20de%20saber%20mais%20sobre%20os%20pacotes%20de%20viagem.";

const navLinks = [
  { label: "Viagens", href: "/viagens" },
  { label: "Como Funciona", href: "/#como-funciona" },
  { label: "Depoimentos", href: "/#depoimentos" },
  { label: "Contato", href: "/#contato" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const { show } = useLoading();

  useEffect(() => {
    setUser(getUser());
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-navy-900 shadow-lg py-2"
            : "bg-gradient-to-b from-black/50 to-transparent py-4"
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between">
            {/* Logo + número */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative w-10 h-10 md:w-12 md:h-12">
                  <Image
                    src="/icon_ajs.png"
                    alt="AJS Turismo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-display font-black text-white text-xl tracking-tight">AJS</span>
                  <span className="text-gold-400 text-xs font-semibold tracking-[0.2em] uppercase">Turismo</span>
                </div>
              </Link>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-1.5 text-white/70 hover:text-gold-400 transition-colors text-xs border-l border-white/20 pl-4"
              >
                <MessageCircle size={13} />
                <span>(41) 99834-8766</span>
              </a>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) =>
                link.href.startsWith("#") ? (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href)}
                    className="text-white/90 hover:text-gold-400 font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 text-sm"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-white/90 hover:text-gold-400 font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    href={user.is_admin ? "/admin" : "/dashboard"}
                    onClick={show}
                    className="flex items-center gap-2 text-white/90 hover:text-gold-400 transition-colors text-sm font-medium"
                  >
                    <div className="w-7 h-7 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-xs">
                      {user.full_name?.[0]?.toUpperCase() ?? <User size={12} />}
                    </div>
                    <span>{user.full_name?.split(" ")[0]}</span>
                  </Link>
                  <Link
                    href={user.is_admin ? "/admin/reservas" : "/dashboard"}
                    onClick={show}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {user.is_admin ? "Reservas" : "Minhas Reservas"}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={show} className="btn-secondary py-2 px-4 text-sm">
                    Entrar
                  </Link>
                  <Link href="/cadastro" onClick={show} className="btn-primary py-2 px-4 text-sm">
                    Criar conta
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden transition-all duration-300 overflow-hidden ${
            isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-navy-900 border-t border-white/10 py-4">
            <div className="container-custom flex flex-col gap-1">
              {navLinks.map((link) =>
                link.href.startsWith("#") ? (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href)}
                    className="text-white/90 hover:text-gold-400 font-medium py-3 px-4 rounded-lg hover:bg-white/5 transition-all text-left text-base"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-white/90 hover:text-gold-400 font-medium py-3 px-4 rounded-lg hover:bg-white/5 transition-all text-left text-base"
                  >
                    {link.label}
                  </Link>
                )
              )}
              <div className="border-t border-white/10 mt-2 pt-4 flex flex-col gap-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm">
                        {user.full_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-white/90">{user.full_name?.split(" ")[0]}</span>
                    </div>
                    <Link
                      href={user.is_admin ? "/admin/reservas" : "/dashboard"}
                      onClick={() => { setIsOpen(false); show(); }}
                      className="btn-primary text-center mx-0"
                    >
                      {user.is_admin ? "Reservas" : "Minhas Reservas"}
                    </Link>
                    {user.is_admin && (
                      <Link href="/admin" onClick={() => { setIsOpen(false); show(); }} className="btn-secondary text-center mx-0 flex items-center justify-center gap-2">
                        <LayoutDashboard size={15} />
                        Painel Admin
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => { setIsOpen(false); show(); }} className="btn-secondary text-center mx-0">
                      Entrar
                    </Link>
                    <Link href="/cadastro" onClick={() => { setIsOpen(false); show(); }} className="btn-primary text-center mx-0">
                      Criar conta gratuita
                    </Link>
                  </>
                )}
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-white/40 text-xs pt-1"
                >
                  <MessageCircle size={12} />
                  <span>(41) 99834-8766</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Phone } from "lucide-react";

const navLinks = [
  { label: "Destinos", href: "#destinos" },
  { label: "Pacotes", href: "#pacotes" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "Contato", href: "#contato" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-navy-700/98 backdrop-blur-md shadow-lg py-2"
            : "bg-transparent py-4"
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <div className="relative w-10 h-10 md:w-12 md:h-12">
                <Image
                  src="/logo2.jpeg"
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

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-white/80 hover:text-gold-400 font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 text-sm"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <a
                href="tel:+5500000000000"
                className="flex items-center gap-2 text-white/80 hover:text-gold-400 transition-colors text-sm"
              >
                <Phone size={15} />
                <span>(00) 00000-0000</span>
              </a>
              <Link href="/login" className="btn-secondary py-2 px-4 text-sm">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary py-2 px-4 text-sm">
                Criar conta
              </Link>
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
          <div className="bg-navy-700/98 backdrop-blur-md border-t border-white/10 py-4">
            <div className="container-custom flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-white/80 hover:text-gold-400 font-medium py-3 px-4 rounded-lg hover:bg-white/5 transition-all text-left text-base"
                >
                  {link.label}
                </button>
              ))}
              <div className="border-t border-white/10 mt-2 pt-4 flex flex-col gap-3">
                <a
                  href="tel:+5500000000000"
                  className="flex items-center gap-2 text-white/80 px-4 text-sm"
                >
                  <Phone size={15} />
                  <span>(00) 00000-0000</span>
                </a>
                <Link href="/login" className="btn-secondary text-center mx-0">
                  Entrar
                </Link>
                <Link href="/cadastro" className="btn-primary text-center mx-0">
                  Criar conta gratuita
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Home, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Página não encontrada — AJS Turismo",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <MapPin size={40} className="text-navy-400" />
      </div>

      <p className="text-gold-500 font-bold text-sm uppercase tracking-widest mb-2">Erro 404</p>
      <h1 className="font-display font-black text-4xl text-navy-800 mb-3">
        Página não encontrada
      </h1>
      <p className="text-gray-500 text-lg mb-8 max-w-sm">
        Essa rota não existe. Talvez o link esteja desatualizado ou você digitou o endereço errado.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          <Home size={16} />
          Ir para a home
        </Link>
        <Link
          href="/viagens"
          className="flex items-center gap-2 border border-navy-200 text-navy-700 hover:bg-navy-50 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Ver viagens
          <ArrowRight size={16} />
        </Link>
      </div>

      <a
        href="https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20preciso%20de%20ajuda."
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 text-sm text-gray-400 hover:text-emerald-600 transition-colors"
      >
        Precisa de ajuda? Fale no WhatsApp →
      </a>
    </div>
  );
}

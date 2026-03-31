"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={40} className="text-red-400" />
      </div>

      <p className="text-gold-500 font-bold text-sm uppercase tracking-widest mb-2">Algo deu errado</p>
      <h1 className="font-display font-black text-4xl text-navy-800 mb-3">
        Erro inesperado
      </h1>
      <p className="text-gray-500 text-lg mb-8 max-w-sm">
        Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          <RotateCcw size={16} />
          Tentar novamente
        </button>
        <a
          href="/"
          className="flex items-center gap-2 border border-navy-200 text-navy-700 hover:bg-navy-50 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          <Home size={16} />
          Ir para a home
        </a>
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

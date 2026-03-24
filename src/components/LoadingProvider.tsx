"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

interface LoadingContextType {
  show: () => void;
  hide: () => void;
}

const LoadingContext = createContext<LoadingContextType>({ show: () => {}, hide: () => {} });

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Esconde automaticamente quando a navegação completa
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  const show = useCallback(() => setLoading(true), []);
  const hide = useCallback(() => setLoading(false), []);

  return (
    <LoadingContext.Provider value={{ show, hide }}>
      {children}
      {loading && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(15, 23, 60, 0.55)", backdropFilter: "blur(4px)" }}
        >
          <div className="flex flex-col items-center gap-5">
            {/* Logo animada */}
            <div className="relative w-16 h-16 animate-pulse">
              <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" />
            </div>

            {/* Spinner */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gold-400 animate-spin" />
            </div>

            {/* Texto */}
            <p className="text-white/80 text-sm font-medium tracking-wide">Carregando...</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

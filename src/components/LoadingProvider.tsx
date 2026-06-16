"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { BrandedLoader } from "@/components/BrandedLoader";

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
      {loading && <BrandedLoader />}
    </LoadingContext.Provider>
  );
}

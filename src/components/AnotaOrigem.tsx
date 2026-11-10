"use client";

import { useEffect } from "react";
import { anotarVisita } from "@/lib/origem";

/** Anota de onde o visitante veio, uma vez por carregamento do site.
 *  Não desenha nada. Ver src/lib/origem.ts. */
export function AnotaOrigem() {
  useEffect(() => {
    anotarVisita();
  }, []);
  return null;
}

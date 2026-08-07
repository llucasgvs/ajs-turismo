"use client";

import { useEffect } from "react";

/**
 * Fecha com a tecla Esc e trava a rolagem do fundo enquanto o modal está aberto.
 *
 * Os dois nasceram do mesmo relato: no painel, abrir uma reserva e não conseguir
 * sair sem voltar a página. No computador falta o Esc, que é o reflexo de quem
 * usa teclado. No celular, o fundo continuava rolando atrás da folha, dando a
 * impressão de que a tela tinha travado.
 *
 * Restaura o overflow anterior em vez de assumir "auto", para não estragar um
 * estilo que a página já tivesse definido.
 */
export function useFecharComEsc(aberto: boolean, aoFechar: () => void) {
  useEffect(() => {
    if (!aberto) return;

    const naTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", naTecla);

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", naTecla);
      document.body.style.overflow = anterior;
    };
  }, [aberto, aoFechar]);
}

import type { Metadata } from "next";

/* Metadados de reserva para as páginas de combo. Cada combo define os seus em
 * generateMetadata; isto só cobre o caso de algum não definir.
 *
 * Sem `canonical` aqui de propósito: /combos redireciona para /viagens, e
 * declarar uma canônica para uma URL que redireciona confunde o buscador. */
export const metadata: Metadata = {
  title: "Combos de Viagem",
  description:
    "Combos da AJS Turismo: leve duas ou três viagens juntas e pague menos. Você escolhe as datas de cada uma e paga uma vez só.",
};

export default function ComboLayout({ children }: { children: React.ReactNode }) {
  return children;
}

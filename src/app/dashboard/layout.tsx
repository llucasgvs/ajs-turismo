import type { Metadata } from "next";

/* Área do cliente: particular, fora do Google.
 * Sem isto a página herdava o endereço da página inicial (canonical "/") e
 * aparecia para o Google como uma cópia dela. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

/* Página de conta: não serve como resultado de busca.
 * Sem isto a página herdava o endereço da página inicial (canonical "/") e
 * aparecia para o Google como uma cópia dela. */
export const metadata: Metadata = {
  title: { absolute: "Criar conta - AJS Turismo" },
  robots: { index: false, follow: true },
  alternates: { canonical: "/cadastro" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

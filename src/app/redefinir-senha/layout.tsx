import type { Metadata } from "next";

/* Página de conta: não serve como resultado de busca.
 * Sem isto a página herdava o endereço da página inicial (canonical "/") e
 * aparecia para o Google como uma cópia dela. */
export const metadata: Metadata = {
  title: { absolute: "Nova senha - AJS Turismo" },
  robots: { index: false, follow: true },
  alternates: { canonical: "/redefinir-senha" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

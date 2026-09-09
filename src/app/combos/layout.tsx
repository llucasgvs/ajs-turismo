import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

export const metadata: Metadata = {
  title: "Combos de Viagem",
  description:
    "Combos da AJS Turismo: leve duas ou três viagens juntas e pague menos. Você escolhe as datas de cada uma, paga uma vez só e viaja o ano inteiro.",
  keywords: [
    "combo de viagens",
    "pacote com varias viagens",
    "excursoes com desconto Curitiba",
    "AJS Turismo combos",
  ],
  alternates: { canonical: `${SITE}/combos` },
  openGraph: {
    title: "Combos de Viagem - AJS Turismo",
    description: "Duas ou três viagens juntas, com desconto. Você escolhe as datas de cada uma.",
    url: `${SITE}/combos`,
    type: "website",
  },
};

export default function ComboLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ajsturismo.com.br";

export const metadata: Metadata = {
  title: "Todas as Viagens",
  description:
    "Explore todos os pacotes de viagem da AJS Turismo saindo de Curitiba. Maceió, Gramado, Nordeste, Rio de Janeiro e muito mais. Preços acessíveis com parcelamento em até 12x sem juros.",
  keywords: [
    "pacotes de viagem Curitiba",
    "excursões saindo de Curitiba",
    "viagens baratas PR",
    "pacotes turísticos nacionais",
    "AJS Turismo viagens",
  ],
  alternates: {
    canonical: `${SITE}/viagens`,
  },
  openGraph: {
    title: "Todas as Viagens — AJS Turismo",
    description:
      "Pacotes de viagem nacionais saindo de Curitiba. Os melhores destinos com preço justo e parcelamento facilitado.",
    url: `${SITE}/viagens`,
    siteName: "AJS Turismo",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Viagens AJS Turismo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Todas as Viagens — AJS Turismo",
    description: "Pacotes nacionais saindo de Curitiba com os melhores preços.",
    images: ["/og-image.jpg"],
  },
};

export default function ViagensLayout({ children }: { children: React.ReactNode }) {
  return children;
}

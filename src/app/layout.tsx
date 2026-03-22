import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AJS Turismo — Viagens Inesquecíveis com Preço Justo",
  description:
    "Descubra os melhores pacotes de viagem nacionais com a AJS Turismo. Destinos incríveis, preços acessíveis e atendimento personalizado. Reserve agora!",
  keywords:
    "viagens, pacotes de viagem, turismo, agência de viagens, AJS Turismo, passeios, excursões",
  openGraph: {
    title: "AJS Turismo — Viagens Inesquecíveis",
    description: "Os melhores pacotes de viagem nacionais com preço justo e atendimento personalizado.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3464",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

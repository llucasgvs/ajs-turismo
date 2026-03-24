import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "@/components/LoadingProvider";

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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ajsturismo.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),

  title: {
    default: "AJS Turismo — Pacotes de Viagem Saindo de Curitiba",
    template: "%s — AJS Turismo",
  },
  description:
    "Agência de viagens em Curitiba com mais de 10 anos de experiência. Pacotes completos para Maceió, Gramado, Nordeste e muito mais. Reserve com segurança e parcele em até 12x sem juros!",
  keywords: [
    "agência de viagens Curitiba",
    "pacotes de viagem Curitiba",
    "excursões saindo de Curitiba",
    "AJS Turismo",
    "viagens baratas Curitiba",
    "pacotes Maceió",
    "excursão Gramado",
    "pacotes Nordeste",
    "viagem parcelada",
    "agência turismo Curitiba",
    "pacotes de viagem nacionais",
    "turismo Curitiba PR",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "AJS Turismo — Pacotes de Viagem Saindo de Curitiba",
    description:
      "Agência de viagens em Curitiba com mais de 10 anos de experiência. Pacotes completos, preços acessíveis e parcelamento em até 12x sem juros.",
    url: SITE,
    siteName: "AJS Turismo",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image-1.jpg",
        width: 1200,
        height: 630,
        alt: "AJS Turismo — Pacotes de Viagem Saindo de Curitiba",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AJS Turismo — Pacotes de Viagem Saindo de Curitiba",
    description:
      "Pacotes completos para os melhores destinos nacionais e internacionais. Saindo de Curitiba com preço justo e atendimento personalizado.",
    images: ["/og-image-1.jpg"],
  },

  icons: {
    icon: [
      { url: "/icon_ajs.png", type: "image/png" },
    ],
    apple: "/icon_ajs.png",
    shortcut: "/icon_ajs.png",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3464",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: "AJS Turismo",
  description:
    "Agência de viagens em Curitiba com mais de 10 anos de experiência. Pacotes nacionais e internacionais com atendimento personalizado e parcelamento facilitado.",
  url: SITE,
  logo: `${SITE}/logo_horizontal.png`,
  image: `${SITE}/og-image-1.jpg`,
  telephone: "+55-41-99834-8766",
  email: "ajsturismooficial@gmail.com",
  priceRange: "$$",
  currenciesAccepted: "BRL",
  paymentAccepted: "Cash, Credit Card, PIX",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Pedro Spisla Filho, 215",
    addressLocality: "Curitiba",
    addressRegion: "PR",
    postalCode: "82640-050",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -25.3963,
    longitude: -49.2751,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "20:00",
    },
  ],
  sameAs: [
    "https://instagram.com/ajsturismooficial",
    "https://www.facebook.com/ajsturismo",
    "https://www.youtube.com/@ajsturismo",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "500",
    bestRating: "5",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <LoadingProvider>{children}</LoadingProvider>
      </body>
    </html>
  );
}

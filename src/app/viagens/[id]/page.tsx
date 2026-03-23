import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TripDetailClient from "@/components/TripDetailClient";
import type { Trip } from "@/types/trip";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ajsturismo.com.br";

async function getTrip(id: string): Promise<Trip | null> {
  try {
    const r = await fetch(`${API}/trips/${id}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return { title: "Viagem não encontrada" };

  const description =
    trip.short_description ||
    `Pacote para ${trip.destination}. A partir de R$ ${trip.price_per_person.toLocaleString("pt-BR")} por pessoa. ${trip.duration_nights + 1} dias / ${trip.duration_nights} noites saindo de Curitiba.`;

  const ogImage = trip.image_url
    ? [{ url: trip.image_url, width: 1200, height: 630, alt: trip.title }]
    : [{ url: "/og-image.jpg", width: 1200, height: 630, alt: trip.title }];

  const pageUrl = `${SITE}/viagens/${id}`;

  return {
    title: trip.title,
    description,
    keywords: [
      trip.destination,
      `pacote ${trip.destination}`,
      `excursão ${trip.destination}`,
      "viagem saindo de Curitiba",
      "AJS Turismo",
      trip.category || "viagem",
    ],
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${trip.title} — AJS Turismo`,
      description,
      url: pageUrl,
      siteName: "AJS Turismo",
      type: "website",
      locale: "pt_BR",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: `${trip.title} — AJS Turismo`,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();
  return <TripDetailClient trip={trip} />;
}

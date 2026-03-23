import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TripDetailClient from "@/components/TripDetailClient";
import type { Trip } from "@/types/trip";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  if (!trip) return { title: "Viagem não encontrada — AJS Turismo" };

  const description =
    trip.short_description ||
    `Pacote para ${trip.destination}. A partir de R$ ${trip.price_per_person.toLocaleString("pt-BR")} por pessoa. ${trip.duration_nights + 1} dias / ${trip.duration_nights} noites saindo de Curitiba.`;

  return {
    title: `${trip.title} — AJS Turismo`,
    description,
    keywords: `${trip.destination}, viagem, pacote, excursão, AJS Turismo, ${trip.category}`,
    openGraph: {
      title: `${trip.title} — AJS Turismo`,
      description,
      images: trip.image_url ? [{ url: trip.image_url }] : [],
      type: "website",
      locale: "pt_BR",
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

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import TripDetailClient from "@/components/TripDetailClient";
import type { Trip } from "@/types/trip";
import { fmtBRL } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ajsturismo.com.br";

type BySlug = {
  template_id: number;
  slug: string | null;
  has_dates: boolean;
  trip: Trip | null;
  roteiro: {
    id: number; slug: string | null; title: string; destination: string; description: string;
    short_description: string | null; image_url: string | null; gallery: string[];
    duration_nights: number; includes: string[]; excludes: string[]; optionals: unknown[];
    itinerary: unknown[]; departure_locations: string[]; required_documents: string | null;
    category: string; tag: string | null; whatsapp_only?: boolean; quote_only?: boolean;
    parent_id?: number | null; is_open_date?: boolean;
  };
};

const ehIdAntigo = (v: string) => /^\d+$/.test(v);

async function getBySlug(slug: string): Promise<BySlug | null> {
  try {
    const r = await fetch(`${API}/templates/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

/** URL antiga /viagens/{id}: descobre o slug do roteiro daquela data. */
async function slugDoIdAntigo(id: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/trips/${id}`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const trip: Trip = await r.json();
    return trip.slug ?? null;
  } catch {
    return null;
  }
}

// Pré-renderiza uma página por ROTEIRO (antes era uma por data, o que gerava
// dezenas de URLs com o mesmo conteúdo).
export async function generateStaticParams() {
  try {
    const r = await fetch(`${API}/templates/public`, { next: { revalidate: 300 } });
    if (!r.ok) return [];
    const templates: Array<{ slug: string | null }> = await r.json();
    return templates.filter((t) => t.slug).map((t) => ({ slug: t.slug as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (ehIdAntigo(slug)) return { title: "Redirecionando..." };

  const data = await getBySlug(slug);
  if (!data) return { title: "Viagem não encontrada" };

  const { roteiro, trip } = data;
  const description =
    roteiro.short_description ||
    (roteiro.quote_only
      ? `Pacote para ${roteiro.destination} sob consulta. Solicite sua cotação com a AJS Turismo, saindo de Curitiba.`
      : trip
        ? `Pacote para ${roteiro.destination}. A partir de R$ ${fmtBRL(trip.price_per_person)} por pessoa. ${roteiro.duration_nights + 1} dias / ${roteiro.duration_nights} noites saindo de Curitiba.`
        : `Pacote para ${roteiro.destination} saindo de Curitiba. Consulte as próximas saídas com a AJS Turismo.`);

  const ogImage = roteiro.image_url
    ? [{ url: roteiro.image_url, width: 1200, height: 630, alt: roteiro.title }]
    : [{ url: "/og-image.jpg", width: 1200, height: 630, alt: roteiro.title }];

  const pageUrl = `${SITE}/viagens/${slug}`;

  return {
    title: roteiro.title,
    description,
    keywords: [
      roteiro.destination,
      `pacote ${roteiro.destination}`,
      `excursão ${roteiro.destination}`,
      "viagem saindo de Curitiba",
      "AJS Turismo",
      roteiro.category || "viagem",
    ],
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${roteiro.title} - AJS Turismo`,
      description,
      url: pageUrl,
      siteName: "AJS Turismo",
      type: "website",
      locale: "pt_BR",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: `${roteiro.title} - AJS Turismo`,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Link antigo (/viagens/395): redireciona 301 para a URL com nome. Mantém vivo
  // tudo que já foi compartilhado no WhatsApp ou indexado no Google.
  if (ehIdAntigo(slug)) {
    const destino = await slugDoIdAntigo(slug);
    if (!destino) notFound();
    permanentRedirect(`/viagens/${destino}`);
  }

  const data = await getBySlug(slug);
  if (!data) notFound();

  // Sem data aberta: mesma página do roteiro (fotos, inclui, itinerário...), só
  // que o bloco de compra vira "consultar datas no WhatsApp". Os campos de
  // data/preço abaixo são neutros e nunca chegam à tela (gateados por semDatas).
  if (!data.has_dates || !data.trip) {
    const r = data.roteiro;
    const agora = new Date().toISOString();
    const semData = {
      ...r,
      template_id: r.id,
      gallery: r.gallery ?? [],
      includes: r.includes ?? [],
      excludes: r.excludes ?? [],
      optionals: r.optionals ?? [],
      itinerary: r.itinerary ?? [],
      departure_locations: r.departure_locations ?? [],
      min_group_size: 1,
      departure_date: agora,
      return_date: agora,
      price_per_person: 0,
      original_price: null,
      max_installments: 1,
      price_tiers: [],
      total_spots: 0,
      available_spots: 0,
      status: "active",
      is_active: true,
      is_featured: false,
      created_at: agora,
      updated_at: null,
      hidden_at: null,
    } as unknown as Trip;

    return (
      <Suspense>
        <TripDetailClient trip={semData} semDatas />
      </Suspense>
    );
  }

  return (
    <Suspense>
      <TripDetailClient trip={data.trip} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import TripDetailClient from "@/components/TripDetailClient";
import type { Trip } from "@/types/trip";
import { fmtBRL } from "@/lib/format";
import { imgOg } from "@/lib/imagem";
import { tituloNoGoogle, descricaoNoGoogle } from "@/lib/seoViagem";
import { escolherRelacionadas, escolherOpcoes, URL_VIAGENS, URL_ROTEIROS, type OpcaoDestino } from "@/lib/relacionadas";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

type BySlug = {
  template_id: number;
  slug: string | null;
  has_dates: boolean;
  trip: Trip | null;
  roteiro: {
    id: number; slug: string | null; title: string; destination: string; description: string;
    short_description: string | null; seo_titulo?: string | null; seo_descricao?: string | null; image_url: string | null; gallery: string[];
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

/** Lista usada nos cartões do fim da página. Guardada por 5 minutos: o servidor
 *  busca uma vez e serve a todas as páginas. Falhou, devolve null e a página
 *  monta os cartões no navegador, como antes. */
async function buscarLista<T>(caminho: string): Promise<T[] | null> {
  try {
    const r = await fetch(`${API}${caminho}`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d : null;
  } catch {
    return null;
  }
}

/** As datas do roteiro, só com o que muda de uma data para outra (o resto é
 *  igual ao da viagem). Vêm prontas no HTML para o seletor de datas já
 *  aparecer no lugar: antes ele surgia ~1,5 s depois e empurrava a página
 *  inteira para baixo no celular. O navegador busca de novo logo em seguida,
 *  sem cache, para as vagas ficarem em tempo real. */
const CAMPOS_DA_DATA = [
  "id", "departure_date", "return_date", "duration_nights", "price_per_person", "original_price",
  "max_installments", "price_tiers", "total_spots", "available_spots", "min_group_size", "optionals",
  "status", "is_active", "is_featured", "created_at",
] as const;
type DataDoRoteiro = Pick<Trip, (typeof CAMPOS_DA_DATA)[number]>;

async function buscarDatas(templateId: number): Promise<DataDoRoteiro[] | undefined> {
  try {
    const r = await fetch(`${API}/trips/?template_id=${templateId}&limit=500&future_only=true`, { next: { revalidate: 60 } });
    if (!r.ok) return undefined;
    const lista = await r.json();
    if (!Array.isArray(lista)) return undefined;
    return lista.map((t: Trip) => Object.fromEntries(CAMPOS_DA_DATA.map((c) => [c, t[c]])) as DataDoRoteiro);
  } catch {
    return undefined; // sem as datas prontas, a página busca no navegador, como antes
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
  const descricaoAntiga =
    roteiro.short_description ||
    (roteiro.quote_only
      ? `Pacote para ${roteiro.destination} sob consulta. Solicite sua cotação com a AJS Turismo, saindo de Curitiba.`
      : trip
        ? `Pacote para ${roteiro.destination}. A partir de R$ ${fmtBRL(trip.price_per_person)} por pessoa. ${roteiro.duration_nights + 1} dias / ${roteiro.duration_nights} noites saindo de Curitiba.`
        : `Pacote para ${roteiro.destination} saindo de Curitiba. Consulte as próximas saídas com a AJS Turismo.`);

  // Texto do Google montado do cadastro (ver lib/seoViagem). Qualquer falha
  // volta para o texto de antes: a página nunca fica sem título.
  let titulo = roteiro.title;
  let description = descricaoAntiga;
  try {
    titulo = tituloNoGoogle(roteiro) || roteiro.title;
    description = descricaoNoGoogle(roteiro, trip) || descricaoAntiga;
  } catch {
    titulo = roteiro.title;
    description = descricaoAntiga;
  }

  const capaOg = imgOg(roteiro.image_url, SITE);
  const ogImage = capaOg
    ? [{ url: capaOg, width: 1200, height: 630, alt: roteiro.title }]
    : [{ url: "/og-image.jpg", width: 1200, height: 630, alt: roteiro.title }];

  const pageUrl = `${SITE}/viagens/${slug}`;

  return {
    // Completo e explícito: o layout de /viagens define o título como texto
    // simples, o que desliga o " - AJS Turismo" do layout raiz aqui embaixo.
    title: { absolute: `${titulo} - AJS Turismo` },
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
      title: `${titulo} - AJS Turismo`,
      description,
      url: pageUrl,
      siteName: "AJS Turismo",
      type: "website",
      locale: "pt_BR",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: `${titulo} - AJS Turismo`,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

/** Caminho de navegação (Início › Viagens › roteiro) para o Google, que pode
 *  mostrá-lo no resultado no lugar do endereço. Não aparece na tela. */
function Trilha({ titulo, slug }: { titulo: string; slug: string }) {
  const dados = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE },
      { "@type": "ListItem", position: 2, name: "Viagens", item: `${SITE}/viagens` },
      { "@type": "ListItem", position: 3, name: titulo, item: `${SITE}/viagens/${slug}` },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }} />;
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

  // Em paralelo: os cartões do fim da página não atrasam a viagem.
  const [data, viagens, roteiros] = await Promise.all([
    getBySlug(slug),
    buscarLista<Trip>(URL_VIAGENS),
    buscarLista<OpcaoDestino>(URL_ROTEIROS),
  ]);
  if (!data) notFound();
  const datas = data.has_dates && data.trip ? await buscarDatas(data.template_id) : undefined;
  const cartoes = (t: Trip) => ({
    relacionadas: viagens ? escolherRelacionadas(viagens, t.id, t.template_id, t.category) : undefined,
    opcoes: roteiros ? escolherOpcoes(roteiros, t.template_id, t.parent_id) : undefined,
  });

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
        <Trilha titulo={r.title} slug={slug} />
        <TripDetailClient trip={semData} semDatas {...cartoes(semData)} />
      </Suspense>
    );
  }

  return (
    <Suspense>
      <Trilha titulo={data.roteiro.title} slug={slug} />
      <TripDetailClient trip={data.trip} datasIniciais={datas} {...cartoes(data.trip)} />
    </Suspense>
  );
}

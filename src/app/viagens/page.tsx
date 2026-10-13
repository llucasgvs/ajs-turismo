import type { Metadata } from "next";
import ViagensClient from "./ViagensClient";
import { tipoValido, tipoIndexavel, cabecalho, type TipoId } from "@/lib/tiposDeViagem";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

async function getPublicTemplates() {
  try {
    const res = await fetch(`${API}/templates/public`, {
      next: { revalidate: 60 }, // ISR: regenera a cada 60s no servidor
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getCombos() {
  try {
    const res = await fetch(`${API}/combos/public`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

type Props = { searchParams: Promise<{ tipo?: string }> };

/** Atalho de tipo com página própria no Google (/viagens?tipo=reveillon):
 *  título, descrição e endereço oficial dele. Sem atalho, ou num atalho que
 *  não vale como página (combos), fica o da página de viagens. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const tipo = tipoValido((await searchParams).tipo);
  if (!tipo || !tipoIndexavel(tipo)) return {};
  const templates = await getPublicTemplates();
  const c = cabecalho(tipo, templates);
  const titulo = `${c.titulo} ${c.destaque} - AJS Turismo`;
  const url = `${SITE}/viagens?tipo=${tipo}`;
  return {
    title: { absolute: titulo },
    description: c.descricaoGoogle,
    alternates: { canonical: url },
    openGraph: { title: titulo, description: c.descricaoGoogle, url, siteName: "AJS Turismo", type: "website", locale: "pt_BR", images: [{ url: "/og-image.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: titulo, description: c.descricaoGoogle, images: ["/og-image.jpg"] },
  };
}

export default async function ViagensPage({ searchParams }: Props) {
  const tipo: TipoId | null = tipoValido((await searchParams).tipo);
  // Em paralelo: são duas listas independentes, e esperar uma para pedir a
  // outra dobraria o tempo até a primeira pintura.
  const [templates, combos] = await Promise.all([getPublicTemplates(), getCombos()]);
  return <ViagensClient initialTemplates={templates} combos={combos} tipoInicial={tipo} />;
}

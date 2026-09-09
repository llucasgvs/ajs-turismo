import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ComboDetalheClient from "./ComboDetalheClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

async function getCombo(slug: string) {
  try {
    // Revalidação curta: as datas somem quando esgotam ou entram no prazo de
    // encerramento, e uma página velha ofereceria o que o checkout recusa.
    const res = await fetch(`${API}/combos/by-slug/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const combo = await getCombo(slug);
  if (!combo) return { title: "Combo não encontrado" };
  const roteiros = combo.roteiros.map((r: { title: string }) => r.title).join(", ");
  return {
    title: combo.nome,
    description:
      combo.descricao ||
      `${combo.nome}: ${roteiros}. ${combo.desconto_pct}% de desconto comprando junto, e você escolhe a data de cada viagem.`,
    alternates: { canonical: `${SITE}/combos/${slug}` },
    openGraph: {
      title: `${combo.nome} - AJS Turismo`,
      description: `${combo.roteiros.length} viagens com ${combo.desconto_pct}% de desconto.`,
      url: `${SITE}/combos/${slug}`,
      type: "website",
    },
  };
}

export default async function ComboPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const combo = await getCombo(slug);
  if (!combo) notFound();
  return <ComboDetalheClient combo={combo} />;
}

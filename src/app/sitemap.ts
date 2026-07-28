import type { MetadataRoute } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/viagens`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/cadastro`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    // Uma URL por ROTEIRO (antes era uma por data, o que gerava dezenas de
    // páginas com o mesmo conteúdo disputando entre si no Google).
    const res = await fetch(`${API}/templates/slugs`, { next: { revalidate: 3600 } });
    if (!res.ok) return staticRoutes;

    const roteiros: Array<{ slug: string; updated_at?: string }> = await res.json();
    if (!Array.isArray(roteiros)) return staticRoutes;

    const roteiroRoutes: MetadataRoute.Sitemap = roteiros
      .filter((r) => r.slug)
      .map((r) => ({
        url: `${SITE}/viagens/${r.slug}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    return [...staticRoutes, ...roteiroRoutes];
  } catch {
    return staticRoutes;
  }
}

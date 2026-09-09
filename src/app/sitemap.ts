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

    // Os combos que estão no ar. Vêm da mesma lista que a vitrine usa, então o
    // sitemap nunca anuncia um combo que já saiu de venda.
    let comboRoutes: MetadataRoute.Sitemap = [];
    try {
      const rc = await fetch(`${API}/combos/public`, { next: { revalidate: 3600 } });
      if (rc.ok) {
        const combos: Array<{ slug: string | null }> = await rc.json();
        if (Array.isArray(combos)) {
          comboRoutes = combos
            .filter((c) => c.slug)
            .map((c) => ({
              url: `${SITE}/combos/${c.slug}`,
              lastModified: new Date(),
              changeFrequency: "weekly" as const,
              priority: 0.8,
            }));
        }
      }
    } catch {
      // Combo fora do sitemap não quebra o resto.
    }

    return [...staticRoutes, ...roteiroRoutes, ...comboRoutes];
  } catch {
    return staticRoutes;
  }
}

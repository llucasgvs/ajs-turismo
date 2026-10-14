import type { MetadataRoute } from "next";
import { tiposDisponiveis, tipoIndexavel } from "@/lib/tiposDeViagem";
import { DICAS } from "@/conteudo/dicas";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/viagens`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/cadastro`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    // Guias de dicas: conteúdo fixo, a data vem do próprio guia.
    { url: `${SITE}/dicas`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    ...DICAS.map((d) => ({
      url: `${SITE}/dicas/${d.slug}`,
      lastModified: new Date(d.atualizadoEm),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
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

    // Atalhos de tipo com viagem à venda (/viagens?tipo=reveillon...). Os que
    // não valem como página (combos) e os vazios ficam de fora.
    let atalhoRoutes: MetadataRoute.Sitemap = [];
    try {
      const rt = await fetch(`${API}/templates/public`, { next: { revalidate: 3600 } });
      if (rt.ok) {
        const lista = await rt.json();
        if (Array.isArray(lista)) {
          atalhoRoutes = tiposDisponiveis(lista, 0)
            .filter((t) => tipoIndexavel(t.id))
            .map((t) => ({
              url: `${SITE}/viagens?tipo=${t.id}`,
              lastModified: new Date(),
              changeFrequency: "daily" as const,
              priority: 0.85,
            }));
        }
      }
    } catch {
      // Atalho fora do sitemap não quebra o resto.
    }

    return [...staticRoutes, ...atalhoRoutes, ...roteiroRoutes, ...comboRoutes];
  } catch {
    return staticRoutes;
  }
}

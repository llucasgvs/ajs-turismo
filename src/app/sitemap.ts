import type { MetadataRoute } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ajsturismo.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/viagens`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/cadastro`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const res = await fetch(`${API}/trips/?limit=200`, { next: { revalidate: 3600 } });
    if (!res.ok) return staticRoutes;

    const trips: Array<{ id: number; updated_at?: string }> = await res.json();

    const tripRoutes: MetadataRoute.Sitemap = Array.isArray(trips)
      ? trips.map((trip) => ({
          url: `${SITE}/viagens/${trip.id}`,
          lastModified: trip.updated_at ? new Date(trip.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
      : [];

    return [...staticRoutes, ...tripRoutes];
  } catch {
    return staticRoutes;
  }
}

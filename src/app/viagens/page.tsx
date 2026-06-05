import ViagensClient from "./ViagensClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export default async function ViagensPage() {
  const templates = await getPublicTemplates();
  return <ViagensClient initialTemplates={templates} />;
}

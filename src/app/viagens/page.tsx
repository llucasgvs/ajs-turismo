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

async function getCombos() {
  try {
    const res = await fetch(`${API}/combos/public`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ViagensPage() {
  // Em paralelo: são duas listas independentes, e esperar uma para pedir a
  // outra dobraria o tempo até a primeira pintura.
  const [templates, combos] = await Promise.all([getPublicTemplates(), getCombos()]);
  return <ViagensClient initialTemplates={templates} combos={combos} />;
}
